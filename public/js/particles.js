/**
 * Nokia Bounce - Visual Effects & Particle Engine
 * Shards, golden sparks, water ripples, dust puffs, and victory confetti.
 */

class Particle {
  constructor(x, y, vx, vy, color, size, life, gravity = 300, shape = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.gravity = gravity;
    this.shape = shape; // 'circle', 'square', 'star', 'ring'
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 8;
  }

  update(dt) {
    this.life -= dt;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'square') {
      const s = this.size * alpha;
      ctx.fillRect(-s / 2, -s / 2, s, s);
    } else if (this.shape === 'star') {
      const s = this.size * alpha;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.3, -s * 0.3);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.3, s * 0.3);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.3, s * 0.3);
      ctx.lineTo(-s, 0);
      ctx.lineTo(-s * 0.3, -s * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === 'ring') {
      const s = this.size * (1 + (1 - alpha) * 2);
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2 * alpha;
      ctx.stroke();
    }

    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  clear() {
    this.particles = [];
  }

  update(dt) {
    this.particles = this.particles.filter(p => p.update(dt));
  }

  draw(ctx) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }

  // Golden ring collection burst
  createRingCollectBurst(x, y) {
    const colors = ['#ffe066', '#ffd43b', '#fab005', '#fcc419', '#ffffff'];
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 70 + Math.random() * 120;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 3 + Math.random() * 3;
      const life = 0.45 + Math.random() * 0.3;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 150, 'star'));
    }
    // Expanding golden ring
    this.particles.push(new Particle(x, y, 0, 0, '#ffe066', 16, 0.4, 0, 'ring'));
  }

  // Ball pop / spike burst
  createBallPopBurst(x, y) {
    const colors = ['#ff6b6b', '#e03131', '#c92a2a', '#ffa8a8', '#ffffff'];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 200;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 40;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 3 + Math.random() * 4;
      const life = 0.5 + Math.random() * 0.35;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 450, 'square'));
    }
  }

  // Water splash
  createSplash(x, y, count = 12) {
    const colors = ['#a5d8ff', '#74c0fc', '#d0ebff', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 60 + Math.random() * 110;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 2 + Math.random() * 3;
      const life = 0.3 + Math.random() * 0.3;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 400, 'circle'));
    }
  }

  // Water bubbles
  createBubbles(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 20;
      const vy = -30 - Math.random() * 30;
      const size = 2 + Math.random() * 2.5;
      const life = 0.5 + Math.random() * 0.4;
      this.particles.push(new Particle(x + (Math.random() - 0.5) * 10, y, vx, vy, '#d0ebff', size, life, -40, 'circle'));
    }
  }

  // Debris from broken cracked brick
  createDebris(x, y) {
    const colors = ['#868e96', '#495057', '#adb5bd', '#343a40'];
    for (let i = 0; i < 16; i++) {
      const vx = (Math.random() - 0.5) * 160;
      const vy = -80 - Math.random() * 120;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 3 + Math.random() * 4;
      const life = 0.6 + Math.random() * 0.3;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 550, 'square'));
    }
  }

  // Ground dust landing puff
  createDust(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      const dir = (i % 2 === 0 ? 1 : -1);
      const vx = dir * (25 + Math.random() * 40);
      const vy = -10 - Math.random() * 20;
      const size = 3 + Math.random() * 2.5;
      const life = 0.25 + Math.random() * 0.2;
      this.particles.push(new Particle(x, y, vx, vy, 'rgba(255, 255, 255, 0.7)', size, life, 50, 'circle'));
    }
  }

  // Spring puff
  createSpringPuff(x, y) {
    for (let i = 0; i < 8; i++) {
      const vx = (Math.random() - 0.5) * 90;
      const vy = -30 - Math.random() * 40;
      const size = 3 + Math.random() * 3;
      const life = 0.3 + Math.random() * 0.2;
      this.particles.push(new Particle(x, y, vx, vy, '#ffd43b', size, life, 100, 'circle'));
    }
    this.particles.push(new Particle(x, y, 0, -20, '#ff922b', 18, 0.35, 0, 'ring'));
  }

  // Sparkle on rings or checkpoints
  createSparkle(x, y, count = 1) {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 30;
      const vy = (Math.random() - 0.5) * 30;
      const size = 2 + Math.random() * 2;
      const life = 0.3 + Math.random() * 0.2;
      this.particles.push(new Particle(x, y, vx, vy, '#fff9db', size, life, 0, 'star'));
    }
  }

  // Pump activation shockwave
  createPumpBurst(x, y, type) {
    const color = type === 'inflate' ? '#fab005' : (type === 'deflate' ? '#339af0' : '#51cf66');
    this.particles.push(new Particle(x, y, 0, 0, color, 24, 0.4, 0, 'ring'));
  }

  // Victory Confetti
  createConfetti(x, y) {
    const colors = ['#ff6b6b', '#ffd43b', '#51cf66', '#339af0', '#cc5de8', '#ff922b'];
    for (let i = 0; i < 40; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2;
      const speed = 120 + Math.random() * 180;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 3 + Math.random() * 4;
      const life = 1.0 + Math.random() * 0.8;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 250, 'square'));
    }
  }
}

window.ParticleSystem = ParticleSystem;
