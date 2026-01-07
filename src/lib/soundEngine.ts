// Procedural UI Sound Engine using Web Audio API
// Generates original sounds without external audio files

type SoundType = 
  | 'palette_open' 
  | 'palette_close' 
  | 'pixel_select' 
  | 'pixel_deselect' 
  | 'paint_commit'
  | 'wallet_connect'
  | 'defend_success'
  | 'attack_success'
  | 'reinforce_success';

const STORAGE_KEY = 'bitplace_sound_enabled';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private initialized: boolean = false;

  constructor() {
    // Load preference from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    this.enabled = stored === null ? true : stored === 'true';
  }

  private init(): AudioContext | null {
    if (this.ctx) return this.ctx;
    
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
      return this.ctx;
    } catch (e) {
      console.warn('[SoundEngine] Web Audio not supported');
      return null;
    }
  }

  // Ensure context is initialized (call on first user gesture)
  public warmUp(): void {
    if (!this.initialized) {
      this.init();
    }
  }

  public play(sound: SoundType): void {
    if (!this.enabled) return;
    
    const ctx = this.init();
    if (!ctx) return;

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    switch (sound) {
      case 'palette_open':
        this.playSweep(ctx, now, 200, 400, 0.08, 0.08);
        break;
      case 'palette_close':
        this.playSweep(ctx, now, 400, 200, 0.06, 0.06);
        break;
      case 'pixel_select':
        this.playClick(ctx, now, 800, 0.03, 0.1);
        break;
      case 'pixel_deselect':
        this.playClick(ctx, now, 400, 0.025, 0.08);
        break;
      case 'paint_commit':
        this.playPop(ctx, now, 600, 0.05, 0.12);
        break;
      case 'wallet_connect':
        // Harmonious chord for wallet connection
        this.playChord(ctx, now);
        break;
      case 'defend_success':
        // Shield sound - rising sweep with sustain
        this.playShield(ctx, now);
        break;
      case 'attack_success':
        // Impact sound - percussive hit
        this.playImpact(ctx, now);
        break;
      case 'reinforce_success':
        // Energy sound - rising energy sweep
        this.playEnergy(ctx, now);
        break;
    }
  }

  // Gentle sweep sound (whoosh up/down)
  private playSweep(
    ctx: AudioContext,
    startTime: number,
    startFreq: number,
    endFreq: number,
    duration: number,
    gain: number
  ): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + duration * 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Crisp click sound
  private playClick(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    gain: number
  ): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + duration);

    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Satisfying pop sound
  private playPop(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    gain: number
  ): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + duration * 0.3);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, startTime + duration);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Harmonious chord for wallet connection
  private playChord(ctx: AudioContext, startTime: number): void {
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
    const duration = 0.3;
    const gain = 0.06;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02 + i * 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  // Shield sound - rising sweep with sustain
  private playShield(ctx: AudioContext, startTime: number): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const duration = 0.25;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, startTime);
    osc.frequency.exponentialRampToValueAtTime(600, startTime + 0.1);
    osc.frequency.setValueAtTime(600, startTime + duration);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.03);
    gainNode.gain.setValueAtTime(0.08, startTime + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Impact sound - percussive hit
  private playImpact(ctx: AudioContext, startTime: number): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const duration = 0.15;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(60, startTime + duration);

    gainNode.gain.setValueAtTime(0.12, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    // Add click layer
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(1000, startTime);
    click.frequency.exponentialRampToValueAtTime(200, startTime + 0.02);
    clickGain.gain.setValueAtTime(0.08, startTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(startTime);
    click.stop(startTime + 0.03);
  }

  // Energy sound - rising energy sweep
  private playEnergy(ctx: AudioContext, startTime: number): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const duration = 0.2;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, startTime);
    osc.frequency.exponentialRampToValueAtTime(800, startTime + duration * 0.6);
    osc.frequency.exponentialRampToValueAtTime(700, startTime + duration);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    // Add shimmer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(1200, startTime);
    shimmer.frequency.exponentialRampToValueAtTime(1600, startTime + duration);
    shimmerGain.gain.setValueAtTime(0, startTime);
    shimmerGain.gain.linearRampToValueAtTime(0.04, startTime + 0.05);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(startTime);
    shimmer.stop(startTime + duration);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const soundEngine = new SoundEngine();
