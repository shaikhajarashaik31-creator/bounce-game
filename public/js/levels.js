/**
 * Nokia Bounce - Level Definitions & Map Loader
 * 5 curated retro levels replicating the authentic Nokia progression.
 */

class Level {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.theme = data.theme || 'meadow';
    this.width = data.width;
    this.height = data.height;
    this.tileSize = 32;
    this.tiles = JSON.parse(JSON.stringify(data.tiles)); // Deep clone grid

    this.spawn = { ...data.spawn };
    this.exit = new ExitGate(data.exit.x, data.exit.y);

    // Entities
    this.rings = (data.rings || []).map(r => new Ring(r.x, r.y, r.orientation));
    this.pumps = (data.pumps || []).map(p => new Pump(p.x, p.y, p.type));
    this.checkpoints = (data.checkpoints || []).map(c => new Checkpoint(c.x, c.y));
    this.movingSpikes = (data.movingSpikes || []).map(m => new MovingSpike(m.x, m.y, m.range, m.speed, m.axis));
    this.extraLives = (data.extraLives || []).map(e => new ExtraLife(e.x, e.y));

    // Dynamic spikes from tiles or definitions
    this.spikes = [];
    if (data.spikes) {
      this.spikes = data.spikes.map(s => new Spike(s.x, s.y, s.dir));
    }
    // Also parse tile-based spikes
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = this.getTile(x, y);
        const px = x * this.tileSize + this.tileSize / 2;
        const py = y * this.tileSize + this.tileSize / 2;
        if (t === 4) this.spikes.push(new Spike(px, py, 'up'));
        if (t === 5) this.spikes.push(new Spike(px, py, 'down'));
        if (t === 6) this.spikes.push(new Spike(px, py, 'left'));
        if (t === 7) this.spikes.push(new Spike(px, py, 'right'));
      }
    }

    this.totalRings = this.rings.length;
    this.waterAnimTime = 0;
  }

  get ringsRemaining() {
    return this.rings.filter(r => !r.collected).length;
  }

  getTile(tx, ty) {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) {
      return 1; // Solid border
    }
    return this.tiles[ty * this.width + tx] || 0;
  }

  setTile(tx, ty, val) {
    if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
      this.tiles[ty * this.width + tx] = val;
    }
  }

  getTileAtPixel(px, py) {
    const tx = Math.floor(px / this.tileSize);
    const ty = Math.floor(py / this.tileSize);
    return this.getTile(tx, ty);
  }

  update(dt, ball, particles) {
    this.waterAnimTime += dt * 2.5;

    // Update rings
    let ringsGathered = 0;
    for (const ring of this.rings) {
      if (ring.update(dt, ball, particles)) {
        ringsGathered++;
      }
    }

    // Check all rings unlocked
    if (this.ringsRemaining === 0 && !this.exitUnlockedPlayed) {
      this.exitUnlockedPlayed = true;
      if (window.soundEngine) window.soundEngine.playGateUnlock();
    }

    // Update pumps
    for (const pump of this.pumps) {
      pump.update(dt, ball, particles);
    }

    // Update checkpoints
    for (const cp of this.checkpoints) {
      cp.update(dt, ball, particles);
    }

    // Update extra lives
    for (const life of this.extraLives) {
      if (life.update(dt, ball, particles)) {
        return { type: '1up' };
      }
    }

    // Update moving spikes
    for (const ms of this.movingSpikes) {
      if (ms.update(dt, ball)) {
        return { type: 'hazard' };
      }
    }

    // Check static spikes
    for (const sp of this.spikes) {
      if (sp.checkCollision(ball)) {
        return { type: 'hazard' };
      }
    }

    // Check exit gate
    if (this.exit.update(dt, ball, this.ringsRemaining)) {
      return { type: 'exit' };
    }

    // Check fallen out of bottom
    if (ball.y > (this.height + 2) * this.tileSize) {
      return { type: 'hazard' };
    }

    return null;
  }

  draw(ctx, viewX, viewY, viewWidth, viewHeight) {
    const minTx = Math.max(0, Math.floor(viewX / this.tileSize));
    const maxTx = Math.min(this.width - 1, Math.ceil((viewX + viewWidth) / this.tileSize));
    const minTy = Math.max(0, Math.floor(viewY / this.tileSize));
    const maxTy = Math.min(this.height - 1, Math.ceil((viewY + viewHeight) / this.tileSize));

    // Draw Parallax / Sky backdrop depending on theme
    this.drawBackground(ctx, viewX, viewY, viewWidth, viewHeight);

    // Draw Tiles
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const t = this.tiles[ty * this.width + tx];
        const px = tx * this.tileSize;
        const py = ty * this.tileSize;

        if (t === 1) {
          // Solid Red / Brown Nokia Brick
          this.drawBrickTile(ctx, px, py);
        } else if (t === 2) {
          // Cracked Brick
          this.drawCrackedTile(ctx, px, py);
        } else if (t === 8) {
          // Trampoline / Spring Pad
          this.drawTrampolineTile(ctx, px, py);
        }
      }
    }

    // Draw Checkpoints
    for (const cp of this.checkpoints) {
      cp.draw(ctx);
    }

    // Draw Pumps
    for (const pump of this.pumps) {
      pump.draw(ctx);
    }

    // Draw Rings
    for (const ring of this.rings) {
      ring.draw(ctx);
    }

    // Draw Static Spikes
    for (const sp of this.spikes) {
      sp.draw(ctx);
    }

    // Draw Moving Spikes
    for (const ms of this.movingSpikes) {
      ms.draw(ctx);
    }

    // Draw Extra Lives
    for (const life of this.extraLives) {
      life.draw(ctx);
    }

    // Draw Exit Gate
    this.exit.draw(ctx, this.ringsRemaining);

    // Draw Water layer (overlayed with transparency & ripples)
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const t = this.tiles[ty * this.width + tx];
        if (t === 3) {
          const px = tx * this.tileSize;
          const py = ty * this.tileSize;
          this.drawWaterTile(ctx, px, py, tx, ty);
        }
      }
    }
  }

  drawBackground(ctx, vx, vy, vw, vh) {
    // Gradient sky
    let skyTop = '#1971c2';
    let skyBottom = '#74c0fc';
    let hillColor = '#2b8a3e';

    if (this.theme === 'sunset') {
      skyTop = '#5c1d4a';
      skyBottom = '#f76707';
      hillColor = '#3b1c32';
    } else if (this.theme === 'aquatic') {
      skyTop = '#0b2b40';
      skyBottom = '#1098ad';
      hillColor = '#083344';
    } else if (this.theme === 'fortress') {
      skyTop = '#1a1b1e';
      skyBottom = '#343a40';
      hillColor = '#212529';
    }

    const grad = ctx.createLinearGradient(0, vy, 0, vy + vh);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(1, skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(vx, vy, vw, vh);

    // Parallax Rolling Hills (classic Nokia Bounce style)
    ctx.fillStyle = hillColor;
    ctx.beginPath();
    ctx.moveTo(vx, vy + vh);
    for (let x = vx - 40; x <= vx + vw + 40; x += 30) {
      const hillY = (this.height * this.tileSize * 0.65) + Math.sin(x * 0.008 + vx * 0.1) * 35;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(vx + vw, vy + vh);
    ctx.closePath();
    ctx.fill();
  }

  drawBrickTile(ctx, x, y) {
    // Classic Nokia red brick pattern
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(x, y, this.tileSize, this.tileSize);

    // Brick mortar lines
    ctx.strokeStyle = '#e57373';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, this.tileSize - 1, this.tileSize - 1);

    // 3D bevel edge highlight
    ctx.fillStyle = '#ef5350';
    ctx.fillRect(x, y, this.tileSize, 2);
    ctx.fillRect(x, y, 2, this.tileSize);

    ctx.fillStyle = '#7f0000';
    ctx.fillRect(x, y + this.tileSize - 2, this.tileSize, 2);
    ctx.fillRect(x + this.tileSize - 2, y, 2, this.tileSize);
  }

  drawCrackedTile(ctx, x, y) {
    // Cracked grey stone brick
    ctx.fillStyle = '#5c677d';
    ctx.fillRect(x, y, this.tileSize, this.tileSize);

    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 2);
    ctx.lineTo(x + 16, y + 15);
    ctx.lineTo(x + 12, y + 28);
    ctx.moveTo(x + 16, y + 15);
    ctx.lineTo(x + 28, y + 18);
    ctx.stroke();

    ctx.strokeStyle = '#8d99ae';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, this.tileSize - 1, this.tileSize - 1);
  }

  drawTrampolineTile(ctx, x, y) {
    // Trampoline frame
    ctx.fillStyle = '#212529';
    ctx.fillRect(x + 2, y + 22, 28, 10);

    // Spring coils
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 22);
    ctx.lineTo(x + 12, y + 14);
    ctx.lineTo(x + 16, y + 22);
    ctx.lineTo(x + 20, y + 14);
    ctx.lineTo(x + 24, y + 22);
    ctx.stroke();

    // Top bouncy pad
    ctx.fillStyle = '#ff922b';
    ctx.fillRect(x + 2, y + 10, 28, 6);
    ctx.fillStyle = '#ffd43b';
    ctx.fillRect(x + 4, y + 11, 24, 2);
  }

  drawWaterTile(ctx, x, y, tx, ty) {
    ctx.fillStyle = 'rgba(24, 100, 171, 0.65)';
    ctx.fillRect(x, y, this.tileSize, this.tileSize);

    // Animated water surface ripple on top edge
    const tileAbove = this.getTile(tx, ty - 1);
    if (tileAbove !== 3) {
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      for (let i = 0; i <= this.tileSize; i += 8) {
        const wave = Math.sin((x + i) * 0.15 + this.waterAnimTime) * 2.5;
        ctx.lineTo(x + i, y + 3 + wave);
      }
      ctx.strokeStyle = '#a5d8ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}

// -------------------------------------------------------------
// PRE-BUILT RETRO NOKIA BOUNCE LEVELS
// -------------------------------------------------------------

function generateMeadowLevel() {
  const w = 48;
  const h = 14;
  const grid = new Array(w * h).fill(0);

  // Helper to fill rectangular areas
  const fill = (x1, y1, x2, y2, tile) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h) grid[y * w + x] = tile;
      }
    }
  };

  // Base floor
  fill(0, 12, 47, 13, 1);
  // Left wall & ceiling
  fill(0, 0, 1, 13, 1);
  fill(0, 0, 47, 0, 1);
  fill(46, 0, 47, 13, 1);

  // Platform 1 (Intro jump)
  fill(6, 10, 10, 10, 1);

  // Platform 2 (Elevated ledge)
  fill(14, 8, 19, 8, 1);

  // Platform 3 & 4 (Stepping stones)
  fill(24, 9, 28, 9, 1);
  fill(32, 7, 37, 7, 1);

  // Spring pad to reach upper ledge
  grid[11 * w + 30] = 8; // Trampoline

  // High ledge
  fill(39, 5, 45, 5, 1);

  return {
    id: 1,
    name: 'Level 1: Emerald Meadow',
    theme: 'meadow',
    width: w,
    height: h,
    tiles: grid,
    spawn: { x: 3 * 32 + 16, y: 11 * 32 },
    exit: { x: 43 * 32 + 16, y: 4 * 32 + 16 },
    rings: [
      { x: 8 * 32 + 16, y: 8 * 32, orientation: 'vertical' },
      { x: 16 * 32 + 16, y: 6 * 32, orientation: 'horizontal' },
      { x: 26 * 32 + 16, y: 7 * 32, orientation: 'vertical' },
      { x: 30 * 32 + 16, y: 4 * 32, orientation: 'vertical' },
      { x: 35 * 32 + 16, y: 5 * 32, orientation: 'horizontal' }
    ],
    checkpoints: [
      { x: 25 * 32 + 16, y: 8 * 32 + 16 }
    ],
    extraLives: [
      { x: 18 * 32 + 16, y: 4 * 32 }
    ]
  };
}

function generateSpikeCanyonLevel() {
  const w = 56;
  const h = 15;
  const grid = new Array(w * h).fill(0);

  const fill = (x1, y1, x2, y2, tile) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h) grid[y * w + x] = tile;
      }
    }
  };

  // Boundaries
  fill(0, 0, 1, 14, 1);
  fill(0, 0, 55, 0, 1);
  fill(54, 0, 55, 14, 1);
  fill(0, 13, 55, 14, 1);

  // Spike pit 1
  fill(8, 13, 15, 13, 1);
  for (let x = 8; x <= 15; x++) grid[12 * w + x] = 4; // Up Spikes

  // Bridge above pit 1
  fill(10, 9, 13, 9, 1);

  // High pillar
  fill(18, 6, 20, 12, 1);

  // Trampoline in pit to launch over pillar
  grid[12 * w + 6] = 8;

  // Mid-chasm floating platforms
  fill(24, 10, 27, 10, 1);
  fill(31, 8, 34, 8, 1);

  // Spike ceiling zone
  fill(28, 1, 38, 2, 1);
  for (let x = 29; x <= 37; x++) grid[3 * w + x] = 5; // Down ceiling spikes

  // Trampoline 2
  grid[12 * w + 38] = 8;

  // Upper chamber
  fill(42, 6, 53, 6, 1);
  // Spike on right wall
  grid[5 * w + 53] = 7;

  return {
    id: 2,
    name: 'Level 2: Spike Canyon',
    theme: 'sunset',
    width: w,
    height: h,
    tiles: grid,
    spawn: { x: 3 * 32, y: 11 * 32 },
    exit: { x: 50 * 32, y: 4 * 32 + 16 },
    rings: [
      { x: 11 * 32 + 16, y: 7 * 32, orientation: 'vertical' },
      { x: 19 * 32 + 16, y: 4 * 32, orientation: 'horizontal' },
      { x: 25 * 32 + 16, y: 8 * 32, orientation: 'vertical' },
      { x: 33 * 32 + 16, y: 6 * 32, orientation: 'vertical' },
      { x: 38 * 32 + 16, y: 2 * 32, orientation: 'horizontal' },
      { x: 45 * 32 + 16, y: 4 * 32, orientation: 'vertical' }
    ],
    checkpoints: [
      { x: 25 * 32 + 16, y: 9 * 32 + 16 }
    ],
    movingSpikes: [
      { x: 33 * 32, y: 11 * 32, range: 48, speed: 70, axis: 'horizontal' }
    ],
    extraLives: [
      { x: 43 * 32, y: 3 * 32 }
    ]
  };
}

function generateAqueductLevel() {
  const w = 60;
  const h = 16;
  const grid = new Array(w * h).fill(0);

  const fill = (x1, y1, x2, y2, tile) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h) grid[y * w + x] = tile;
      }
    }
  };

  // Outer walls
  fill(0, 0, 1, 15, 1);
  fill(0, 0, 59, 0, 1);
  fill(58, 0, 59, 15, 1);
  fill(0, 14, 59, 15, 1);

  // Platform 1
  fill(2, 10, 8, 13, 1);

  // Deep Water Basin 1
  fill(9, 8, 22, 13, 3); // Water filled!

  // Floating stepping stone in water
  fill(15, 9, 16, 9, 1);

  // Mid wall dividing basins
  fill(23, 4, 25, 13, 1);

  // Deflate Narrow Tunnel: 1-tile gap!
  // Ceiling
  fill(26, 9, 36, 10, 1);
  // Floor
  fill(26, 12, 36, 13, 1);
  // Gap at y=11 is only 1 tile!

  // Water Basin 2 with high exit
  fill(37, 7, 48, 13, 3); // Deep water

  // Upper exit ledge
  fill(50, 6, 57, 6, 1);
  fill(50, 7, 51, 13, 1);

  return {
    id: 3,
    name: 'Level 3: Sunken Aqueduct',
    theme: 'aquatic',
    width: w,
    height: h,
    tiles: grid,
    spawn: { x: 3 * 32 + 16, y: 8 * 32 },
    exit: { x: 55 * 32, y: 4 * 32 + 16 },
    pumps: [
      { x: 6 * 32 + 16, y: 9 * 32 + 16, type: 'inflate' },   // Become BIG to float on basin 1!
      { x: 24 * 32 + 16, y: 3 * 32 + 16, type: 'deflate' },  // Become SMALL to enter narrow tunnel!
      { x: 37 * 32 + 16, y: 10 * 32 + 16, type: 'inflate' }, // Become BIG to float across basin 2!
      { x: 49 * 32 + 16, y: 5 * 32 + 16, type: 'normal' }    // Reset to normal
    ],
    rings: [
      { x: 12 * 32 + 16, y: 6 * 32, orientation: 'vertical' },
      { x: 18 * 32 + 16, y: 6 * 32, orientation: 'horizontal' },
      { x: 31 * 32 + 16, y: 11 * 32 + 16, orientation: 'horizontal' }, // Inside tight duct!
      { x: 42 * 32 + 16, y: 5 * 32, orientation: 'vertical' },
      { x: 46 * 32 + 16, y: 4 * 32, orientation: 'horizontal' }
    ],
    checkpoints: [
      { x: 24 * 32 + 16, y: 3 * 32 }
    ],
    extraLives: [
      { x: 15 * 32 + 16, y: 12 * 32 } // Submerged deep in basin 1
    ]
  };
}

function generateFortressLevel() {
  const w = 64;
  const h = 16;
  const grid = new Array(w * h).fill(0);

  const fill = (x1, y1, x2, y2, tile) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h) grid[y * w + x] = tile;
      }
    }
  };

  // Outer bounds
  fill(0, 0, 1, 15, 1);
  fill(0, 0, 63, 0, 1);
  fill(62, 0, 63, 15, 1);
  fill(0, 14, 63, 15, 1);

  // Platform 1
  fill(2, 11, 8, 11, 1);

  // Cracked Wall 1 (requires Big Ball to smash!)
  fill(12, 8, 12, 13, 2); // Cracked wall!

  // Trampoline
  grid[13 * w + 6] = 8;

  // Upper hallway
  fill(13, 8, 26, 8, 1);

  // Moving hazard corridor
  fill(17, 3, 23, 3, 1);
  for (let x = 18; x <= 22; x++) grid[4 * w + x] = 5; // Ceiling spikes

  // Chasm with bounce pad
  fill(27, 14, 38, 14, 1);
  for (let x = 28; x <= 36; x++) grid[13 * w + x] = 4; // Floor spikes
  grid[12 * w + 27] = 8; // Trampoline before pit

  // Suspended blocks
  fill(31, 9, 33, 9, 1);

  // Tower climb
  fill(40, 5, 42, 13, 1);
  grid[13 * w + 38] = 8; // Trampoline over tower

  // Final cracked barrier
  fill(48, 7, 48, 12, 2);

  // Exit platform
  fill(52, 10, 61, 10, 1);

  return {
    id: 4,
    name: 'Level 4: Machinery Bastion',
    theme: 'fortress',
    width: w,
    height: h,
    tiles: grid,
    spawn: { x: 3 * 32 + 16, y: 9 * 32 },
    exit: { x: 57 * 32, y: 8 * 32 + 16 },
    pumps: [
      { x: 5 * 32 + 16, y: 10 * 32 + 16, type: 'inflate' }, // Inflate to smash wall!
      { x: 24 * 32 + 16, y: 7 * 32 + 16, type: 'normal' }
    ],
    rings: [
      { x: 10 * 32 + 16, y: 5 * 32, orientation: 'vertical' },
      { x: 20 * 32 + 16, y: 6 * 32, orientation: 'horizontal' },
      { x: 32 * 32 + 16, y: 7 * 32, orientation: 'vertical' },
      { x: 39 * 32 + 16, y: 3 * 32, orientation: 'horizontal' },
      { x: 45 * 32 + 16, y: 9 * 32, orientation: 'vertical' },
      { x: 53 * 32 + 16, y: 7 * 32, orientation: 'vertical' }
    ],
    checkpoints: [
      { x: 25 * 32 + 16, y: 7 * 32 + 16 }
    ],
    movingSpikes: [
      { x: 20 * 32, y: 6 * 32, range: 64, speed: 85, axis: 'horizontal' },
      { x: 44 * 32, y: 8 * 32, range: 70, speed: 90, axis: 'vertical' }
    ],
    extraLives: [
      { x: 32 * 32 + 16, y: 5 * 32 }
    ]
  };
}

function generateMasterGauntletLevel() {
  const w = 70;
  const h = 18;
  const grid = new Array(w * h).fill(0);

  const fill = (x1, y1, x2, y2, tile) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h) grid[y * w + x] = tile;
      }
    }
  };

  // Boundaries
  fill(0, 0, 1, 17, 1);
  fill(0, 0, 69, 0, 1);
  fill(68, 0, 69, 17, 1);
  fill(0, 16, 69, 17, 1);

  // Start zone
  fill(2, 13, 7, 13, 1);

  // Trampoline into size switch
  grid[15 * w + 8] = 8;

  // Narrow spike corridor
  fill(12, 10, 22, 10, 1);
  fill(12, 7, 22, 7, 1);
  for (let x = 14; x <= 20; x++) grid[8 * w + x] = 5; // Down spikes

  // Water canyon with sunken rings
  fill(25, 9, 38, 15, 3); // Deep water

  // Trampoline out of water canyon
  grid[15 * w + 39] = 8;

  // Upper spike-trapped ledges
  fill(42, 6, 46, 6, 1);
  grid[5 * w + 44] = 4; // Floor spike on ledge

  fill(49, 8, 54, 8, 1);

  // Final cracked walls guarding the portal
  fill(58, 6, 58, 15, 2); // Double thick cracked wall!
  fill(59, 6, 59, 15, 2);

  // Final exit platform
  fill(61, 12, 67, 12, 1);

  return {
    id: 5,
    name: 'Level 5: The Ultimate Gauntlet',
    theme: 'sunset',
    width: w,
    height: h,
    tiles: grid,
    spawn: { x: 3 * 32 + 16, y: 11 * 32 },
    exit: { x: 65 * 32, y: 10 * 32 + 16 },
    pumps: [
      { x: 10 * 32 + 16, y: 9 * 32 + 16, type: 'deflate' },  // Deflate to pass narrow spike corridor!
      { x: 23 * 32 + 16, y: 8 * 32 + 16, type: 'inflate' },  // Inflate to float on water!
      { x: 41 * 32 + 16, y: 14 * 32 + 16, type: 'normal' }, // Normal
      { x: 52 * 32 + 16, y: 7 * 32 + 16, type: 'inflate' }   // Inflate to smash double cracked wall!
    ],
    rings: [
      { x: 17 * 32 + 16, y: 9 * 32, orientation: 'horizontal' },
      { x: 28 * 32 + 16, y: 11 * 32, orientation: 'vertical' },
      { x: 34 * 32 + 16, y: 12 * 32, orientation: 'horizontal' },
      { x: 39 * 32 + 16, y: 4 * 32, orientation: 'vertical' },
      { x: 47 * 32 + 16, y: 5 * 32, orientation: 'horizontal' },
      { x: 51 * 32 + 16, y: 6 * 32, orientation: 'vertical' },
      { x: 63 * 32 + 16, y: 10 * 32, orientation: 'vertical' }
    ],
    checkpoints: [
      { x: 23 * 32 + 16, y: 7 * 32 + 16 },
      { x: 50 * 32 + 16, y: 7 * 32 + 16 }
    ],
    movingSpikes: [
      { x: 30 * 32, y: 8 * 32, range: 60, speed: 90, axis: 'horizontal' },
      { x: 45 * 32, y: 10 * 32, range: 60, speed: 100, axis: 'vertical' }
    ],
    extraLives: [
      { x: 31 * 32, y: 14 * 32 },
      { x: 43 * 32, y: 4 * 32 }
    ]
  };
}

const DEFAULT_LEVELS = [
  generateMeadowLevel(),
  generateSpikeCanyonLevel(),
  generateAqueductLevel(),
  generateFortressLevel(),
  generateMasterGauntletLevel()
];

window.Level = Level;
window.DEFAULT_LEVELS = DEFAULT_LEVELS;
