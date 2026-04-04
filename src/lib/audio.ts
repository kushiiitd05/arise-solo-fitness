/**
 * ARISE: SYSTEM AUDIO ENGINE
 * Uses Web Audio API to synthesize "System" sounds without external assets.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.3; // System volume 30%
    this.initialized = true;
  }

  private beep(freq: number, type: OscillatorType, duration: number, volume = 1) {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // SOUND PRESETS

  /** Standard UI click */
  playClick() {
    this.beep(800, "sine", 0.1, 0.5);
  }

  /** Error or rejection sound */
  playError() {
    this.beep(150, "sawtooth", 0.3, 0.4);
    setTimeout(() => this.beep(100, "sawtooth", 0.4, 0.4), 100);
  }

  /** Success or level up sound */
  playSuccess() {
    const sequence = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    sequence.forEach((freq, i) => {
      setTimeout(() => this.beep(freq, "sine", 0.4, 0.6), i * 100);
    });
  }

  /** Rank up (Majestic) */
  playRankUp() {
    const sequence = [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5]; // C4 major sequence
    sequence.forEach((freq, i) => {
      setTimeout(() => this.beep(freq, "triangle", 0.6, 0.8), i * 80);
    });
  }

  /** Mana usage / magic effect */
  playMana() {
    if (!this.ctx || !this.masterGain) return;
    this.beep(1200, "sine", 0.8, 0.3);
    // Add frequency sweep for "magic" feel
  }

  /** Dungeon entry sound */
  playDungeon() {
    this.beep(60, "sine", 1.0, 1.0);
    setTimeout(() => this.beep(120, "sine", 0.5, 0.8), 200);
  }
}

export const systemAudio = typeof window !== "undefined" ? new AudioEngine() : null;
