/**
 * Nokia Bounce - Main Game Engine
 * Coordinates game loop, camera, rendering, input, states, and HUD.
 */

class BounceGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // Virtual resolution (Classic Nokia 4:3 high-res aspect ratio: 480 x 360)
    this.width = 480;
    this.height = 360;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // States: 'MENU', 'PLAYING', 'PAUSED', 'LEVEL_COMPLETE', 'GAME_OVER', 'VICTORY'
    this.state = 'MENU';

    // Game data
    this.currentLevelIndex = 0;
    this.level = null;
    this.ball = null;
    this.particles = new ParticleSystem();

    // Stats
    this.score = 0;
    this.lives = 3;
    this.levelTime = 0;
    this.totalTime = 0;

    // Camera
    this.camera = {
      x: 0,
      y: 0,
      shake: 0
    };

    // Input state
    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false
    };

    // Nokia cheat sequence tracking (787898)
    this.cheatBuffer = '';
    this.cheatTimer = null;

    // Time tracking
    this.lastTime = performance.now();

    this.initInputs();
    this.initAudioTriggers();
    this.updateViewportSize();
    window.addEventListener('resize', () => this.updateViewportSize());
    this.loadLevel(0);

    // Start loop
    requestAnimationFrame(this.loop.bind(this));
  }

  updateViewportSize() {
    const isPhone = document.body.classList.contains('mode-phone');
    if (isPhone) {
      this.width = 480;
      this.height = 360;
    } else {
      // Dynamic widescreen aspect ratio for fullscreen
      const viewport = this.canvas.parentElement;
      const rect = viewport ? viewport.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight - 56 };
      const aspect = (rect.width > 0 && rect.height > 0) ? rect.width / rect.height : 16 / 9;
      this.height = 360;
      this.width = Math.round(Math.max(480, Math.min(880, 360 * aspect)));
    }
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    if (this.level) this.clampCamera();
  }

  loadLevel(index, customLevelData = null) {
    let lvlData;
    if (customLevelData) {
      lvlData = customLevelData;
      this.currentLevelIndex = -1;
    } else {
      this.currentLevelIndex = Math.max(0, Math.min(window.DEFAULT_LEVELS.length - 1, index));
      lvlData = window.DEFAULT_LEVELS[this.currentLevelIndex];
    }

    this.level = new Level(lvlData);
    this.ball = new Ball(this.level.spawn.x, this.level.spawn.y);
    this.particles.clear();
    this.levelTime = 0;

    // Center camera on spawn
    this.camera.x = this.ball.x - this.width / 2;
    this.camera.y = this.ball.y - this.height / 2;
    this.clampCamera();

    this.updateHUD();
  }

  clampCamera() {
    const maxX = Math.max(0, this.level.width * this.level.tileSize - this.width);
    const maxY = Math.max(0, this.level.height * this.level.tileSize - this.height);
    this.camera.x = Math.max(0, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(0, Math.min(maxY, this.camera.y));
  }

  startNewGame() {
    this.score = 0;
    this.lives = 3;
    this.totalTime = 0;
    this.loadLevel(0);
    this.state = 'PLAYING';
    this.hideAllOverlays();
    if (window.soundEngine) {
      window.soundEngine.ensureContext();
      window.soundEngine.startBGM();
    }
  }

  restartCurrentLevel() {
    this.loadLevel(this.currentLevelIndex);
    this.state = 'PLAYING';
    this.hideAllOverlays();
    if (window.soundEngine) window.soundEngine.startBGM();
  }

  handleBallDeath() {
    if (this.ball.isDead) return;
    this.ball.isDead = true;
    this.camera.shake = 16;

    if (window.soundEngine) window.soundEngine.playPop();
    this.particles.createBallPopBurst(this.ball.x, this.ball.y);

    this.lives--;
    this.updateHUD();

    setTimeout(() => {
      if (this.lives <= 0) {
        this.triggerGameOver();
      } else {
        // Respawn at checkpoint or spawn
        this.ball.reset();
        this.camera.x = this.ball.x - this.width / 2;
        this.camera.y = this.ball.y - this.height / 2;
        this.clampCamera();
        this.updateHUD();
      }
    }, 900);
  }

  triggerLevelComplete() {
    this.state = 'LEVEL_COMPLETE';
    if (window.soundEngine) {
      window.soundEngine.stopBGM();
      window.soundEngine.playLevelComplete();
    }
    this.particles.createConfetti(this.ball.x, this.ball.y);

    // Calculate level bonuses
    const timeBonus = Math.max(0, Math.floor(1000 - this.levelTime * 15));
    const ringsBonus = this.level.totalRings * 200;
    const levelScore = timeBonus + ringsBonus + 500;
    this.score += levelScore;

    this.showLevelCompleteModal(timeBonus, ringsBonus, levelScore);
    this.updateHUD();
  }

  triggerGameOver() {
    this.state = 'GAME_OVER';
    if (window.soundEngine) {
      window.soundEngine.stopBGM();
      window.soundEngine.playGameOver();
    }
    this.showGameOverModal();
  }

  nextLevel() {
    if (this.currentLevelIndex + 1 < window.DEFAULT_LEVELS.length) {
      this.loadLevel(this.currentLevelIndex + 1);
      this.state = 'PLAYING';
      this.hideAllOverlays();
      if (window.soundEngine) window.soundEngine.startBGM();
    } else {
      // Won entire game!
      this.triggerVictory();
    }
  }

  triggerVictory() {
    this.state = 'VICTORY';
    if (window.soundEngine) {
      window.soundEngine.stopBGM();
      window.soundEngine.playLevelComplete();
    }
    this.showVictoryModal();
  }

  // --- Input & Cheat Handling ---
  initInputs() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser from scrolling with arrow keys or space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) ||
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Up', 'Down', 'Left', 'Right', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Append key to cheat buffer (e.g. 787898)
      if (e.key >= '0' && e.key <= '9') {
        this.registerCheatDigit(e.key);
      }

      const isUp = (e.code === 'ArrowUp' || e.key === 'ArrowUp' || e.key === 'Up' || e.code === 'KeyW' || e.key === 'w' || e.key === 'W' || e.code === 'Space' || e.key === ' ');
      const isDown = (e.code === 'ArrowDown' || e.key === 'ArrowDown' || e.key === 'Down' || e.code === 'KeyS' || e.key === 's' || e.key === 'S');
      const isLeft = (e.code === 'ArrowLeft' || e.key === 'ArrowLeft' || e.key === 'Left' || e.code === 'KeyA' || e.key === 'a' || e.key === 'A');
      const isRight = (e.code === 'ArrowRight' || e.key === 'ArrowRight' || e.key === 'Right' || e.code === 'KeyD' || e.key === 'd' || e.key === 'D');

      if (isLeft) {
        this.input.left = true;
      }
      if (isRight) {
        this.input.right = true;
      }
      if (isUp) {
        this.input.up = true;
        this.input.jump = true;
      }
      if (isDown) {
        this.input.down = true;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      } else if (e.code === 'KeyR') {
        this.restartCurrentLevel();
      } else if (e.code === 'KeyF') {
        if (window.toggleFullscreenMode) window.toggleFullscreenMode();
      }
    });

    window.addEventListener('keyup', (e) => {
      const isUp = (e.code === 'ArrowUp' || e.key === 'ArrowUp' || e.key === 'Up' || e.code === 'KeyW' || e.key === 'w' || e.key === 'W' || e.code === 'Space' || e.key === ' ');
      const isDown = (e.code === 'ArrowDown' || e.key === 'ArrowDown' || e.key === 'Down' || e.code === 'KeyS' || e.key === 's' || e.key === 'S');
      const isLeft = (e.code === 'ArrowLeft' || e.key === 'ArrowLeft' || e.key === 'Left' || e.code === 'KeyA' || e.key === 'a' || e.key === 'A');
      const isRight = (e.code === 'ArrowRight' || e.key === 'ArrowRight' || e.key === 'Right' || e.code === 'KeyD' || e.key === 'd' || e.key === 'D');

      if (isLeft) {
        this.input.left = false;
      }
      if (isRight) {
        this.input.right = false;
      }
      if (isUp) {
        this.input.up = false;
        this.input.jump = false;
      }
      if (isDown) {
        this.input.down = false;
      }
    });

    // Virtual Nokia Keypad buttons binding
    this.bindKeypad();
  }

  bindKeypad() {
    const bindBtn = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      const downHandler = (e) => {
        e.preventDefault();
        onDown();
      };
      const upHandler = (e) => {
        e.preventDefault();
        if (onUp) onUp();
      };
      el.addEventListener('mousedown', downHandler);
      el.addEventListener('mouseup', upHandler);
      el.addEventListener('mouseleave', upHandler);
      el.addEventListener('touchstart', downHandler, { passive: false });
      el.addEventListener('touchend', upHandler, { passive: false });
    };

    // Nokia 2 / 4 / 6 / 8 / 5
    bindBtn('key-2', () => { this.input.up = true; this.registerCheatDigit('2'); }, () => { this.input.up = false; });
    bindBtn('key-4', () => { this.input.left = true; this.registerCheatDigit('4'); }, () => { this.input.left = false; });
    bindBtn('key-6', () => { this.input.right = true; this.registerCheatDigit('6'); }, () => { this.input.right = false; });
    bindBtn('key-8', () => { this.input.down = true; this.registerCheatDigit('8'); }, () => { this.input.down = false; });
    bindBtn('key-5', () => { this.input.jump = true; this.input.up = true; this.registerCheatDigit('5'); }, () => { this.input.jump = false; this.input.up = false; });

    // Number keys for classic cheat (787898)
    ['1', '3', '7', '9', '0', 'star', 'hash'].forEach(k => {
      const el = document.getElementById(`key-${k}`);
      if (el) {
        el.addEventListener('click', () => {
          this.registerCheatDigit(k === 'star' ? '*' : (k === 'hash' ? '#' : k));
        });
      }
    });

    // D-Pad / Navi-key
    bindBtn('dpad-up', () => { this.input.up = true; }, () => { this.input.up = false; });
    bindBtn('dpad-down', () => { this.input.down = true; }, () => { this.input.down = false; });
    bindBtn('dpad-left', () => { this.input.left = true; }, () => { this.input.left = false; });
    bindBtn('dpad-right', () => { this.input.right = true; }, () => { this.input.right = false; });
    bindBtn('dpad-center', () => { this.input.jump = true; this.input.up = true; }, () => { this.input.jump = false; this.input.up = false; });

    // Floating Arcade Touch Buttons (Fullscreen mode)
    bindBtn('arc-btn-left', () => { this.input.left = true; }, () => { this.input.left = false; });
    bindBtn('arc-btn-right', () => { this.input.right = true; }, () => { this.input.right = false; });
    bindBtn('arc-btn-up', () => { this.input.up = true; this.input.jump = true; }, () => { this.input.up = false; this.input.jump = false; });
    bindBtn('arc-btn-down', () => { this.input.down = true; }, () => { this.input.down = false; });

    // Soft Keys
    const softLeft = document.getElementById('soft-key-left');
    if (softLeft) {
      softLeft.addEventListener('click', () => this.togglePause());
    }
    const softRight = document.getElementById('soft-key-right');
    if (softRight) {
      softRight.addEventListener('click', () => this.restartCurrentLevel());
    }
  }

  registerCheatDigit(d) {
    this.cheatBuffer += d;
    if (this.cheatTimer) clearTimeout(this.cheatTimer);
    this.cheatTimer = setTimeout(() => { this.cheatBuffer = ''; }, 3500);

    // Nokia Bounce iconic cheat code: 787898
    if (this.cheatBuffer.includes('787898')) {
      this.cheatBuffer = '';
      this.toggleSuperBallCheat();
    }
  }

  toggleSuperBallCheat() {
    this.ball.cheatActive = !this.ball.cheatActive;
    this.ball.invincible = this.ball.cheatActive;
    if (window.soundEngine) window.soundEngine.playCheat();

    const banner = document.getElementById('cheat-banner');
    if (banner) {
      banner.textContent = this.ball.cheatActive
        ? '★ CHEAT: 787898 ACTIVE! SUPER BALL INVINCIBLE & FLY! ★'
        : 'CHEAT DEACTIVATED';
      banner.classList.add('visible');
      setTimeout(() => banner.classList.remove('visible'), 3000);
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      if (window.soundEngine) window.soundEngine.stopBGM();
      document.getElementById('pause-overlay').classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      if (window.soundEngine) window.soundEngine.startBGM();
      document.getElementById('pause-overlay').classList.add('hidden');
    }
  }

  initAudioTriggers() {
    // Unlock Web Audio on first user interaction anywhere
    const unlock = () => {
      if (window.soundEngine) window.soundEngine.ensureContext();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
  }

  // --- Main Loop ---
  loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (this.state === 'PLAYING') {
      this.update(dt);
    }

    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    this.levelTime += dt;
    this.totalTime += dt;

    // Update ball physics
    this.ball.update(dt, this.input, this.level, this.particles);

    // Update level elements & entity collisions
    const result = this.level.update(dt, this.ball, this.particles);
    if (result) {
      if (result.type === 'hazard') {
        this.handleBallDeath();
      } else if (result.type === 'exit') {
        this.triggerLevelComplete();
      } else if (result.type === '1up') {
        this.lives++;
        this.score += 500;
        this.updateHUD();
      }
    }

    // Update particle effects
    this.particles.update(dt);

    // Smooth Camera Lerp
    const targetCamX = this.ball.x - this.width / 2;
    const targetCamY = this.ball.y - this.height / 2;
    this.camera.x += (targetCamX - this.camera.x) * (dt * 6.5);
    this.camera.y += (targetCamY - this.camera.y) * (dt * 6.5);
    this.clampCamera();

    // Camera shake damping
    if (this.camera.shake > 0) {
      this.camera.shake -= dt * 30;
      if (this.camera.shake < 0) this.camera.shake = 0;
    }

    this.updateHUD();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Camera transform with screen shake
    this.ctx.save();
    let shakeX = 0;
    let shakeY = 0;
    if (this.camera.shake > 0) {
      shakeX = (Math.random() - 0.5) * this.camera.shake;
      shakeY = (Math.random() - 0.5) * this.camera.shake;
    }

    this.ctx.translate(-Math.floor(this.camera.x + shakeX), -Math.floor(this.camera.y + shakeY));

    // 1. Draw Level (Tiles, Backdrop, Water, Entities)
    if (this.level) {
      this.level.draw(this.ctx, this.camera.x, this.camera.y, this.width, this.height);
    }

    // 2. Draw Ball
    if (this.ball && !this.ball.isDead) {
      this.drawBall(this.ctx);
    }

    // 3. Draw Particles
    this.particles.draw(this.ctx);

    this.ctx.restore();
  }

  drawBall(ctx) {
    ctx.save();
    ctx.translate(this.ball.x, this.ball.y);

    // Squash & Stretch
    ctx.scale(this.ball.scaleX, this.ball.scaleY);

    // Rolling rotation
    ctx.rotate(this.ball.rotation);

    const r = this.ball.radius;

    // Glowing invincibility aura if cheat active
    if (this.ball.invincible) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `hsl(${(performance.now() * 0.5) % 360}, 100%, 65%)`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Drop shadow
    ctx.beginPath();
    ctx.ellipse(0, r * 0.85, r * 0.9, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    // Iconic Red Rubber Ball Gradient
    const ballGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.08, 0, 0, r);
    ballGrad.addColorStop(0, '#ff8787');   // Top-left specular shine
    ballGrad.addColorStop(0.2, '#fa5252'); // Bright red body
    ballGrad.addColorStop(0.7, '#e03131'); // Core ruby red
    ballGrad.addColorStop(1, '#861b1d');   // Bottom shadow edge

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // Darker outline for retro sharpness
    ctx.strokeStyle = '#49111c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Iconic yellow curved stripe / ring pattern on Nokia ball that rotates
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, -0.7, 0.7);
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = Math.max(1.8, r * 0.15);
    ctx.stroke();

    // Specular highlight gleam
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fill();

    ctx.restore();
  }

  // --- UI & HUD Update ---
  updateHUD() {
    if (!this.level) return;

    // Rings
    const ringEl = document.getElementById('hud-rings');
    if (ringEl) {
      const remaining = this.level.ringsRemaining;
      const total = this.level.totalRings;
      ringEl.textContent = `${total - remaining}/${total}`;
    }

    // Lives
    const livesEl = document.getElementById('hud-lives');
    if (livesEl) {
      livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives));
    }

    // Score
    const scoreEl = document.getElementById('hud-score');
    if (scoreEl) {
      scoreEl.textContent = String(this.score).padStart(6, '0');
    }

    // Level
    const levelEl = document.getElementById('hud-level');
    if (levelEl) {
      levelEl.textContent = this.currentLevelIndex >= 0
        ? `LVL ${this.currentLevelIndex + 1}`
        : 'CUSTOM';
    }

    // Ball size
    const sizeEl = document.getElementById('hud-size');
    if (sizeEl && this.ball) {
      const sizeText = this.ball.sizeState === 'big' ? 'BIG' : (this.ball.sizeState === 'small' ? 'TINY' : 'NORM');
      sizeEl.textContent = sizeText;
    }
  }

  hideAllOverlays() {
    ['menu-overlay', 'pause-overlay', 'level-complete-overlay', 'game-over-overlay', 'victory-overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  showLevelCompleteModal(timeBonus, ringsBonus, total) {
    this.hideAllOverlays();
    const modal = document.getElementById('level-complete-overlay');
    if (!modal) return;

    document.getElementById('lc-time-bonus').textContent = `+${timeBonus}`;
    document.getElementById('lc-rings-bonus').textContent = `+${ringsBonus}`;
    document.getElementById('lc-total-score').textContent = this.score;

    modal.classList.remove('hidden');
  }

  showGameOverModal() {
    this.hideAllOverlays();
    const modal = document.getElementById('game-over-overlay');
    if (!modal) return;

    document.getElementById('go-final-score').textContent = this.score;
    modal.classList.remove('hidden');
  }

  showVictoryModal() {
    this.hideAllOverlays();
    const modal = document.getElementById('victory-overlay');
    if (!modal) return;

    document.getElementById('vic-final-score').textContent = this.score;
    document.getElementById('vic-total-time').textContent = `${Math.floor(this.totalTime)}s`;
    modal.classList.remove('hidden');
  }
}

window.BounceGame = BounceGame;
