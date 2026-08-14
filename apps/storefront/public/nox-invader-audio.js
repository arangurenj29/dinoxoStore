const NOTE = {
  G2: 98.0,
  A2: 110.0,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
};

export class NoxInvaderAudio {
  constructor() {
    this.ctx = null;
    this.musicTimer = null;
    this.stepIndex = 0;
    this.melody = [
      NOTE.A3,
      NOTE.A3,
      NOTE.C4,
      NOTE.A3,
      NOTE.G3,
      NOTE.G3,
      NOTE.A3,
      NOTE.B3,
      NOTE.A3,
      NOTE.F3,
      NOTE.E3,
      NOTE.D3,
      NOTE.E3,
      NOTE.F3,
      NOTE.G3,
      NOTE.G3,
    ];
  }

  ensure() {
    if (!this.ctx) {
      const anyWindow = /** @type {any} */ (window);
      const AudioContextClass =
        anyWindow.AudioContext || anyWindow.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  blip(freq, when, duration, type = 'square', volume = 0.05) {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  startMusic() {
    this.ensure();
    if (this.musicTimer || !this.ctx) return;
    this.stepIndex = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx) return;
      const note = this.melody[this.stepIndex % this.melody.length];
      this.blip(note, 0, 0.08, 'square', 0.035);
      this.stepIndex += 1;
    }, 170);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playShot() {
    this.ensure();
    this.blip(NOTE.C5, 0, 0.045, 'square', 0.02);
  }

  playExplosion() {
    this.ensure();
    if (!this.ctx) return;
    const start = this.ctx.currentTime;
    const duration = 0.22;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, start);
    osc.frequency.exponentialRampToValueAtTime(45, start + duration);
    gain.gain.setValueAtTime(0.09, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  playHit() {
    this.ensure();
    const sequence = [NOTE.G4, NOTE.D4, NOTE.A3];
    sequence.forEach((note, index) => {
      this.blip(note, index * 0.09, 0.12, 'sawtooth', 0.06);
    });
  }

  playBoss() {
    this.ensure();
    if (!this.ctx) return;
    const start = this.ctx.currentTime;
    const duration = 1;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, start);
    osc.frequency.exponentialRampToValueAtTime(50, start + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.13, start + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 22;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 16;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    lfo.start(start);
    osc.stop(start + duration + 0.05);
    lfo.stop(start + duration + 0.05);
  }

  playVictory() {
    this.ensure();
    const sequence = [
      NOTE.C4,
      NOTE.E4,
      NOTE.G4,
      NOTE.C5,
      NOTE.E5,
      NOTE.G5,
      NOTE.C6,
      NOTE.G5,
      NOTE.E5,
      NOTE.C6,
    ];
    sequence.forEach((note, index) => {
      this.blip(note, index * 0.12, 0.18, 'triangle', 0.09);
    });
  }

  playGameOver() {
    this.ensure();
    const sequence = [
      NOTE.G4,
      NOTE.E4,
      NOTE.C4,
      NOTE.A3,
      NOTE.F3,
      NOTE.D3,
      NOTE.B2,
      NOTE.G2,
    ];
    sequence.forEach((note, index) => {
      this.blip(note, index * 0.16, 0.2, 'square', 0.08);
    });
    this.blip(NOTE.G2, sequence.length * 0.16, 0.7, 'square', 0.09);
  }
}
