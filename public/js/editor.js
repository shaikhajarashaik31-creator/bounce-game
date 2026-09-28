/**
 * Nokia Bounce - Built-in Visual Level Editor
 * Interactive tile painter, live test player, and server persistence.
 */

class LevelEditor {
  constructor(game) {
    this.game = game;
    this.width = 48;
    this.height = 14;
    this.tileSize = 24; // Editor grid display size

    this.selectedTool = 'brick'; // 'air', 'brick', 'cracked', 'water', 'spike_up', 'spike_down', 'spike_left', 'spike_right', 'spring', 'pump_in', 'pump_de', 'pump_norm', 'ring_v', 'ring_h', 'checkpoint', '1up', 'spawn', 'exit'
    this.isPainting = false;

    // Grid data
    this.grid = new Array(this.width * this.height).fill(0);
    this.spawn = { x: 3 * 32, y: 11 * 32 };
    this.exit = { x: 42 * 32, y: 11 * 32 };
    this.rings = [];
    this.pumps = [];
    this.checkpoints = [];
    this.extraLives = [];

    this.editorCanvas = document.getElementById('editor-canvas');
    if (this.editorCanvas) {
      this.ctx = this.editorCanvas.getContext('2d');
      this.editorCanvas.width = this.width * this.tileSize;
      this.editorCanvas.height = this.height * this.tileSize;
      this.initEvents();
    }

    this.initDefaultTemplate();
  }

  initDefaultTemplate() {
    // Fill bottom floor
    for (let x = 0; x < this.width; x++) {
      this.grid[12 * this.width + x] = 1;
      this.grid[13 * this.width + x] = 1;
    }
    // Boundaries
    for (let y = 0; y < this.height; y++) {
      this.grid[y * this.width + 0] = 1;
      this.grid[y * this.width + (this.width - 1)] = 1;
      this.grid[0 * this.width + y] = 1;
    }

    // Default rings
    this.rings = [
      { x: 10 * 32 + 16, y: 10 * 32, orientation: 'vertical' },
      { x: 20 * 32 + 16, y: 8 * 32, orientation: 'vertical' },
      { x: 30 * 32 + 16, y: 10 * 32, orientation: 'horizontal' }
    ];

    this.render();
  }

  initEvents() {
    if (!this.editorCanvas) return;

    const getPos = (e) => {
      const rect = this.editorCanvas.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      const scaleX = this.editorCanvas.width / rect.width;
      const scaleY = this.editorCanvas.height / rect.height;
      const x = Math.floor(((clientX - rect.left) * scaleX) / this.tileSize);
      const y = Math.floor(((clientY - rect.top) * scaleY) / this.tileSize);
      return { x: Math.max(0, Math.min(this.width - 1, x)), y: Math.max(0, Math.min(this.height - 1, y)) };
    };

    const applyTool = (tx, ty) => {
      const px = tx * 32 + 16;
      const py = ty * 32 + 16;

      if (this.selectedTool === 'air') {
        this.grid[ty * this.width + tx] = 0;
        this.rings = this.rings.filter(r => Math.floor(r.x / 32) !== tx || Math.floor(r.y / 32) !== ty);
        this.pumps = this.pumps.filter(p => Math.floor(p.x / 32) !== tx || Math.floor(p.y / 32) !== ty);
        this.checkpoints = this.checkpoints.filter(c => Math.floor(c.x / 32) !== tx || Math.floor(c.y / 32) !== ty);
        this.extraLives = this.extraLives.filter(e => Math.floor(e.x / 32) !== tx || Math.floor(e.y / 32) !== ty);
      } else if (this.selectedTool === 'brick') {
        this.grid[ty * this.width + tx] = 1;
      } else if (this.selectedTool === 'cracked') {
        this.grid[ty * this.width + tx] = 2;
      } else if (this.selectedTool === 'water') {
        this.grid[ty * this.width + tx] = 3;
      } else if (this.selectedTool === 'spike_up') {
        this.grid[ty * this.width + tx] = 4;
      } else if (this.selectedTool === 'spike_down') {
        this.grid[ty * this.width + tx] = 5;
      } else if (this.selectedTool === 'spike_left') {
        this.grid[ty * this.width + tx] = 6;
      } else if (this.selectedTool === 'spike_right') {
        this.grid[ty * this.width + tx] = 7;
      } else if (this.selectedTool === 'spring') {
        this.grid[ty * this.width + tx] = 8;
      } else if (this.selectedTool === 'ring_v') {
        this.grid[ty * this.width + tx] = 0;
        this.rings = this.rings.filter(r => Math.floor(r.x / 32) !== tx || Math.floor(r.y / 32) !== ty);
        this.rings.push({ x: px, y: py, orientation: 'vertical' });
      } else if (this.selectedTool === 'ring_h') {
        this.grid[ty * this.width + tx] = 0;
        this.rings = this.rings.filter(r => Math.floor(r.x / 32) !== tx || Math.floor(r.y / 32) !== ty);
        this.rings.push({ x: px, y: py, orientation: 'horizontal' });
      } else if (this.selectedTool === 'pump_in') {
        this.grid[ty * this.width + tx] = 0;
        this.pumps = this.pumps.filter(p => Math.floor(p.x / 32) !== tx || Math.floor(p.y / 32) !== ty);
        this.pumps.push({ x: px, y: py, type: 'inflate' });
      } else if (this.selectedTool === 'pump_de') {
        this.grid[ty * this.width + tx] = 0;
        this.pumps = this.pumps.filter(p => Math.floor(p.x / 32) !== tx || Math.floor(p.y / 32) !== ty);
        this.pumps.push({ x: px, y: py, type: 'deflate' });
      } else if (this.selectedTool === 'pump_norm') {
        this.grid[ty * this.width + tx] = 0;
        this.pumps = this.pumps.filter(p => Math.floor(p.x / 32) !== tx || Math.floor(p.y / 32) !== ty);
        this.pumps.push({ x: px, y: py, type: 'normal' });
      } else if (this.selectedTool === 'checkpoint') {
        this.grid[ty * this.width + tx] = 0;
        this.checkpoints = this.checkpoints.filter(c => Math.floor(c.x / 32) !== tx || Math.floor(c.y / 32) !== ty);
        this.checkpoints.push({ x: px, y: py });
      } else if (this.selectedTool === '1up') {
        this.grid[ty * this.width + tx] = 0;
        this.extraLives = this.extraLives.filter(e => Math.floor(e.x / 32) !== tx || Math.floor(e.y / 32) !== ty);
        this.extraLives.push({ x: px, y: py });
      } else if (this.selectedTool === 'spawn') {
        this.spawn = { x: px, y: py };
      } else if (this.selectedTool === 'exit') {
        this.exit = { x: px, y: py };
      }

      this.render();
    };

    this.editorCanvas.addEventListener('mousedown', (e) => {
      this.isPainting = true;
      const pos = getPos(e);
      applyTool(pos.x, pos.y);
    });

    window.addEventListener('mouseup', () => {
      this.isPainting = false;
    });

    this.editorCanvas.addEventListener('mousemove', (e) => {
      if (!this.isPainting) return;
      const pos = getPos(e);
      applyTool(pos.x, pos.y);
    });

    // Touch support
    this.editorCanvas.addEventListener('touchstart', (e) => {
      this.isPainting = true;
      const pos = getPos(e);
      applyTool(pos.x, pos.y);
    }, { passive: true });

    this.editorCanvas.addEventListener('touchmove', (e) => {
      if (!this.isPainting) return;
      const pos = getPos(e);
      applyTool(pos.x, pos.y);
    }, { passive: true });
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const ts = this.tileSize;

    ctx.clearRect(0, 0, this.editorCanvas.width, this.editorCanvas.height);

    // Grid backdrop
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, this.editorCanvas.width, this.editorCanvas.height);

    // Tiles
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = this.grid[y * this.width + x];
        const px = x * ts;
        const py = y * ts;

        if (t === 1) { // Brick
          ctx.fillStyle = '#b71c1c';
          ctx.fillRect(px, py, ts, ts);
          ctx.strokeStyle = '#ef5350';
          ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
        } else if (t === 2) { // Cracked Brick
          ctx.fillStyle = '#5c677d';
          ctx.fillRect(px, py, ts, ts);
          ctx.strokeStyle = '#212529';
          ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
        } else if (t === 3) { // Water
          ctx.fillStyle = '#1971c2';
          ctx.fillRect(px, py, ts, ts);
        } else if (t === 4) { // Spike Up
          ctx.fillStyle = '#ff6b6b';
          ctx.beginPath();
          ctx.moveTo(px + ts / 2, py + 2);
          ctx.lineTo(px + ts - 2, py + ts - 2);
          ctx.lineTo(px + 2, py + ts - 2);
          ctx.closePath();
          ctx.fill();
        } else if (t === 5) { // Spike Down
          ctx.fillStyle = '#ff6b6b';
          ctx.beginPath();
          ctx.moveTo(px + ts / 2, py + ts - 2);
          ctx.lineTo(px + ts - 2, py + 2);
          ctx.lineTo(px + 2, py + 2);
          ctx.closePath();
          ctx.fill();
        } else if (t === 6) { // Spike Left
          ctx.fillStyle = '#ff6b6b';
          ctx.beginPath();
          ctx.moveTo(px + 2, py + ts / 2);
          ctx.lineTo(px + ts - 2, py + ts - 2);
          ctx.lineTo(px + ts - 2, py + 2);
          ctx.closePath();
          ctx.fill();
        } else if (t === 7) { // Spike Right
          ctx.fillStyle = '#ff6b6b';
          ctx.beginPath();
          ctx.moveTo(px + ts - 2, py + ts / 2);
          ctx.lineTo(px + 2, py + ts - 2);
          ctx.lineTo(px + 2, py + 2);
          ctx.closePath();
          ctx.fill();
        } else if (t === 8) { // Spring
          ctx.fillStyle = '#ff922b';
          ctx.fillRect(px + 2, py + ts - 8, ts - 4, 6);
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * ts, 0);
      ctx.lineTo(x * ts, this.height * ts);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * ts);
      ctx.lineTo(this.width * ts, y * ts);
      ctx.stroke();
    }

    // Entities
    // Rings
    for (const r of this.rings) {
      const rx = (r.x / 32) * ts;
      const ry = (r.y / 32) * ts;
      ctx.beginPath();
      if (r.orientation === 'vertical') {
        ctx.ellipse(rx, ry, ts * 0.25, ts * 0.45, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(rx, ry, ts * 0.45, ts * 0.25, 0, 0, Math.PI * 2);
      }
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Pumps
    for (const p of this.pumps) {
      const px = (p.x / 32) * ts;
      const py = (p.y / 32) * ts;
      ctx.beginPath();
      ctx.arc(px, py, ts * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = p.type === 'inflate' ? '#fab005' : (p.type === 'deflate' ? '#339af0' : '#51cf66');
      ctx.fill();
    }

    // Checkpoints
    for (const c of this.checkpoints) {
      const cx = (c.x / 32) * ts;
      const cy = (c.y / 32) * ts;
      ctx.fillStyle = '#40c057';
      ctx.fillRect(cx - 3, cy - ts * 0.4, 6, ts * 0.8);
    }

    // Extra Lives
    for (const el of this.extraLives) {
      const ex = (el.x / 32) * ts;
      const ey = (el.y / 32) * ts;
      ctx.beginPath();
      ctx.arc(ex, ey, ts * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#e03131';
      ctx.fill();
    }

    // Spawn marker
    const sx = (this.spawn.x / 32) * ts;
    const sy = (this.spawn.y / 32) * ts;
    ctx.beginPath();
    ctx.arc(sx, sy, ts * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#e03131';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Exit marker
    const ex = (this.exit.x / 32) * ts;
    const ey = (this.exit.y / 32) * ts;
    ctx.beginPath();
    ctx.arc(ex, ey, ts * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#22b8cf';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  exportLevelData(name = 'Custom Level') {
    return {
      id: 'custom_' + Date.now(),
      name,
      theme: 'meadow',
      width: this.width,
      height: this.height,
      tiles: [...this.grid],
      spawn: { ...this.spawn },
      exit: { ...this.exit },
      rings: [...this.rings],
      pumps: [...this.pumps],
      checkpoints: [...this.checkpoints],
      extraLives: [...this.extraLives],
      movingSpikes: []
    };
  }

  testCurrentLevel() {
    const levelData = this.exportLevelData('Testing Custom Level');
    this.game.loadLevel(-1, levelData);
    this.game.state = 'PLAYING';
    this.game.hideAllOverlays();
    if (window.soundEngine) window.soundEngine.startBGM();

    // Close editor modal
    const modal = document.getElementById('editor-modal');
    if (modal) modal.classList.add('hidden');
  }
}

window.LevelEditor = LevelEditor;
