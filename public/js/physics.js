/**
 * Nokia Bounce - Physics Engine & Ball Mechanics
 * Handles continuous collision resolution, squash & stretch, size morphing, and water buoyancy.
 */

const SIZES = {
  normal: { radius: 14, mass: 1.0, jumpForce: -360, maxSpeed: 230 },
  big:    { radius: 22, mass: 1.8, jumpForce: -410, maxSpeed: 210 },
  small:  { radius: 8,  mass: 0.6, jumpForce: -320, maxSpeed: 250 }
};

class Ball {
  constructor(x, y) {
    this.spawnX = x;
    this.spawnY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;

    this.sizeState = 'normal';
    this.radius = SIZES.normal.radius;
    this.targetRadius = SIZES.normal.radius;

    // Visual squash & stretch deformation
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.squashVelocityX = 0;
    this.squashVelocityY = 0;

    // Rotation for rolling
    this.rotation = 0;

    // Flags
    this.onGround = false;
    this.inWater = false;
    this.isDead = false;
    this.invincible = false;
    this.cheatActive = false;
    this.jumpCooldown = 0;
    this.submergedDepth = 0;

    // Jump buffering & Coyote time for responsive Up Arrow controls
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.chargeBoost = 0;
  }

  reset(x, y) {
    this.x = x !== undefined ? x : this.spawnX;
    this.y = y !== undefined ? y : this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.setSize('normal');
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.rotation = 0;
    this.onGround = false;
    this.inWater = false;
    this.isDead = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.chargeBoost = 0;
  }

  setSize(size) {
    if (!SIZES[size]) return;
    this.sizeState = size;
    this.targetRadius = SIZES[size].radius;
  }

  applySquash(sx, sy) {
    this.scaleX = sx;
    this.scaleY = sy;
  }

  update(dt, input, level, particles) {
    if (this.isDead) return;

    // Smooth size morphing
    this.radius += (this.targetRadius - this.radius) * Math.min(1, dt * 10);

    // Spring damping for squash & stretch back to 1.0
    const springK = 180;
    const damping = 12;

    const fx = -springK * (this.scaleX - 1.0) - damping * this.squashVelocityX;
    this.squashVelocityX += fx * dt;
    this.scaleX += this.squashVelocityX * dt;

    const fy = -springK * (this.scaleY - 1.0) - damping * this.squashVelocityY;
    this.squashVelocityY += fy * dt;
    this.scaleY += this.squashVelocityY * dt;

    // Constrain scale to reasonable range
    this.scaleX = Math.max(0.6, Math.min(1.4, this.scaleX));
    this.scaleY = Math.max(0.6, Math.min(1.4, this.scaleY));

    // Jump cooldown
    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;

    const currentProfile = SIZES[this.sizeState];
    const speedMultiplier = this.cheatActive ? 1.4 : 1.0;
    const accel = 1200 * speedMultiplier;
    const maxSpeed = currentProfile.maxSpeed * speedMultiplier;

    // Horizontal Input
    if (input.left) {
      this.vx -= accel * dt;
    } else if (input.right) {
      this.vx += accel * dt;
    } else {
      // Natural deceleration
      const friction = this.onGround ? (this.inWater ? 0.85 : 0.88) : 0.96;
      this.vx *= Math.pow(friction, dt * 60);
      if (Math.abs(this.vx) < 4) this.vx = 0;
    }

    // Clamp horizontal speed
    this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));

    // Rolling rotation based on speed
    this.rotation += (this.vx / this.radius) * dt * 2.8;

    // Water state detection
    const wasInWater = this.inWater;
    const tileUnderBall = level.getTileAtPixel(this.x, this.y);
    this.inWater = (tileUnderBall === 3); // 3 = Water

    if (this.inWater && !wasInWater) {
      // Just entered water
      if (window.soundEngine) window.soundEngine.playSplash();
      if (particles) particles.createSplash(this.x, this.y, 14);
      this.vx *= 0.6;
      this.vy *= 0.4;
    } else if (!this.inWater && wasInWater) {
      // Just exited water
      if (window.soundEngine) window.soundEngine.playSplash();
      if (particles) particles.createSplash(this.x, this.y, 8);
    }

    // Gravity & Buoyancy
    const baseGravity = 920;
    if (this.inWater) {
      // Buoyancy based on ball size
      let buoyancyAccel = 0;
      if (this.sizeState === 'big') {
        buoyancyAccel = -1600; // Floats vigorously!
      } else if (this.sizeState === 'normal') {
        buoyancyAccel = -400;  // Slightly floats or neutral
      } else {
        buoyancyAccel = 150;   // Small ball sinks!
      }

      this.vy += (baseGravity * 0.3 + buoyancyAccel) * dt;
      // High water drag
      this.vy *= Math.pow(0.82, dt * 60);
      this.vx *= Math.pow(0.85, dt * 60);

      // In water: UP swims upward, DOWN dives downward
      if ((input.up || input.jump) && this.jumpCooldown <= 0) {
        this.vy = this.sizeState === 'big' ? -300 : -240;
        this.jumpCooldown = 0.2;
        this.applySquash(0.85, 1.2);
        if (particles) particles.createBubbles(this.x, this.y, 4);
        if (window.soundEngine) window.soundEngine.playBounce(1.5);
      } else if (input.down) {
        this.vy += 800 * dt; // Fast dive in water
        if (particles && Math.random() < 0.25) particles.createBubbles(this.x, this.y, 2);
      }
    } else {
      // Standard airborne / ground gravity
      this.vy += baseGravity * dt;

      // DOWN ARROW in air: fast dive / ground pound downward
      if (input.down) {
        if (!this.onGround && this.coyoteTimer <= 0) {
          this.vy += 1500 * dt; // Fast ground pound dive
          this.applySquash(0.8, 1.25);
        } else {
          // On ground: crouch squash and slide
          this.applySquash(1.35, 0.65);
          this.vx *= 0.92;
          this.chargeBoost = Math.min(1.4, this.chargeBoost + dt * 2.5);
        }
      } else {
        if (this.chargeBoost > 0) {
          this.chargeBoost -= dt * 2.0;
          if (this.chargeBoost < 0) this.chargeBoost = 0;
        }
      }

      // Terminal velocity
      this.vy = Math.min(850, this.vy);
    }

    // Up Arrow / Jump buffer handling
    if (input.up || input.jump) {
      this.jumpBufferTimer = 0.2; // 200ms jump buffer
    } else {
      this.jumpBufferTimer -= dt;
    }

    if (this.onGround) {
      this.coyoteTimer = 0.18; // 180ms coyote time
    } else {
      this.coyoteTimer -= dt;
    }

    // Execute jump if requested and grounded (or coyote time, or cheat active)
    const canJump = (this.coyoteTimer > 0 || this.onGround || this.cheatActive);
    if ((this.jumpBufferTimer > 0 || input.up || input.jump) && canJump && this.jumpCooldown <= 0) {
      const boost = 1.0 + (this.chargeBoost || 0);
      const jumpImpulse = currentProfile.jumpForce * (this.cheatActive ? 1.2 : 1.0) * boost;
      this.vy = jumpImpulse;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.chargeBoost = 0;
      this.jumpCooldown = 0.18;
      this.applySquash(0.7, 1.4); // Snappy stretch on jump!
      if (window.soundEngine) window.soundEngine.playBounce(3);
      if (particles) particles.createDust(this.x, this.y + this.radius, 4);
    }

    // Move & Resolve Collisions
    this.moveAndCollide(dt, level, particles);
  }

  moveAndCollide(dt, level, particles) {
    const substeps = 4;
    const subDt = dt / substeps;
    let groundedAnySubstep = false;

    for (let step = 0; step < substeps; step++) {
      // 1. Move horizontally
      this.x += this.vx * subDt;
      this.resolveHorizontalCollisions(level, particles);

      // 2. Move vertically
      this.y += this.vy * subDt;
      if (this.resolveVerticalCollisions(level, particles)) {
        groundedAnySubstep = true;
      }
    }

    // Check if resting right on top of a solid tile (within 3px)
    if (!groundedAnySubstep) {
      const tileBelowLeft = level.getTileAtPixel(this.x - this.radius * 0.5, this.y + this.radius + 3);
      const tileBelowRight = level.getTileAtPixel(this.x + this.radius * 0.5, this.y + this.radius + 3);
      if (tileBelowLeft === 1 || tileBelowLeft === 2 || tileBelowRight === 1 || tileBelowRight === 2) {
        groundedAnySubstep = true;
      }
    }

    this.onGround = groundedAnySubstep;
    if (this.onGround) {
      this.coyoteTimer = 0.18;
    }
  }

  resolveHorizontalCollisions(level, particles) {
    const tileSize = level.tileSize;
    const minTileX = Math.floor((this.x - this.radius) / tileSize);
    const maxTileX = Math.floor((this.x + this.radius) / tileSize);
    const minTileY = Math.floor((this.y - this.radius * 0.8) / tileSize);
    const maxTileY = Math.floor((this.y + this.radius * 0.8) / tileSize);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tile = level.getTile(tx, ty);

        // Cracked block smash check
        if (tile === 2 && this.sizeState === 'big' && Math.abs(this.vx) > 160) {
          level.setTile(tx, ty, 0); // Shatter block!
          if (particles) particles.createDebris(tx * tileSize + tileSize / 2, ty * tileSize + tileSize / 2);
          if (window.soundEngine) window.soundEngine.playPop();
          continue;
        }

        // Solid tiles (1 = brick, 2 = cracked brick)
        if (tile === 1 || tile === 2) {
          const tileLeft = tx * tileSize;
          const tileRight = (tx + 1) * tileSize;

          if (this.vx > 0) { // Moving right
            const overlap = (this.x + this.radius) - tileLeft;
            if (overlap > 0 && overlap < this.radius * 1.5) {
              this.x = tileLeft - this.radius;
              if (Math.abs(this.vx) > 100) {
                this.applySquash(0.7, 1.25);
                if (window.soundEngine) window.soundEngine.playBounce(Math.abs(this.vx) * 0.03);
              }
              this.vx = -this.vx * 0.35; // Slight wall bounce
            }
          } else if (this.vx < 0) { // Moving left
            const overlap = tileRight - (this.x - this.radius);
            if (overlap > 0 && overlap < this.radius * 1.5) {
              this.x = tileRight + this.radius;
              if (Math.abs(this.vx) > 100) {
                this.applySquash(0.7, 1.25);
                if (window.soundEngine) window.soundEngine.playBounce(Math.abs(this.vx) * 0.03);
              }
              this.vx = -this.vx * 0.35;
            }
          }
        }
      }
    }
  }

  resolveVerticalCollisions(level, particles) {
    const tileSize = level.tileSize;
    const minTileX = Math.floor((this.x - this.radius * 0.75) / tileSize);
    const maxTileX = Math.floor((this.x + this.radius * 0.75) / tileSize);
    const minTileY = Math.floor((this.y - this.radius) / tileSize);
    const maxTileY = Math.floor((this.y + this.radius) / tileSize);

    let foundGround = false;

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tile = level.getTile(tx, ty);

        // Cracked block smash check downwards
        if (tile === 2 && this.sizeState === 'big' && this.vy > 240) {
          level.setTile(tx, ty, 0); // Shatter block!
          if (particles) particles.createDebris(tx * tileSize + tileSize / 2, ty * tileSize + tileSize / 2);
          if (window.soundEngine) window.soundEngine.playPop();
          this.vy *= 0.5;
          continue;
        }

        // Trampoline / Spring pad (tile 8)
        if (tile === 8) {
          const tileTop = ty * tileSize;
          if (this.vy > 0 && (this.y + this.radius) >= tileTop && (this.y - this.radius) < tileTop) {
            this.y = tileTop - this.radius;
            // Super high spring launch!
            this.vy = -680;
            this.applySquash(1.45, 0.55);
            if (window.soundEngine) window.soundEngine.playSpring();
            if (particles) particles.createSpringPuff(this.x, tileTop);
            continue;
          }
        }

        // Solid block collisions (1 = brick, 2 = cracked brick)
        if (tile === 1 || tile === 2) {
          const tileTop = ty * tileSize;
          const tileBottom = (ty + 1) * tileSize;

          if (this.vy > 0) { // Falling downwards
            const overlap = (this.y + this.radius) - tileTop;
            if (overlap > 0 && overlap < this.radius * 1.5) {
              this.y = tileTop - this.radius;
              foundGround = true;

              // Elastic bounce on ground
              const impactSpeed = this.vy;
              if (impactSpeed > 140) {
                // Natural rubber bounce elasticity
                const elasticity = 0.42;
                this.vy = -impactSpeed * elasticity;
                // Squash effect proportional to impact
                const squashAmount = Math.min(0.4, impactSpeed / 900);
                this.applySquash(1.0 + squashAmount, 1.0 - squashAmount);
                if (window.soundEngine) window.soundEngine.playBounce(impactSpeed * 0.02);
                if (particles && impactSpeed > 260) particles.createDust(this.x, this.y + this.radius, 3);
              } else {
                this.vy = 0;
              }
            }
          } else if (this.vy < 0) { // Moving upwards / hitting ceiling
            const overlap = tileBottom - (this.y - this.radius);
            if (overlap > 0 && overlap < this.radius * 1.5) {
              this.y = tileBottom + this.radius;
              if (Math.abs(this.vy) > 100) {
                this.applySquash(1.3, 0.7);
                if (window.soundEngine) window.soundEngine.playBounce(Math.abs(this.vy) * 0.02);
              }
              this.vy = 0;
            }
          }
        }
      }
    }

    return foundGround;
  }
}

window.Ball = Ball;
window.SIZES = SIZES;
