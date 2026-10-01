export interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
  onCancel?: () => void;
}

export class TTSService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private rate = 1.05; // Slightly faster for natural conversational cadence
  private pitch = 1.0;
  private isCurrentlySpeaking = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      // Load voices when available
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.autoSelectVoice();
      }
      this.autoSelectVoice();
    }
  }

  public isSupported(): boolean {
    return Boolean(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public autoSelectVoice(): void {
    const voices = this.getVoices();
    if (voices.length === 0) return;

    // Prioritize natural neural English voices (e.g. Google US English, Natural, Samantha, Jenny, etc.)
    const preferredVoices = [
      'Google US English',
      'Microsoft Jenny Online (Natural) - English (United States)',
      'Microsoft Guy Online (Natural) - English (United States)',
      'Samantha',
      'Karen',
      'Daniel',
      'en-US'
    ];

    for (const name of preferredVoices) {
      const match = voices.find(v => v.name.includes(name) || v.lang.includes(name));
      if (match) {
        this.selectedVoice = match;
        return;
      }
    }

    // Fallback to any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    this.selectedVoice = englishVoice || voices[0];
  }

  public setVoiceByName(name: string): void {
    const voices = this.getVoices();
    const found = voices.find(v => v.name === name);
    if (found) {
      this.selectedVoice = found;
    }
  }

  public setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setPitch(pitch: number): void {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking || Boolean(this.currentUtterance) || (this.synth ? this.synth.speaking : false);
  }

  /**
   * Speak the text with immediate interruption support and event handlers
   */
  public speak(text: string, callbacks?: TTSCallbacks): void {
    if (!this.synth) {
      callbacks?.onError?.('Text-to-speech is not supported in this browser.');
      return;
    }

    // Cancel any ongoing speech immediately before starting new speech
    this.cancel();

    if (!text || text.trim().length === 0) {
      callbacks?.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onstart = () => {
      this.isCurrentlySpeaking = true;
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      this.isCurrentlySpeaking = false;
      this.currentUtterance = null;
      callbacks?.onEnd?.();
    };

    utterance.onerror = (e) => {
      // Ignore interruption cancels
      if (e.error === 'interrupted' || e.error === 'canceled') {
        this.isCurrentlySpeaking = false;
        this.currentUtterance = null;
        callbacks?.onCancel?.();
        return;
      }

      console.warn('TTS playback error:', e.error);
      this.isCurrentlySpeaking = false;
      this.currentUtterance = null;
      callbacks?.onError?.(`Speech playback error: ${e.error}`);
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      this.isCurrentlySpeaking = false;
      callbacks?.onError?.(`Speech synthesis failed: ${(err as Error).message}`);
    }
  }

  /**
   * Interruption: Halts speech playback instantly
   */
  public cancel(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        console.warn('Error cancelling speech synthesis:', e);
      }
    }
    this.isCurrentlySpeaking = false;
    this.currentUtterance = null;
  }
}

export const ttsService = new TTSService();
