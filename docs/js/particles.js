// Canvas particle engine for confetti, pop bursts, and celebrations

class ParticleEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationFrame = null;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  // Tactile burst at tap position
  spawnTapBurst(x, y, color = '#FFDD44') {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        type: 'dot',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 4,
        color,
        alpha: 1,
        decay: 0.03 + Math.random() * 0.02,
        gravity: 0.15
      });
    }
    this.startLoop();
  }

  // Streak celebration stars
  spawnStreakBurst(x, y) {
    const colors = ['#FFD700', '#FF8844', '#FF4444', '#AA44FF', '#4488FF'];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      this.particles.push({
        type: 'star',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.015,
        gravity: 0.12
      });
    }
    this.startLoop();
  }

  // Fullscreen celebratory confetti (New High Score / Game Win)
  spawnConfetti() {
    const colors = ['#FF4444', '#4488FF', '#44CC44', '#FFDD44', '#FF8844', '#AA44FF', '#FF66AA', '#44DDDD'];
    const count = 90;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'confetti',
        x: Math.random() * this.width,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 5,
        width: 7 + Math.random() * 7,
        height: 12 + Math.random() * 10,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.006 + Math.random() * 0.005,
        swaySpeed: 0.02 + Math.random() * 0.03,
        swayOffset: Math.random() * Math.PI * 2
      });
    }
    this.startLoop();
  }

  startLoop() {
    if (this.animationFrame) return;
    this.loop();
  }

  loop() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'dot') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'star') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotSpeed;

        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        this.ctx.fillStyle = p.color;
        this.drawStar(0, 0, 5, p.size, p.size / 2);
        this.ctx.fill();
      } else if (p.type === 'confetti') {
        p.x += p.vx + Math.sin(p.swayOffset) * 1.5;
        p.y += p.vy;
        p.swayOffset += p.swaySpeed;
        p.rotation += p.rotSpeed;

        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationFrame = requestAnimationFrame(() => this.loop());
    } else {
      this.animationFrame = null;
    }
  }

  drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }
    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
  }
}

export const particleEngine = new ParticleEngine();
