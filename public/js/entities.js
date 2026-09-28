/**
 * Nokia Bounce - Interactive Level Entities
 * Rings, Spikes, Pumps, Springs, Checkpoints, Exit Portals, and Moving Hazards.
 */

class Ring {
  constructor(x, y, orientation = 'vertical') {
    this.x = x;
    this.y = y;
    this.orientation = orientation; // 'vertical' or 'horizontal'
    this.collected = false;
    this.width = orientation === 'vertical' ? 16 : 40;
    this.height = orientation === 'vertical' ? 42 : 16;
    this.spinTimer = Math.random() * Math.PI * 2;
    this.sparkleTimer = 0;
  }

  update(dt, ball, particles) {
    if (this.collected) return;

    this.spinTimer += dt * 3.5;
    this.sparkleTimer += dt;

    // Periodic sparkle
    if (this.sparkleTimer > 0.4 && particles) {
      this.sparkleTimer = 0;
      particles.createSparkle(
        this.x + (Math.random() - 0.5) * 16,
        this.y + (Math.random() - 0.5) * 24
      );
    }

    // Check ball traversal through the ring
    const dx = Math.abs(ball.x - this.x);
    const dy = Math.abs(ball.y - this.y);

    const hit = this.orientation === 'vertical'
      ? (dx < ball.radius * 0.7 && dy < this.height * 0.6)
      : (dy < ball.radius * 0.7 && dx < this.width * 0.6);

    if (hit) {
      this.collected = true;
      if (window.soundEngine) window.soundEngine.playRingCollect();
      if (particles) particles.createRingCollectBurst(this.x, this.y);
      return true; // Ring collected!
    }

    return false;
  }

  draw(ctx) {
    if (this.collected) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 3D rotation scale factor
    const rotScale = Math.cos(this.spinTimer);

    if (this.orientation === 'vertical') {
      // Golden Vertical Hoop
      const rx = Math.max(3, Math.abs(rotScale) * 12);
      const ry = 22;

      // Outer golden rim
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.lineWidth = 4.5;
      const grad = ctx.createLinearGradient(-rx, -ry, rx, ry);
      grad.addColorStop(0, '#ffe066');
      grad.addColorStop(0.5, '#f59f00');
      grad.addColorStop(1, '#ffc078');
      ctx.strokeStyle = grad;
      ctx.stroke();

      // Inner glow
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1, rx - 3), ry - 3, 0, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fff9db';
      ctx.stroke();
    } else {
      // Golden Horizontal Hoop
      const rx = 22;
      const ry = Math.max(3, Math.abs(rotScale) * 12);

      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.lineWidth = 4.5;
      const grad = ctx.createLinearGradient(-rx, -ry, rx, ry);
      grad.addColorStop(0, '#ffe066');
      grad.addColorStop(0.5, '#f59f00');
      grad.addColorStop(1, '#ffc078');
      ctx.strokeStyle = grad;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 3, Math.max(1, ry - 3), 0, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fff9db';
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Spike {
  constructor(x, y, dir = 'up') {
    this.x = x; // Center x
    this.y = y; // Center y
    this.dir = dir; // 'up', 'down', 'left', 'right'
  }

  checkCollision(ball) {
    if (ball.invincible || ball.cheatActive || ball.isDead) return false;

    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    const distSq = dx * dx + dy * dy;

    // Fast reject
    if (distSq > (ball.radius + 16) * (ball.radius + 16)) return false;

    // Detailed check
    if (this.dir === 'up') {
      if (ball.y < this.y + 12 && ball.y + ball.radius > this.y - 12 && Math.abs(dx) < ball.radius * 0.75 + 10) {
        return true;
      }
    } else if (this.dir === 'down') {
      if (ball.y > this.y - 12 && ball.y - ball.radius < this.y + 12 && Math.abs(dx) < ball.radius * 0.75 + 10) {
        return true;
      }
    } else if (this.dir === 'left') {
      if (ball.x > this.x - 12 && ball.x - ball.radius < this.x + 12 && Math.abs(dy) < ball.radius * 0.75 + 10) {
        return true;
      }
    } else if (this.dir === 'right') {
      if (ball.x < this.x + 12 && ball.x + ball.radius > this.x - 12 && Math.abs(dy) < ball.radius * 0.75 + 10) {
        return true;
      }
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    let angle = 0;
    if (this.dir === 'down') angle = Math.PI;
    if (this.dir === 'left') angle = -Math.PI / 2;
    if (this.dir === 'right') angle = Math.PI / 2;
    ctx.rotate(angle);

    // Sharp metallic spike
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(13, 14);
    ctx.lineTo(-13, 14);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-13, 0, 13, 0);
    grad.addColorStop(0, '#e03131');
    grad.addColorStop(0.5, '#ff8787');
    grad.addColorStop(1, '#c92a2a');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#49111c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Metallic center shine line
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 13);
    ctx.strokeStyle = '#ffe3e3';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}

class MovingSpike {
  constructor(x, y, range = 96, speed = 60, axis = 'horizontal') {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.range = range;
    this.speed = speed;
    this.axis = axis; // 'horizontal' or 'vertical'
    this.direction = 1;
    this.rotation = 0;
    this.radius = 14;
  }

  update(dt, ball) {
    this.rotation += dt * 3.0;

    if (this.axis === 'horizontal') {
      this.x += this.speed * this.direction * dt;
      if (this.x > this.startX + this.range) {
        this.x = this.startX + this.range;
        this.direction = -1;
      } else if (this.x < this.startX - this.range) {
        this.x = this.startX - this.range;
        this.direction = 1;
      }
    } else {
      this.y += this.speed * this.direction * dt;
      if (this.y > this.startY + this.range) {
        this.y = this.startY + this.range;
        this.direction = -1;
      } else if (this.y < this.startY - this.range) {
        this.y = this.startY - this.range;
        this.direction = 1;
      }
    }

    // Check collision
    if (ball.invincible || ball.cheatActive || ball.isDead) return false;
    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    const distSq = dx * dx + dy * dy;
    const hitDist = (ball.radius + this.radius) * 0.9;
    return distSq < hitDist * hitDist;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Spiky ball enemy
    const spikeCount = 8;
    ctx.beginPath();
    for (let i = 0; i < spikeCount; i++) {
      const a = (i / spikeCount) * Math.PI * 2;
      const x1 = Math.cos(a) * (this.radius + 6);
      const y1 = Math.sin(a) * (this.radius + 6);
      const aMid = a + Math.PI / spikeCount;
      const x2 = Math.cos(aMid) * this.radius;
      const y2 = Math.sin(aMid) * this.radius;
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fillStyle = '#2b2c34';
    ctx.fill();
    ctx.strokeStyle = '#e03131';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sinister glowing eye
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6b6b';
    ctx.fill();

    ctx.restore();
  }
}

class Pump {
  constructor(x, y, type = 'inflate') {
    this.x = x;
    this.y = y;
    this.type = type; // 'inflate' (big), 'deflate' (small), 'normal'
    this.pulse = 0;
    this.cooldown = 0;
  }

  update(dt, ball, particles) {
    this.pulse += dt * 4;
    if (this.cooldown > 0) this.cooldown -= dt;

    if (this.cooldown <= 0) {
      const dx = Math.abs(ball.x - this.x);
      const dy = Math.abs(ball.y - this.y);
      if (dx < ball.radius + 12 && dy < ball.radius + 12) {
        let changed = false;
        if (this.type === 'inflate' && ball.sizeState !== 'big') {
          ball.setSize('big');
          changed = true;
          if (window.soundEngine) window.soundEngine.playPump(true);
        } else if (this.type === 'deflate' && ball.sizeState !== 'small') {
          ball.setSize('small');
          changed = true;
          if (window.soundEngine) window.soundEngine.playPump(false);
        } else if (this.type === 'normal' && ball.sizeState !== 'normal') {
          ball.setSize('normal');
          changed = true;
          if (window.soundEngine) window.soundEngine.playPump(false);
        }

        if (changed) {
          this.cooldown = 1.0;
          if (particles) particles.createPumpBurst(this.x, this.y, this.type);
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const scale = 1.0 + Math.sin(this.pulse) * 0.08;
    ctx.scale(scale, scale);

    // Pump base
    ctx.fillStyle = '#343a40';
    ctx.fillRect(-14, 4, 28, 10);

    // Pump nozzle / gauge
    let color = '#fab005'; // Inflate yellow
    let symbol = '▲';
    if (this.type === 'deflate') {
      color = '#339af0'; // Deflate blue
      symbol = '▼';
    } else if (this.type === 'normal') {
      color = '#51cf66'; // Normal green
      symbol = '●';
    }

    ctx.beginPath();
    ctx.arc(0, -4, 12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Symbol
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, 0, -3);

    ctx.restore();
  }
}

class Checkpoint {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.active = false;
    this.flagAnim = 0;
  }

  update(dt, ball, particles) {
    this.flagAnim += dt * 3;

    if (!this.active) {
      const dx = Math.abs(ball.x - this.x);
      const dy = Math.abs(ball.y - this.y);
      if (dx < ball.radius + 14 && dy < ball.radius + 20) {
        this.active = true;
        ball.spawnX = this.x;
        ball.spawnY = this.y - 12;
        if (window.soundEngine) window.soundEngine.playCheckpoint();
        if (particles) particles.createSparkle(this.x, this.y - 16, 12);
        return true;
      }
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Base
    ctx.fillStyle = '#495057';
    ctx.fillRect(-10, 10, 20, 6);

    // Pole
    ctx.fillStyle = '#ced4da';
    ctx.fillRect(-2, -18, 4, 30);

    // Flag
    const wave = Math.sin(this.flagAnim) * 3;
    ctx.beginPath();
    ctx.moveTo(2, -18);
    ctx.lineTo(18 + wave, -12);
    ctx.lineTo(2, -6);
    ctx.closePath();

    ctx.fillStyle = this.active ? '#40c057' : '#ffd43b';
    ctx.fill();
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}

class ExitGate {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.portalTimer = 0;
  }

  update(dt, ball, ringsRemaining) {
    this.portalTimer += dt * 4;

    const isUnlocked = ringsRemaining === 0;
    if (isUnlocked) {
      const dx = Math.abs(ball.x - this.x);
      const dy = Math.abs(ball.y - this.y);
      if (dx < 16 && dy < 20) {
        return true; // Level Won!
      }
    }
    return false;
  }

  draw(ctx, ringsRemaining) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const isUnlocked = ringsRemaining === 0;

    // Door frame
    ctx.beginPath();
    ctx.arc(0, -10, 16, Math.PI, 0);
    ctx.lineTo(16, 16);
    ctx.lineTo(-16, 16);
    ctx.closePath();

    if (isUnlocked) {
      // Swirling glowing portal
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      grad.addColorStop(0, '#e7f5ff');
      grad.addColorStop(0.5, '#339af0');
      grad.addColorStop(1, '#1864ab');
      ctx.fillStyle = grad;
      ctx.fill();

      // Swirling ring
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 8, this.portalTimer, 0, Math.PI * 2);
      ctx.strokeStyle = '#74c0fc';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = '#22b8cf';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      // Locked iron gate
      ctx.fillStyle = '#212529';
      ctx.fill();

      // Iron bars
      ctx.strokeStyle = '#495057';
      ctx.lineWidth = 2;
      for (let bx = -10; bx <= 10; bx += 5) {
        ctx.beginPath();
        ctx.moveTo(bx, -8);
        ctx.lineTo(bx, 15);
        ctx.stroke();
      }

      // Padlock
      ctx.fillStyle = '#f59f00';
      ctx.fillRect(-5, 0, 10, 8);
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, Math.PI, 0);
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Frame outline
      ctx.strokeStyle = '#868e96';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  }
}

class ExtraLife {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.collected = false;
    this.floatTimer = Math.random() * Math.PI;
  }

  update(dt, ball, particles) {
    if (this.collected) return false;
    this.floatTimer += dt * 3;

    const curY = this.y + Math.sin(this.floatTimer) * 4;
    const dx = ball.x - this.x;
    const dy = ball.y - curY;
    if (dx * dx + dy * dy < (ball.radius + 12) * (ball.radius + 12)) {
      this.collected = true;
      if (window.soundEngine) window.soundEngine.playRingCollect();
      if (particles) particles.createSparkle(this.x, this.y, 16);
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (this.collected) return;
    ctx.save();
    const curY = this.y + Math.sin(this.floatTimer) * 4;
    ctx.translate(this.x, curY);

    // Glowing protective bubble
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 107, 107, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#ff8787';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Mini red ball
    const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 7);
    grad.addColorStop(0, '#ff8787');
    grad.addColorStop(0.5, '#e03131');
    grad.addColorStop(1, '#9b111e');
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 1UP text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1UP', 0, 10);

    ctx.restore();
  }
}

window.Ring = Ring;
window.Spike = Spike;
window.MovingSpike = MovingSpike;
window.Pump = Pump;
window.Checkpoint = Checkpoint;
window.ExitGate = ExitGate;
window.ExtraLife = ExtraLife;
