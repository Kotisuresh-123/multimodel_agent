// Browser-native SpeechRecognition interface definition
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onend: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: IWindowSpeechRecognition, ev: { error: string; message?: string }) => void) | null;
  onresult: ((this: IWindowSpeechRecognition, ev: {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: {
        isFinal: boolean;
        length: number;
        [index: number]: { transcript: string; confidence: number };
      };
    };
  }) => void) | null;
  onspeechstart: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => IWindowSpeechRecognition;
    webkitSpeechRecognition?: new () => IWindowSpeechRecognition;
  }
}

export interface STTCallbacks {
  onStart?: () => void;
  onResult?: (finalText: string, interimText: string) => void;
  onEnd?: () => void;
  onError?: (errorMessage: string) => void;
  onSpeechDetected?: () => void;
}

export class SpeechRecognitionService {
  private recognition: IWindowSpeechRecognition | null = null;
  private isListening = false;
  private callbacks: STTCallbacks = {};
  private language = 'en-US';

  constructor() {
    this.initRecognition();
  }

  public isSupported(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  public setLanguage(lang: string): void {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  private initRecognition(): void {
    if (!this.isSupported()) {
      return;
    }

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) return;

    this.recognition = new SpeechRecognitionConstructor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart?.();
    };

    this.recognition.onspeechstart = () => {
      // Direct speech start signal - triggers interruption if assistant is speaking
      this.callbacks.onSpeechDetected?.();
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      this.callbacks.onResult?.(finalTranscript, interimTranscript);
    };

    this.recognition.onerror = (event) => {
      let friendlyError = 'Speech recognition error';
      if (event.error === 'not-allowed') {
        friendlyError = 'Microphone access was denied. Please allow microphone permissions in your browser.';
      } else if (event.error === 'no-speech') {
        friendlyError = 'No speech was detected. Please try speaking again.';
      } else if (event.error === 'network') {
        friendlyError = 'Speech recognition network error. Check your internet connection.';
      }

      console.warn('STT Error:', event.error);
      this.callbacks.onError?.(friendlyError);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onEnd?.();
    };
  }

  public start(callbacks: STTCallbacks): void {
    this.callbacks = callbacks;

    if (!this.isSupported()) {
      callbacks.onError?.('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or use text fallback.');
      return;
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    try {
      this.recognition?.start();
    } catch {
      // If already started or transitioning
      this.recognition?.stop();
      setTimeout(() => {
        try {
          this.recognition?.start();
        } catch (e) {
          console.warn('Could not restart recognition:', e);
        }
      }, 150);
    }
  }

  public stop(): void {
    if (this.isListening && this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Error stopping speech recognition:', e);
      }
    }
    this.isListening = false;
  }

  public abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        console.warn('Error aborting speech recognition:', e);
      }
    }
    this.isListening = false;
  }

  public getListeningState(): boolean {
    return this.isListening;
  }
}

export const speechService = new SpeechRecognitionService();
