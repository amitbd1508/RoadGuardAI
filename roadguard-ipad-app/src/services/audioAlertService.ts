import { TelemetryAlert } from '../types';

export class AudioAlertService {
  private enabled: boolean = true;
  private volume: number = 1.0;
  private audioContext: AudioContext | null = null;
  private lastSpokenTime: number = 0;
  private speechCooldownMs: number = 3000;

  constructor() {
    const saved = localStorage.getItem('roadguard_ipad_audio');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    localStorage.setItem('roadguard_ipad_audio', String(val));
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private initAudio() {
    if (!this.audioContext && typeof AudioContext !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playChime(priority: string) {
    if (!this.enabled) return;
    this.initAudio();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = priority === 'CRITICAL' ? 'sawtooth' : 'sine';
    const freq = priority === 'CRITICAL' ? 880 : 587.33;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.15 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  public announce(alert: TelemetryAlert) {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this.lastSpokenTime < this.speechCooldownMs) {
      return;
    }
    this.lastSpokenTime = now;

    // Play warning tone
    this.playChime(alert.priority);

    // Speak advisory text via Web Speech API
    if ('speechSynthesis' in window) {
      const textToSpeak = alert.short_audio || alert.message;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.1; // crisp, clear tempo
      utterance.pitch = 1.0;
      utterance.volume = this.volume;
      window.speechSynthesis.cancel(); // cancel pending
      window.speechSynthesis.speak(utterance);
    }
  }
}

export const audioAlertService = new AudioAlertService();
