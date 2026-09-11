/**
 * game.js - Core Logic & State Management for Color Match Connect (Flow Free Puzzle)
 */

import { generateFlowLevel, getLevelConfig, getCustomGridConfig, getPaletteColor } from './generator.js';

export class FlowGame {
  constructor(options = {}) {
    this.options = options;
    this.width = 5;
    this.height = 5;
    this.numColors = 4;
    this.levelConfig = null;
    this.levelData = null;

    // Board structures
    this.initialGrid = []; // [r][c] = colorId if endpoint, else 0
    this.endpoints = new Map(); // colorId -> [ {r, c}, {r, c} ]
    this.playerPaths = new Map(); // colorId -> [ {r, c}, ... ]
    this.solutionPaths = new Map(); // colorId -> [ {r, c}, ... ]
    this.connectedColors = new Set(); // set of colorIds fully connected

    // Gameplay statistics
    this.moves = 0;
    this.startTime = 0;
    this.elapsedSeconds = 0;
    this.timerInterval = null;
    this.isCompleted = false;
    this.undoStack = [];

    // Active drag session
    this.activeDrag = null; // { colorId, path: [{r, c}] }

    // Event callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onColorConnected = options.onColorConnected || (() => {});
    this.onColorDisconnected = options.onColorDisconnected || (() => {});
    this.onCellStep = options.onCellStep || (() => {});
    this.onPipeBroken = options.onPipeBroken || (() => {});
    this.onLevelComplete = options.onLevelComplete || (() => {});
  }

  /**
   * Load and initialize a new level
   */
  loadLevel(config) {
    this.stopTimer();
    this.levelConfig = config;
    this.levelData = generateFlowLevel(config);

    this.width = this.levelData.width;
    this.height = this.levelData.height;
    this.numColors = this.levelData.numColors;
    this.initialGrid = this.levelData.initialGrid;

    this.endpoints.clear();
    this.playerPaths.clear();
    this.solutionPaths.clear();
    this.connectedColors.clear();
    this.undoStack = [];

    this.levelData.pipes.forEach(pipe => {
      this.endpoints.set(pipe.colorId, [pipe.start, pipe.end]);
      this.solutionPaths.set(pipe.colorId, pipe.solutionPath);
      this.playerPaths.set(pipe.colorId, []);
    });

    this.moves = 0;
    this.elapsedSeconds = 0;
    this.isCompleted = false;
    this.activeDrag = null;

    this.startTimer();
    this.notifyState();
  }

  startTimer() {
    this.stopTimer();
    this.startTime = Date.now() - (this.elapsedSeconds * 1000);
    this.timerInterval = setInterval(() => {
      if (!this.isCompleted) {
        this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        this.onStateChange(this.getSummary());
      }
    }, 500);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Snapshot current paths for undo
   */
  pushUndo() {
    const snapshot = {};
    for (const [colorId, path] of this.playerPaths.entries()) {
      snapshot[colorId] = path.map(pt => ({ r: pt.r, c: pt.c }));
    }
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 50) this.undoStack.shift();
  }

  undo() {
    if (this.isCompleted || this.undoStack.length === 0) return false;
    const previous = this.undoStack.pop();
    this.playerPaths.clear();
    for (const colorIdStr in previous) {
      const colorId = Number(colorIdStr);
      this.playerPaths.set(colorId, previous[colorId]);
    }
    this.updateConnections();
    this.notifyState();
    return true;
  }

  restart() {
    if (this.isCompleted) return;
    this.pushUndo();
    this.playerPaths.forEach((_, colorId) => {
      this.playerPaths.set(colorId, []);
    });
    this.connectedColors.clear();
    this.moves = 0;
    this.elapsedSeconds = 0;
    this.startTime = Date.now();
    this.notifyState();
  }

  /**
   * Check if a cell is an endpoint of any color
   */
  getEndpointColor(r, c) {
    if (r < 0 || r >= this.height || c < 0 || c >= this.width) return 0;
    return this.initialGrid[r][c];
  }

  /**
   * Check which color path currently occupies a cell
   */
  getPathOccupant(r, c) {
    for (const [colorId, path] of this.playerPaths.entries()) {
      for (let i = 0; i < path.length; i++) {
        if (path[i].r === r && path[i].c === c) {
          return { colorId, index: i, total: path.length };
        }
      }
    }
    return null;
  }

  /**
   * Begins user drawing drag gesture at (r, c)
   */
  startDraw(r, c) {
    if (this.isCompleted) return null;
    if (r < 0 || r >= this.height || c < 0 || c >= this.width) return null;

    const endpointColor = this.getEndpointColor(r, c);
    const occupant = this.getPathOccupant(r, c);

    let targetColor = 0;
    let initialPath = [];

    if (endpointColor > 0) {
      targetColor = endpointColor;
      // If we touch an endpoint, start drawing from this endpoint.
      // If a path already exists for this color:
      const existing = this.playerPaths.get(targetColor) || [];
      if (existing.length > 0) {
        const isHead = (existing[0].r === r && existing[0].c === c);
        const isTail = (existing[existing.length - 1].r === r && existing[existing.length - 1].c === c);
        if (isHead) {
          // Restart drawing from head
          this.pushUndo();
          initialPath = [{ r, c }];
        } else if (isTail) {
          // Continue or redraw from tail
          this.pushUndo();
          initialPath = existing.slice();
        } else {
          this.pushUndo();
          initialPath = [{ r, c }];
        }
      } else {
        this.pushUndo();
        initialPath = [{ r, c }];
      }
    } else if (occupant) {
      // Touching an existing pipe: pick up drag from this cell and cut everything after it
      this.pushUndo();
      targetColor = occupant.colorId;
      const existing = this.playerPaths.get(targetColor);
      initialPath = existing.slice(0, occupant.index + 1);
    } else {
      // Touching an empty non-endpoint cell does not start a new pipe
      return null;
    }

    this.activeDrag = {
      colorId: targetColor,
      path: initialPath,
      completedInThisDrag: false
    };

    const wasConnected = this.connectedColors.has(targetColor);
    this.playerPaths.set(targetColor, initialPath);
    this.updateConnections();

    if (wasConnected && !this.connectedColors.has(targetColor)) {
      this.onColorDisconnected(targetColor);
    }

    this.onCellStep(targetColor, r, c);
    this.notifyState();
    return this.activeDrag;
  }

  /**
   * Continues dragging into adjacent cell (r, c)
   */
  continueDraw(r, c) {
    if (!this.activeDrag || this.isCompleted || this.activeDrag.completedInThisDrag) {
      return false;
    }
    if (r < 0 || r >= this.height || c < 0 || c >= this.width) {
      return false;
    }

    const { colorId, path } = this.activeDrag;
    const lastCell = path[path.length - 1];

    // Same cell, ignore
    if (lastCell.r === r && lastCell.c === c) {
      return false;
    }

    // Must be orthogonally adjacent (no diagonals)
    const dr = Math.abs(lastCell.r - r);
    const dc = Math.abs(lastCell.c - c);
    if (dr + dc !== 1) {
      return false;
    }

    // Check if player is backing up to the previous cell (retract)
    if (path.length >= 2) {
      const prevCell = path[path.length - 2];
      if (prevCell.r === r && prevCell.c === c) {
        path.pop();
        this.playerPaths.set(colorId, path);
        this.updateConnections();
        this.onCellStep(colorId, r, c);
        this.notifyState();
        return true;
      }
    }

    // Check if cell is already in the current path (looping onto itself)
    const existingIndex = path.findIndex(pt => pt.r === r && pt.c === c);
    if (existingIndex !== -1) {
      // Retract/truncate current path to this cell
      path.splice(existingIndex + 1);
      this.playerPaths.set(colorId, path);
      this.updateConnections();
      this.onCellStep(colorId, r, c);
      this.notifyState();
      return true;
    }

    // Check if cell is an endpoint of a DIFFERENT color -> Cannot enter!
    const endpointColor = this.getEndpointColor(r, c);
    if (endpointColor > 0 && endpointColor !== colorId) {
      return false;
    }

    // Check if cell is occupied by a DIFFERENT color's path -> Cut/break the other color's path!
    const occupant = this.getPathOccupant(r, c);
    if (occupant && occupant.colorId !== colorId) {
      const otherPath = this.playerPaths.get(occupant.colorId);
      if (otherPath && otherPath.length > 0) {
        const wasOtherConnected = this.connectedColors.has(occupant.colorId);
        // Truncate other path before the collision point
        const truncated = otherPath.slice(0, occupant.index);
        this.playerPaths.set(occupant.colorId, truncated);
        this.updateConnections();
        this.onPipeBroken(occupant.colorId);
        if (wasOtherConnected && !this.connectedColors.has(occupant.colorId)) {
          this.onColorDisconnected(occupant.colorId);
        }
      }
    }

    // Append new cell
    path.push({ r, c });
    this.playerPaths.set(colorId, path);
    this.onCellStep(colorId, r, c);

    // Check if this new cell is the other endpoint of the SAME color -> Connected!
    if (endpointColor === colorId) {
      const endpoints = this.endpoints.get(colorId);
      const isStartEndpoint = (endpoints[0].r === path[0].r && endpoints[0].c === path[0].c);
      const isEndEndpoint = (endpoints[1].r === path[0].r && endpoints[1].c === path[0].c);

      const hitOther = (isStartEndpoint && endpoints[1].r === r && endpoints[1].c === c) ||
                       (isEndEndpoint && endpoints[0].r === r && endpoints[0].c === c);

      if (hitOther && path.length >= 2) {
        this.activeDrag.completedInThisDrag = true;
        this.updateConnections();
        this.onColorConnected(colorId);
        this.checkWinCondition();
        this.notifyState();
        return true;
      }
    }

    this.updateConnections();
    this.notifyState();
    return true;
  }

  /**
   * Concludes the user's drag gesture
   */
  endDraw() {
    if (!this.activeDrag) return;
    this.moves++;
    this.activeDrag = null;
    this.updateConnections();
    this.checkWinCondition();
    this.notifyState();
  }

  /**
   * Verifies which colors are currently properly connected
   */
  updateConnections() {
    this.connectedColors.clear();
    for (const [colorId, path] of this.playerPaths.entries()) {
      if (path.length >= 2) {
        const endpoints = this.endpoints.get(colorId);
        if (!endpoints) continue;
        const [epA, epB] = endpoints;
        const head = path[0];
        const tail = path[path.length - 1];

        const matchForward = (head.r === epA.r && head.c === epA.c && tail.r === epB.r && tail.c === epB.c);
        const matchBackward = (head.r === epB.r && head.c === epB.c && tail.r === epA.r && tail.c === epA.c);

        if (matchForward || matchBackward) {
          this.connectedColors.add(colorId);
        }
      }
    }
  }

  /**
   * Checks if victory condition is satisfied
   */
  checkWinCondition() {
    if (this.isCompleted) return true;

    // 1. All colors must be connected
    if (this.connectedColors.size !== this.numColors) {
      return false;
    }

    // 2. 100% board fill check (Standard rule)
    const filledCells = this.getFilledCellsCount();
    const totalCells = this.width * this.height;

    if (filledCells === totalCells) {
      this.isCompleted = true;
      this.stopTimer();
      const stars = this.calculateStars();
      this.onLevelComplete({
        stars,
        moves: this.moves,
        optimalMoves: this.numColors,
        time: this.elapsedSeconds,
        levelConfig: this.levelConfig
      });
      return true;
    }

    return false;
  }

  /**
   * Count total unique cells covered by all pipes
   */
  getFilledCellsCount() {
    const filled = new Set();
    for (const path of this.playerPaths.values()) {
      for (const pt of path) {
        filled.add(`${pt.r},${pt.c}`);
      }
    }
    return filled.size;
  }

  /**
   * Calculate star rating (1 to 3 stars)
   */
  calculateStars() {
    // Optimal moves is drawing each color once without mistakes
    const optimal = this.numColors;
    if (this.moves <= optimal) return 3;
    if (this.moves <= optimal + 3) return 2;
    return 1;
  }

  /**
   * Apply one hint: solve one unconnected or incorrectly drawn color
   */
  applyHint() {
    if (this.isCompleted) return null;

    // Find the first unconnected color
    let targetColor = null;
    for (let c = 1; c <= this.numColors; c++) {
      if (!this.connectedColors.has(c)) {
        targetColor = c;
        break;
      }
    }

    if (!targetColor) {
      // All are connected but board isn't full, find any path that doesn't match solution
      for (let c = 1; c <= this.numColors; c++) {
        const current = this.playerPaths.get(c) || [];
        const sol = this.solutionPaths.get(c) || [];
        if (current.length !== sol.length) {
          targetColor = c;
          break;
        }
      }
    }

    if (!targetColor) targetColor = 1;

    this.pushUndo();
    const solution = this.solutionPaths.get(targetColor);
    if (!solution) return null;

    // Remove any collision with other colors
    const solSet = new Set(solution.map(p => `${p.r},${p.c}`));
    for (const [otherColor, otherPath] of this.playerPaths.entries()) {
      if (otherColor === targetColor) continue;
      const filtered = otherPath.filter(p => !solSet.has(`${p.r},${p.c}`));
      if (filtered.length !== otherPath.length) {
        this.playerPaths.set(otherColor, filtered);
      }
    }

    // Set solution for target color
    this.playerPaths.set(targetColor, solution.map(p => ({ r: p.r, c: p.c })));
    this.moves++;
    this.updateConnections();
    this.onColorConnected(targetColor);
    this.checkWinCondition();
    this.notifyState();

    return {
      colorId: targetColor,
      colorInfo: getPaletteColor(targetColor),
      path: solution
    };
  }

  getSummary() {
    const totalCells = this.width * this.height;
    const filledCells = this.getFilledCellsCount();
    const fillPercent = Math.min(100, Math.round((filledCells / totalCells) * 100));

    return {
      width: this.width,
      height: this.height,
      numColors: this.numColors,
      connectedCount: this.connectedColors.size,
      totalCells,
      filledCells,
      fillPercent,
      moves: this.moves,
      time: this.elapsedSeconds,
      isCompleted: this.isCompleted
    };
  }

  notifyState() {
    this.onStateChange(this.getSummary());
  }
}
