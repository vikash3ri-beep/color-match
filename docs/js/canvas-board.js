/**
 * canvas-board.js - High-DPI 60 FPS Canvas Renderer & Gesture Engine for Color Match Connect
 */

import { getPaletteColor } from './generator.js';

export class CanvasBoard {
  constructor(canvasElement, gameInstance, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.game = gameInstance;
    this.options = options;

    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.cssSize = 360;
    this.tileSize = 60;
    this.offsetX = 0;
    this.offsetY = 0;

    // Active pointer drag state
    this.isPointerDown = false;
    this.activePointerId = null;
    this.pointerPos = { x: 0, y: 0 }; // in CSS pixels relative to board
    this.activeDragColor = null;

    // Visual animation effects
    this.ripples = []; // [{ x, y, colorHex, radius, maxRadius, alpha }]
    this.animFrameId = null;
    this.lastFrameTime = performance.now();

    this.initEvents();
    this.resize();
    this.startRenderLoop();
  }

  initEvents() {
    this.canvas.style.touchAction = 'none';

    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const availableWidth = parent.clientWidth - 16;
    const availableHeight = parent.clientHeight - 16;
    const size = Math.min(availableWidth, availableHeight, 520);
    this.cssSize = Math.max(280, size);

    this.canvas.style.width = `${this.cssSize}px`;
    this.canvas.style.height = `${this.cssSize}px`;

    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(this.cssSize * this.dpr);
    this.canvas.height = Math.round(this.cssSize * this.dpr);

    this.ctx.resetTransform?.();
    this.ctx.scale(this.dpr, this.dpr);

    const cols = this.game.width || 5;
    const rows = this.game.height || 5;
    this.tileSize = this.cssSize / Math.max(cols, rows);
    this.offsetX = (this.cssSize - cols * this.tileSize) / 2;
    this.offsetY = (this.cssSize - rows * this.tileSize) / 2;

    this.render();
  }

  getGridCoordFromPointer(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.offsetX;
    const y = clientY - rect.top - this.offsetY;

    const c = Math.floor(x / this.tileSize);
    const r = Math.floor(y / this.tileSize);

    return {
      r,
      c,
      inside: r >= 0 && r < this.game.height && c >= 0 && c < this.game.width,
      cellCenterX: this.offsetX + (c + 0.5) * this.tileSize,
      cellCenterY: this.offsetY + (r + 0.5) * this.tileSize,
      localX: x,
      localY: y
    };
  }

  handlePointerDown(e) {
    e.preventDefault();
    if (this.game.isCompleted) return;

    this.isPointerDown = true;
    this.activePointerId = e.pointerId;
    this.canvas.setPointerCapture?.(e.pointerId);

    const info = this.getGridCoordFromPointer(e.clientX, e.clientY);
    this.pointerPos = { x: info.localX + this.offsetX, y: info.localY + this.offsetY };

    if (info.inside) {
      const drag = this.game.startDraw(info.r, info.c);
      if (drag) {
        this.activeDragColor = drag.colorId;
      }
    }
  }

  handlePointerMove(e) {
    if (!this.isPointerDown || e.pointerId !== this.activePointerId) return;
    e.preventDefault();

    const info = this.getGridCoordFromPointer(e.clientX, e.clientY);
    this.pointerPos = { x: info.localX + this.offsetX, y: info.localY + this.offsetY };

    if (info.inside && this.activeDragColor) {
      this.game.continueDraw(info.r, info.c);
    }
  }

  handlePointerUp(e) {
    if (this.activePointerId !== null && e.pointerId === this.activePointerId) {
      this.isPointerDown = false;
      this.activePointerId = null;
      this.activeDragColor = null;
      try {
        this.canvas.releasePointerCapture?.(e.pointerId);
      } catch (_) {}
      this.game.endDraw();
    }
  }

  triggerConnectionRipple(colorId) {
    const endpoints = this.game.endpoints.get(colorId);
    if (!endpoints) return;
    const color = getPaletteColor(colorId);

    endpoints.forEach(ep => {
      const cx = this.offsetX + (ep.c + 0.5) * this.tileSize;
      const cy = this.offsetY + (ep.r + 0.5) * this.tileSize;
      this.ripples.push({
        x: cx,
        y: cy,
        colorHex: color.hex,
        radius: this.tileSize * 0.3,
        maxRadius: this.tileSize * 1.5,
        alpha: 1.0
      });
    });
  }

  startRenderLoop() {
    const loop = (now) => {
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      this.updateAnimations(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopRenderLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  updateAnimations(dt) {
    // Update ripple rings
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rip = this.ripples[i];
      rip.radius += dt * this.tileSize * 3.5;
      rip.alpha -= dt * 2.2;
      if (rip.alpha <= 0 || rip.radius >= rip.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const { width, height } = this.game;
    const ts = this.tileSize;
    const now = performance.now();

    // Clear board with modern dark background
    ctx.clearRect(0, 0, this.cssSize, this.cssSize);

    // 1. Draw Grid Tiles
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const x = this.offsetX + c * ts;
        const y = this.offsetY + r * ts;
        const padding = 3;

        // Rounded cell tile
        ctx.fillStyle = '#161926';
        this.fillRoundRect(ctx, x + padding, y + padding, ts - padding * 2, ts - padding * 2, 8);

        // Subtle tile border
        ctx.strokeStyle = '#22283C';
        ctx.lineWidth = 1;
        this.strokeRoundRect(ctx, x + padding, y + padding, ts - padding * 2, ts - padding * 2, 8);
      }
    }

    // 2. Draw Pipes
    for (const [colorId, path] of this.game.playerPaths.entries()) {
      if (!path || path.length === 0) continue;
      this.drawPipe(colorId, path);
    }

    // 3. Draw Ripples
    for (const rip of this.ripples) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, Math.max(1, rip.radius), 0, Math.PI * 2);
      ctx.strokeStyle = rip.colorHex;
      ctx.globalAlpha = Math.max(0, rip.alpha);
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Endpoints (Dots)
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const colorId = this.game.initialGrid[r]?.[c];
        if (colorId && colorId > 0) {
          this.drawEndpoint(colorId, r, c, now);
        }
      }
    }
  }

  drawPipe(colorId, path) {
    if (path.length === 0) return;
    const ctx = this.ctx;
    const ts = this.tileSize;
    const color = getPaletteColor(colorId);
    const isDraggingThis = (this.isPointerDown && this.activeDragColor === colorId);

    const pipeWidth = ts * 0.42;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Build the pipe path coordinates
    const points = path.map(pt => ({
      x: this.offsetX + (pt.c + 0.5) * ts,
      y: this.offsetY + (pt.r + 0.5) * ts
    }));

    // If currently dragging, interpolate smooth tip towards pointer
    if (isDraggingThis && points.length > 0) {
      const lastPt = points[points.length - 1];
      const dx = this.pointerPos.x - lastPt.x;
      const dy = this.pointerPos.y - lastPt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDragDist = ts * 0.85;

      if (dist > 2) {
        const factor = Math.min(1, maxDragDist / dist);
        points.push({
          x: lastPt.x + dx * factor,
          y: lastPt.y + dy * factor
        });
      }
    }

    if (points.length < 2) {
      ctx.restore();
      return;
    }

    // Outer subtle glow
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = color.glow;
    ctx.lineWidth = pipeWidth + 8;
    ctx.stroke();

    // Main Pipe Body
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = color.hex;
    ctx.lineWidth = pipeWidth;
    ctx.stroke();

    // 3D Inner Highlight / Shine down centerline
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = pipeWidth * 0.28;
    ctx.stroke();

    ctx.restore();
  }

  drawEndpoint(colorId, r, c, now) {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const color = getPaletteColor(colorId);
    const cx = this.offsetX + (c + 0.5) * ts;
    const cy = this.offsetY + (r + 0.5) * ts;

    const isConnected = this.game.connectedColors.has(colorId);
    const pulse = isConnected ? 1.0 : (1.0 + 0.08 * Math.sin(now * 0.005 + colorId));

    ctx.save();

    // Outer Glow Circle
    ctx.beginPath();
    ctx.arc(cx, cy, (ts * 0.38) * pulse, 0, Math.PI * 2);
    ctx.fillStyle = color.glow;
    ctx.fill();

    // Main Outer Node
    ctx.beginPath();
    ctx.arc(cx, cy, ts * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = color.hex;
    ctx.shadowColor = color.hex;
    ctx.shadowBlur = isConnected ? 16 : 8;
    ctx.fill();

    // Inner Core
    ctx.shadowBlur = 0;
    ctx.beginPath();
    if (isConnected) {
      // Connected dot gets crisp inner white circle
      ctx.arc(cx, cy, ts * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    } else {
      // Specular sheen highlight
      ctx.arc(cx - ts * 0.09, cy - ts * 0.09, ts * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fill();
    }

    ctx.restore();
  }

  fillRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
    ctx.fill();
  }

  strokeRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
    ctx.stroke();
  }
}
