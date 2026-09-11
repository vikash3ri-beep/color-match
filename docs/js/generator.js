/**
 * generator.js - Procedural Level Generator for Color Match Connect
 * Uses Mulberry32 PRNG and Backbite Hamiltonian grid traversal to partition
 * any NxN board into K non-intersecting paths covering 100% of cells.
 */

// 10 Distinct Vibrant Color Themes
export const COLOR_PALETTE = [
  { id: 1, name: 'Crimson Red', hex: '#FF2E63', glow: 'rgba(255, 46, 99, 0.4)', note: 261.63 },    // C4
  { id: 2, name: 'Neon Cyan',   hex: '#00F0FF', glow: 'rgba(0, 240, 255, 0.4)', note: 293.66 },    // D4
  { id: 3, name: 'Electric Lime',hex: '#05FFA1', glow: 'rgba(5, 255, 161, 0.4)', note: 329.63 },   // E4
  { id: 4, name: 'Solar Yellow',hex: '#FFE600', glow: 'rgba(255, 230, 0, 0.4)', note: 392.00 },   // G4
  { id: 5, name: 'Vivid Purple',hex: '#B94BFF', glow: 'rgba(185, 75, 255, 0.4)', note: 440.00 },   // A4
  { id: 6, name: 'Bright Orange',hex: '#FF7700', glow: 'rgba(255, 119, 0, 0.4)', note: 523.25 },   // C5
  { id: 7, name: 'Hot Pink',    hex: '#FF007F', glow: 'rgba(255, 0, 127, 0.4)', note: 587.33 },    // D5
  { id: 8, name: 'Cobalt Blue', hex: '#2979FF', glow: 'rgba(41, 121, 255, 0.4)', note: 659.25 },   // E5
  { id: 9, name: 'Spring Mint', hex: '#00E676', glow: 'rgba(0, 230, 118, 0.4)', note: 783.99 },   // G5
  { id: 10, name: 'Deep Violet',hex: '#7C4DFF', glow: 'rgba(124, 77, 255, 0.4)', note: 880.00 }   // A5
];

export function getPaletteColor(index) {
  return COLOR_PALETTE[(index - 1) % COLOR_PALETTE.length];
}

/**
 * Seedable PRNG using Mulberry32
 */
export function createRNG(seed) {
  let s = Math.abs(seed | 0) + 1;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a random Hamiltonian path covering all cells of a w x h grid using the Backbite algorithm.
 */
function generateHamiltonianPath(w, h, rng, iterations = 600) {
  let path = [];
  // Start with snake covering all cells
  for (let r = 0; r < h; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < w; c++) path.push({ r, c });
    } else {
      for (let c = w - 1; c >= 0; c--) path.push({ r, c });
    }
  }

  // Lookup map for cell index in path
  let pos = new Int32Array(w * h);
  for (let i = 0; i < path.length; i++) {
    pos[path[i].r * w + path[i].c] = i;
  }

  const getNeighbors = (r, c) => {
    const list = [];
    if (r > 0) list.push({ r: r - 1, c });
    if (r < h - 1) list.push({ r: r + 1, c });
    if (c > 0) list.push({ r, c: c - 1 });
    if (c < w - 1) list.push({ r, c: c + 1 });
    return list;
  };

  const total = path.length;

  for (let it = 0; it < iterations; it++) {
    let pickEnd = rng() < 0.5 ? 0 : total - 1;
    let curr = path[pickEnd];
    let nbrs = getNeighbors(curr.r, curr.c);
    let target = nbrs[Math.floor(rng() * nbrs.length)];
    let targetIdx = pos[target.r * w + target.c];

    if (pickEnd === 0) {
      if (targetIdx > 1) {
        // Reverse path[0 ... targetIdx - 1]
        let left = 0, right = targetIdx - 1;
        while (left < right) {
          let tmp = path[left];
          path[left] = path[right];
          path[right] = tmp;
          pos[path[left].r * w + path[left].c] = left;
          pos[path[right].r * w + path[right].c] = right;
          left++;
          right--;
        }
      }
    } else {
      if (targetIdx < total - 2) {
        // Reverse path[targetIdx + 1 ... total - 1]
        let left = targetIdx + 1, right = total - 1;
        while (left < right) {
          let tmp = path[left];
          path[left] = path[right];
          path[right] = tmp;
          pos[path[left].r * w + path[left].c] = left;
          pos[path[right].r * w + path[right].c] = right;
          left++;
          right--;
        }
      }
    }
  }

  return path;
}

/**
 * Procedurally partitions the board into numColors paths covering 100% of cells.
 */
export function generateFlowLevel({ width = 5, height = 5, numColors = 4, seed = 12345 } = {}) {
  const rng = createRNG(seed);
  const totalCells = width * height;
  
  // Clamp numColors within sensible bounds
  const maxColors = Math.min(COLOR_PALETTE.length, Math.floor(totalCells / 3));
  numColors = Math.max(2, Math.min(numColors, maxColors));

  const minPathLen = 3;
  let attempts = 0;
  let bestLevel = null;

  while (attempts < 60) {
    attempts++;
    const path = generateHamiltonianPath(width, height, rng, 400 + totalCells * 15);
    
    // Choose (numColors - 1) cut points
    let cuts = [];
    let cur = 0;
    let valid = true;

    for (let k = 0; k < numColors - 1; k++) {
      let remainingColors = (numColors - 1) - k;
      let minNext = cur + minPathLen;
      let maxNext = totalCells - remainingColors * minPathLen;
      if (minNext > maxNext) {
        valid = false;
        break;
      }
      let nextCut = minNext + Math.floor(rng() * (maxNext - minNext + 1));
      cuts.push(nextCut);
      cur = nextCut;
    }

    if (!valid || cuts.length !== numColors - 1) continue;

    const slicePoints = [0, ...cuts, totalCells];
    const colorPipes = [];
    let isGoodPuzzle = true;

    for (let i = 0; i < slicePoints.length - 1; i++) {
      const segment = path.slice(slicePoints[i], slicePoints[i + 1]);
      if (segment.length < minPathLen) {
        isGoodPuzzle = false;
        break;
      }
      const start = segment[0];
      const end = segment[segment.length - 1];

      colorPipes.push({
        colorId: i + 1,
        colorInfo: getPaletteColor(i + 1),
        length: segment.length,
        start: { r: start.r, c: start.c },
        end: { r: end.r, c: end.c },
        solutionPath: segment.map(pt => ({ r: pt.r, c: pt.c }))
      });
    }

    if (isGoodPuzzle && colorPipes.length === numColors) {
      bestLevel = colorPipes;
      break;
    }
  }

  // Fallback if random cuts struggled
  if (!bestLevel) {
    const fallbackPath = generateHamiltonianPath(width, height, rng, 200);
    const step = Math.floor(totalCells / numColors);
    bestLevel = [];
    for (let i = 0; i < numColors; i++) {
      const startIdx = i * step;
      const endIdx = (i === numColors - 1) ? totalCells : (i + 1) * step;
      const segment = fallbackPath.slice(startIdx, endIdx);
      bestLevel.push({
        colorId: i + 1,
        colorInfo: getPaletteColor(i + 1),
        length: segment.length,
        start: { r: segment[0].r, c: segment[0].c },
        end: { r: segment[segment.length - 1].r, c: segment[segment.length - 1].c },
        solutionPath: segment.map(pt => ({ r: pt.r, c: pt.c }))
      });
    }
  }

  // Build the initial grid: only endpoints have numbers, rest are 0
  const initialGrid = Array.from({ length: height }, () => Array(width).fill(0));
  bestLevel.forEach(pipe => {
    initialGrid[pipe.start.r][pipe.start.c] = pipe.colorId;
    initialGrid[pipe.end.r][pipe.end.c] = pipe.colorId;
  });

  return {
    seed,
    width,
    height,
    numColors,
    pipes: bestLevel,
    initialGrid
  };
}

/**
 * Helper to get level configuration based on level number and mode
 */
export function getLevelConfig(levelIndex, mode = 'campaign') {
  if (mode === 'daily') {
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return {
      title: `Daily Challenge`,
      subtitle: `${today.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
      width: 7,
      height: 7,
      numColors: 6,
      seed: dateSeed,
      mode: 'daily'
    };
  }

  // Campaign & Unlimited progression
  let width = 5;
  let height = 5;
  let numColors = 4;

  if (levelIndex <= 20) {
    // 4x4 Grid (Starter)
    width = 4;
    height = 4;
    numColors = levelIndex <= 10 ? 3 : 4;
  } else if (levelIndex <= 50) {
    // 5x5 Grid (Beginner)
    width = 5;
    height = 5;
    numColors = levelIndex <= 35 ? 4 : 5;
  } else if (levelIndex <= 80) {
    // 6x6 Grid (Medium)
    width = 6;
    height = 6;
    numColors = levelIndex <= 65 ? 5 : 6;
  } else if (levelIndex <= 120) {
    // 7x7 Grid (Hard)
    width = 7;
    height = 7;
    numColors = levelIndex <= 100 ? 6 : 7;
  } else if (levelIndex <= 200) {
    // 8x8 Grid (Expert)
    width = 8;
    height = 8;
    numColors = 7;
  } else {
    // 9x9 Grid (Master) - Unlimited!
    width = 9;
    height = 9;
    numColors = 8;
  }

  const seed = (levelIndex * 9301 + 49297) % 233280;

  return {
    title: `Level ${levelIndex}`,
    levelIndex,
    width,
    height,
    numColors,
    seed,
    mode
  };
}

/**
 * Custom level generation by specific grid size
 */
export function getCustomGridConfig(size, levelNumber = 1) {
  const sizeMap = {
    4: { width: 4, height: 4, numColors: 3 },
    5: { width: 5, height: 5, numColors: 4 },
    6: { width: 6, height: 6, numColors: 5 },
    7: { width: 7, height: 7, numColors: 6 },
    8: { width: 8, height: 8, numColors: 7 },
    9: { width: 9, height: 9, numColors: 8 }
  };

  const base = sizeMap[size] || sizeMap[5];
  const seed = (levelNumber * 104729 + size * 7919) % 1000000;

  return {
    title: `${size}x${size} - Level ${levelNumber}`,
    levelIndex: levelNumber,
    width: base.width,
    height: base.height,
    numColors: base.numColors,
    seed,
    mode: 'custom'
  };
}
