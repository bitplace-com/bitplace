// Procedural 8-bit/Chiptune Sound Engine using Web Audio API
// Generates original pixel-art-style sounds without external audio files

type SoundType = 
  | 'palette_open' 
  | 'palette_close' 
  | 'pixel_select' 
  | 'pixel_deselect' 
  | 'paint_commit'
  | 'wallet_connect'
  | 'defend_success'
  | 'attack_success'
  | 'reinforce_success'
  | 'erase_success'
  // Real-time alert sounds
  | 'alert_attack'
  | 'alert_lost'
  | 'alert_defend'
  | 'notification'
  // Modal/UI sounds
  | 'modal_open'
  | 'modal_close'
  // Validation
  | 'validate_success'
  | 'validate_fail'
  // Social
  | 'like'
  | 'unlike'
  | 'pin_create'
  | 'pin_remove'
  | 'save'
  | 'unsave';

const STORAGE_KEY = 'bitplace_sound_enabled';

// Throttle times per sound type (ms)
const THROTTLE_MS: Partial<Record<SoundType, number>> = {
  pixel_select: 40,
  pixel_deselect: 40,
  like: 150,
  unlike: 150,
  save: 150,
  unsave: 150,
  pin_create: 150,
  pin_remove: 150,
  modal_open: 100,
  modal_close: 100,
};

const DEFAULT_THROTTLE = 80;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private initialized: boolean = false;
  private lastPlayTime: Map<SoundType, number> = new Map();

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
    
    // Throttle check
    const now = Date.now();
    const lastTime = this.lastPlayTime.get(sound) || 0;
    const throttle = THROTTLE_MS[sound] ?? DEFAULT_THROTTLE;
    
    if (now - lastTime < throttle) return;
    this.lastPlayTime.set(sound, now);
    
    const ctx = this.init();
    if (!ctx) return;

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const startTime = ctx.currentTime;

    switch (sound) {
      case 'palette_open':
        this.playChipSweepUp(ctx, startTime);
        break;
      case 'palette_close':
        this.playChipSweepDown(ctx, startTime);
        break;
      case 'modal_open':
        this.playModalOpen(ctx, startTime);
        break;
      case 'modal_close':
        this.playModalClose(ctx, startTime);
        break;
      case 'pixel_select':
        this.playPixelSelect(ctx, startTime);
        break;
      case 'pixel_deselect':
        this.playPixelDeselect(ctx, startTime);
        break;
      case 'paint_commit':
        this.playPaintCommit(ctx, startTime);
        break;
      case 'wallet_connect':
        this.playWalletConnect(ctx, startTime);
        break;
      case 'defend_success':
        this.playDefendSuccess(ctx, startTime);
        break;
      case 'attack_success':
        this.playAttackSuccess(ctx, startTime);
        break;
      case 'reinforce_success':
        this.playReinforceSuccess(ctx, startTime);
        break;
      case 'erase_success':
        this.playEraseSuccess(ctx, startTime);
        break;
      case 'validate_success':
        this.playValidateSuccess(ctx, startTime);
        break;
      case 'validate_fail':
        this.playValidateFail(ctx, startTime);
        break;
      case 'like':
        this.playLike(ctx, startTime);
        break;
      case 'unlike':
        this.playUnlike(ctx, startTime);
        break;
      case 'pin_create':
        this.playPinCreate(ctx, startTime);
        break;
      case 'pin_remove':
        this.playPinRemove(ctx, startTime);
        break;
      case 'save':
        this.playSave(ctx, startTime);
        break;
      case 'unsave':
        this.playUnsave(ctx, startTime);
        break;
      case 'alert_attack':
        this.playAlertAttack(ctx, startTime);
        break;
      case 'alert_lost':
        this.playAlertLost(ctx, startTime);
        break;
      case 'alert_defend':
        this.playAlertDefend(ctx, startTime);
        break;
      case 'notification':
        this.playNotification(ctx, startTime);
        break;
    }
  }

  // ===== 8-BIT CORE SOUNDS =====

  // Square wave blip - classic 8-bit select
  private playPixelSelect(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    // C6 to E6 pitch bend (quick chirp)
    osc.frequency.setValueAtTime(1047, t); // C6
    osc.frequency.setValueAtTime(1319, t + 0.015); // E6
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.setValueAtTime(0, t + 0.035); // Sharp cutoff
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Lower pitch descending blip
  private playPixelDeselect(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.setValueAtTime(659, t + 0.02); // E5
    
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.setValueAtTime(0, t + 0.03);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  // Arpeggio up - C-E-G (Mario coin style)
  private playPaintCommit(ctx: AudioContext, t: number): void {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const noteDuration = 0.04;
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + i * noteDuration);
      
      gain.gain.setValueAtTime(0, t + i * noteDuration);
      gain.gain.setValueAtTime(0.09, t + i * noteDuration + 0.003);
      gain.gain.setValueAtTime(0, t + i * noteDuration + noteDuration * 0.9);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * noteDuration);
      osc.stop(t + i * noteDuration + noteDuration);
    });
  }

  // Quick rising sweep
  private playChipSweepUp(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.06);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Quick falling sweep
  private playChipSweepDown(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.05);
    
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Modal open - two-note rising
  private playModalOpen(ctx: AudioContext, t: number): void {
    const notes = [440, 659]; // A4, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      
      gain.gain.setValueAtTime(0, t + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.07, t + i * 0.05 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.06);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.07);
    });
  }

  // Modal close - two-note falling
  private playModalClose(ctx: AudioContext, t: number): void {
    const notes = [659, 440]; // E5, A4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.04);
      
      gain.gain.setValueAtTime(0.06, t + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.06);
    });
  }

  // Wallet connect - triumphant chord arpeggio
  private playWalletConnect(ctx: AudioContext, t: number): void {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C major arpeggio to C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      
      gain.gain.setValueAtTime(0, t + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.06, t + i * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.15);
    });
  }

  // Defend success - shield power-up
  private playDefendSuccess(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.08);
    osc.frequency.setValueAtTime(660, t + 0.2);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
    gain.gain.setValueAtTime(0.08, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
    
    // Shimmer overtone
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'square';
    shimmer.frequency.setValueAtTime(1320, t + 0.05);
    shimmerGain.gain.setValueAtTime(0, t + 0.05);
    shimmerGain.gain.linearRampToValueAtTime(0.03, t + 0.07);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(t + 0.05);
    shimmer.stop(t + 0.22);
  }

  // Attack success - percussive hit
  private playAttackSuccess(ctx: AudioContext, t: number): void {
    // Impact bass
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sawtooth';
    bass.frequency.setValueAtTime(120, t);
    bass.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    bassGain.gain.setValueAtTime(0.12, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(t);
    bass.stop(t + 0.12);
    
    // Click layer
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(800, t);
    click.frequency.exponentialRampToValueAtTime(150, t + 0.02);
    clickGain.gain.setValueAtTime(0.08, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(t);
    click.stop(t + 0.03);
  }

  // Reinforce success - energy rising
  private playReinforceSuccess(ctx: AudioContext, t: number): void {
    const notes = [440, 554, 659]; // A4, C#5, E5 (A major arpeggio)
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + i * 0.035);
      
      gain.gain.setValueAtTime(0, t + i * 0.035);
      gain.gain.linearRampToValueAtTime(0.07, t + i * 0.035 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.035 + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.035);
      osc.stop(t + i * 0.035 + 0.1);
    });
  }

  // Erase success - descending wipe
  private playEraseSuccess(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Validate success - quick positive arpeggio
  private playValidateSuccess(ctx: AudioContext, t: number): void {
    const notes = [659, 784, 988]; // E5, G5, B5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + i * 0.03);
      
      gain.gain.setValueAtTime(0.08, t + i * 0.03);
      gain.gain.setValueAtTime(0, t + i * 0.03 + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.03);
      osc.stop(t + i * 0.03 + 0.05);
    });
  }

  // Validate fail - descending buzz
  private playValidateFail(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
    
    // Second buzz for emphasis
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(150, t + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    gain2.gain.setValueAtTime(0.06, t + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.25);
  }

  // Like - quick happy blip
  private playLike(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1175, t + 0.02); // D6
    
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.setValueAtTime(0, t + 0.04);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Unlike - soft descending
  private playUnlike(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.04);
    
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Pin create - rising confirmation
  private playPinCreate(ctx: AudioContext, t: number): void {
    const notes = [523, 659]; // C5, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + i * 0.04);
      
      gain.gain.setValueAtTime(0.07, t + i * 0.04);
      gain.gain.setValueAtTime(0, t + i * 0.04 + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.06);
    });
  }

  // Pin remove - falling
  private playPinRemove(ctx: AudioContext, t: number): void {
    const notes = [659, 523]; // E5, C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.035);
      
      gain.gain.setValueAtTime(0.06, t + i * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.035 + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.035);
      osc.stop(t + i * 0.035 + 0.05);
    });
  }

  // Save - sparkle up
  private playSave(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(784, t);
    osc.frequency.setValueAtTime(988, t + 0.02);
    osc.frequency.setValueAtTime(1175, t + 0.04);
    
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.setValueAtTime(0, t + 0.06);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Unsave - soft fade
  private playUnsave(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(330, t + 0.06);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Alert Attack - urgent rising alarm
  private playAlertAttack(ctx: AudioContext, t: number): void {
    // Main alarm
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.25);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
    gain.gain.setValueAtTime(0.08, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
    
    // Urgency pulse
    const pulse = ctx.createOscillator();
    const pulseGain = ctx.createGain();
    pulse.type = 'square';
    pulse.frequency.setValueAtTime(1100, t + 0.08);
    pulse.frequency.exponentialRampToValueAtTime(800, t + 0.18);
    pulseGain.gain.setValueAtTime(0, t + 0.08);
    pulseGain.gain.linearRampToValueAtTime(0.05, t + 0.1);
    pulseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    pulse.connect(pulseGain);
    pulseGain.connect(ctx.destination);
    pulse.start(t + 0.08);
    pulse.stop(t + 0.24);
  }

  // Alert Lost - defeat sound
  private playAlertLost(ctx: AudioContext, t: number): void {
    // Descending tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523, t);
    osc.frequency.exponentialRampToValueAtTime(165, t + 0.3);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.38);
    
    // Low rumble
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(70, t);
    rumble.frequency.exponentialRampToValueAtTime(35, t + 0.3);
    rumbleGain.gain.setValueAtTime(0.08, t);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    rumble.connect(rumbleGain);
    rumbleGain.connect(ctx.destination);
    rumble.start(t);
    rumble.stop(t + 0.38);
  }

  // Alert Defend - positive reinforcement
  private playAlertDefend(ctx: AudioContext, t: number): void {
    const notes = [440, 554, 659]; // A4, C#5, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      
      gain.gain.setValueAtTime(0, t + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.07, t + i * 0.05 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.12);
    });
  }

  // Notification - gentle chime
  private playNotification(ctx: AudioContext, t: number): void {
    const notes = [988, 1175]; // B5, D6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.04);
      
      gain.gain.setValueAtTime(0, t + i * 0.04);
      gain.gain.linearRampToValueAtTime(0.06, t + i * 0.04 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.18);
    });
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
