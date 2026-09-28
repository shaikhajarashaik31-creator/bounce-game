/**
 * Nokia Bounce - Procedural Web Audio Engine
 * Self-contained synthesizer replicating classic retro 8-bit sound chip & Nokia melodies.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.volume = 0.5;
    this.bgmVolume = 0.28;
    this.initialized = false;
    this.currentTrack = 'dhoom'; // Default to Dhoom Machale!
  }

  init() {
    if (this.initialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.isMuted;
  }

  // --- Sound Effects ---

  // Classic rubbery bounce sound with dynamic pitch based on impact speed
  playBounce(intensity = 1) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = 140 + Math.min(intensity * 12, 100);
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, t + 0.12);

    gain.gain.setValueAtTime(this.volume * Math.min(0.8, 0.3 + intensity * 0.05), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // High-tension trampoline spring sound
  playSpring() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(720, t + 0.18);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.28);

    gain.gain.setValueAtTime(this.volume * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  // Golden ring collection chime (sweet high Nokia two-tone ding)
  playRingCollect() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // First high note (E6: 1318 Hz)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1318.5, t);
    gain1.gain.setValueAtTime(this.volume * 0.35, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.16);

    // Second note (B6: 1975 Hz)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1975.5, t + 0.08);
    gain2.gain.setValueAtTime(this.volume * 0.4, t + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.28);
  }

  // Ball pop / burst when touching spikes
  playPop() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Burst noise
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(3, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);

    // Low sub thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
    oscGain.gain.setValueAtTime(this.volume * 0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Air pump inflate / deflate sound
  playPump(isInflate = true) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    if (isInflate) {
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(650, t + 0.25);
    } else {
      osc.frequency.setValueAtTime(650, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.25);
    }

    gain.gain.setValueAtTime(this.volume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  // Water splash sound
  playSplash() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // Checkpoint reached
  playCheckpoint() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      gain.gain.setValueAtTime(this.volume * 0.3, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.2);
    });
  }

  // All rings collected / Exit gate unlocks!
  playGateUnlock() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(this.volume * 0.3, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.25);
    });
  }

  // Level Complete fanfare
  playLevelComplete() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Classic triumphant Nokia arcade victory tune
    const melody = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 1046.5, d: 0.22 }, // C6
      { f: 880.00, d: 0.12 }, // A5
      { f: 1046.5, d: 0.35 }  // C6
    ];

    let offset = 0;
    melody.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, t + offset);
      gain.gain.setValueAtTime(this.volume * 0.35, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + note.d);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + note.d + 0.02);
      offset += note.d + 0.03;
    });
  }

  // Game Over jingle
  playGameOver() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const melody = [
      { f: 493.88, d: 0.2 }, // B4
      { f: 466.16, d: 0.2 }, // Bb4
      { f: 440.00, d: 0.2 }, // A4
      { f: 415.30, d: 0.45 } // Ab4
    ];

    let offset = 0;
    melody.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.f, t + offset);
      gain.gain.setValueAtTime(this.volume * 0.35, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + note.d);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + note.d + 0.02);
      offset += note.d + 0.04;
    });
  }

  // Cheat code activation jingle (787898)
  playCheat() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [330, 440, 550, 660, 880, 1100, 1320];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.05);
      gain.gain.setValueAtTime(this.volume * 0.4, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.16);
    });
  }

  // --- Drum / Percussion Synthesizers for BGM Beats ---
  playSynthKick(t) {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(155, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.11);
    gain.gain.setValueAtTime(this.bgmVolume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  playSynthSnare(t) {
    if (this.isMuted || !this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(2.2, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.bgmVolume * 0.42, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  playSynthHiHat(t, open = false) {
    if (this.isMuted || !this.ctx) return;
    const dur = open ? 0.09 : 0.035;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.015));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.bgmVolume * 0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  // --- Track Selection & Background Music (BGM) ---
  setTrack(trackName) {
    this.currentTrack = trackName;
    if (this.bgmPlaying) {
      this.stopBGM();
      this.startBGM();
    }
    return this.currentTrack;
  }

  toggleTrack() {
    const next = this.currentTrack === 'dhoom' ? 'classic' : 'dhoom';
    return this.setTrack(next);
  }

  startBGM() {
    if (this.bgmPlaying || this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.bgmPlaying = true;

    if (this.currentTrack === 'dhoom') {
      this.startDhoomMachale();
    } else {
      this.startClassicBGM();
    }
  }

  // --- 1. DHOOM MACHALE (Blockbuster Nokia Dance Remix) ---
  startDhoomMachale() {
    const tempo = 130; // Energetic Bollywood Dance BPM
    const stepDuration = 60 / tempo / 4; // 16th note (~115ms)

    // Note frequencies in D minor
    const N = {
      D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, C4: 261.63,
      D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, Bb4: 466.16, C5: 523.25,
      Cs5: 554.37, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
      REST: 0
    };

    // 64-step iconic "DHOOM MACHALE" Lead Melody
    const dhoomLead = [
      // Bar 1: "DHOOM... ma-cha-le"
      N.D5, N.D5, N.D5, N.REST,  N.C5, N.Bb4, N.A4, N.G4,
      N.D5, N.D5, N.D5, N.REST,  N.C5, N.Bb4, N.A4, N.G4,

      // Bar 2: "DHOOM... dhoom machale dhoom!"
      N.D5, N.D5, N.F5, N.E5,    N.D5, N.Cs5, N.D5, N.D5,
      N.REST, N.D5, N.D5, N.C5,  N.Bb4, N.A4, N.G4, N.A4,

      // Bar 3: "Ishq ishq karna hai kar le..."
      N.F5, N.F5, N.E5, N.D5,    N.E5, N.E5, N.D5, N.C5,
      N.F5, N.F5, N.E5, N.D5,    N.G5, N.F5, N.E5, N.D5,

      // Bar 4: "Koi toh jadoo chalne de... DHOOM!"
      N.A5, N.G5, N.F5, N.E5,    N.D5, N.E5, N.F5, N.E5,
      N.D5, N.Cs5, N.D5, N.D5,   N.D5, N.F5, N.D5, N.REST
    ];

    // Driving Synth Bassline
    const dhoomBass = [
      // Bar 1
      N.D3, N.REST, N.D3, N.D3,  N.F3, N.REST, N.G3, N.G3,
      N.A3, N.REST, N.A3, N.A3,  N.G3, N.F3, N.E3, N.D3,
      // Bar 2
      N.D3, N.REST, N.D3, N.D3,  N.F3, N.REST, N.G3, N.G3,
      N.A3, N.REST, N.A3, N.A3,  N.G3, N.F3, N.E3, N.D3,
      // Bar 3
      N.Bb3, N.REST, N.Bb3, N.Bb3, N.C4, N.REST, N.C4, N.C4,
      N.D3, N.REST, N.D3, N.D3,    N.F3, N.G3, N.A3, N.G3,
      // Bar 4
      N.Bb3, N.REST, N.Bb3, N.Bb3, N.C4, N.REST, N.C4, N.C4,
      N.D3, N.D3, N.D3, N.D3,      N.D3, N.REST, N.D3, N.REST
    ];

    let currentStep = 0;

    const playDhoomStep = () => {
      if (!this.bgmPlaying || this.isMuted || !this.ctx || this.currentTrack !== 'dhoom') return;

      const t = this.ctx.currentTime;
      const stepIdx = currentStep % dhoomLead.length;
      const leadNote = dhoomLead[stepIdx];
      const bassNote = dhoomBass[stepIdx];
      const beat16 = stepIdx % 16;

      // 1. Synth Drums (Punchy Bollywood Dance Groove)
      // Kick: step 0, 8, 10
      if (beat16 === 0 || beat16 === 8 || beat16 === 10) {
        this.playSynthKick(t);
      }
      // Snare: step 4, 12
      if (beat16 === 4 || beat16 === 12) {
        this.playSynthSnare(t);
      }
      // Hi-hats: on all even steps (8th notes), open on step 14
      if (beat16 % 2 === 0) {
        this.playSynthHiHat(t, beat16 === 14);
      }

      // 2. Play Lead Synth (Square / Saw Wave)
      if (leadNote !== N.REST) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(leadNote, t);

        // Subtle vibrato
        const vib = this.ctx.createOscillator();
        const vibGain = this.ctx.createGain();
        vib.frequency.setValueAtTime(6.5, t);
        vibGain.gain.setValueAtTime(4.0, t);
        vib.connect(osc.frequency);
        vib.start(t);
        vib.stop(t + stepDuration * 1.8);

        gain.gain.setValueAtTime(this.bgmVolume * 0.38, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + stepDuration * 1.7);
      }

      // 3. Play Synth Bass (Warm Triangle)
      if (bassNote !== N.REST) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bassNote, t);
        bGain.gain.setValueAtTime(this.bgmVolume * 0.48, t);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.8);
        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(t);
        bOsc.stop(t + stepDuration * 1.9);
      }

      currentStep++;
      this.bgmTimer = setTimeout(playDhoomStep, stepDuration * 1000);
    };

    playDhoomStep();
  }

  // --- 2. CLASSIC BOUNCE BGM (Original 8-bit Nokia Chiptune) ---
  startClassicBGM() {
    const tempo = 136;
    const stepDuration = 60 / tempo / 4;

    const N = {
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
      C6: 1046.50, REST: 0
    };

    const leadPattern = [
      N.E5, N.REST, N.G5, N.REST, N.C6, N.REST, N.B5, N.A5,
      N.G5, N.REST, N.E5, N.REST, N.F5, N.G5, N.E5, N.D5,
      N.C5, N.REST, N.E5, N.G5, N.C6, N.REST, N.D6, N.C6,
      N.B5, N.G5, N.A5, N.B5, N.C6, N.REST, N.REST, N.REST
    ];

    const bassPattern = [
      N.C4, N.REST, N.C4, N.REST, N.A4, N.REST, N.A4, N.REST,
      N.F4, N.REST, N.F4, N.REST, N.G4, N.REST, N.G4, N.REST,
      N.C4, N.REST, N.C4, N.REST, N.A4, N.REST, N.A4, N.REST,
      N.F4, N.REST, N.G4, N.REST, N.C4, N.REST, N.C4, N.REST
    ];

    let currentStep = 0;

    const playLoopStep = () => {
      if (!this.bgmPlaying || this.isMuted || !this.ctx || this.currentTrack !== 'classic') return;

      const t = this.ctx.currentTime;
      const leadNote = leadPattern[currentStep % leadPattern.length];
      const bassNote = bassPattern[currentStep % bassPattern.length];

      if (leadNote !== N.REST) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(leadNote, t);
        gain.gain.setValueAtTime(this.bgmVolume * 0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + stepDuration * 1.6);
      }

      if (bassNote !== N.REST) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bassNote / 2, t);
        bGain.gain.setValueAtTime(this.bgmVolume * 0.4, t);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 2);
        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(t);
        bOsc.stop(t + stepDuration * 2.1);
      }

      currentStep++;
      this.bgmTimer = setTimeout(playLoopStep, stepDuration * 1000);
    };

    playLoopStep();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// Global instance
window.soundEngine = new SoundEngine();
