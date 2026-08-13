const NOTE = {
  G3: 196.0,
  A4: 440.0,
  B3: 246.94,
  C5: 523.25,
  D4: 293.66,
  D5: 587.33,
  E5: 659.25,
  F4: 349.23,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
};

export class NoxEatAudio {
  constructor() {
    this.ctx = null;
    this.musicTimer = null;
    this.stepIndex = 0;
    this.melody = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.E5, NOTE.F5, NOTE.G5, NOTE.E5, NOTE.C5];
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
      this.blip(note, 0, 0.09, 'square', 0.04);
      this.stepIndex += 1;
    }, 190);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playCard() {
    this.ensure();
    const sequence = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
    sequence.forEach((note, index) => {
      this.blip(note, index * 0.11, 0.16, 'triangle', 0.09);
    });
  }

  playEat() {
    this.ensure();
    this.blip(NOTE.G5, 0, 0.055, 'square', 0.035);
  }

  playEnemy() {
    this.ensure();
    this.blip(NOTE.A5, 0, 0.05, 'square', 0.05);
  }

  playHit() {
    this.ensure();
    const sequence = [NOTE.G5, NOTE.D5, NOTE.A4];
    sequence.forEach((note, index) => {
      this.blip(note, index * 0.1, 0.14, 'sawtooth', 0.07);
    });
  }

  playGrowl() {
    this.ensure();
    if (!this.ctx) return;
    const start = this.ctx.currentTime;
    const duration = 0.9;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, start);
    osc.frequency.exponentialRampToValueAtTime(55, start + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 26;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 14;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    lfo.start(start);
    osc.stop(start + duration + 0.05);
    lfo.stop(start + duration + 0.05);
  }

  playGameOver() {
    this.ensure();
    if (!this.ctx) return;
    const sequence = [NOTE.G5, NOTE.E5, NOTE.C5, NOTE.A4, NOTE.F4, NOTE.D4, NOTE.B3, NOTE.G3];
    sequence.forEach((note, index) => {
      this.blip(note, index * 0.17, 0.2, 'square', 0.09);
    });
    this.blip(NOTE.G3, sequence.length * 0.17, 0.7, 'square', 0.1);
  }
}
