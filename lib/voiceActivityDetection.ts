// Voice Activity Detection (VAD) utility
// Detects when audio input contains speech vs silence/background noise

export interface VADConfig {
  threshold: number; // Audio level threshold (0-1)
  silenceDuration: number; // Minimum silence duration in ms to consider as silence
  speechDuration: number; // Minimum speech duration in ms to consider as speech
  sampleRate: number; // Audio sample rate
}

export interface VADState {
  isSpeaking: boolean;
  audioLevel: number;
  lastSpeechTime: number;
  lastSilenceTime: number;
}

export class VoiceActivityDetection {
  private config: VADConfig;
  private state: VADState;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private onSpeakingChange: ((isSpeaking: boolean) => void) | null = null;
  private dataArray: Uint8Array | null = null;

  constructor(config: Partial<VADConfig> = {}) {
    this.config = {
      threshold: config.threshold || 0.02,
      silenceDuration: config.silenceDuration || 500,
      speechDuration: config.speechDuration || 200,
      sampleRate: config.sampleRate || 44100,
    };

    this.state = {
      isSpeaking: false,
      audioLevel: 0,
      lastSpeechTime: 0,
      lastSilenceTime: Date.now(),
    };
  }

  /**
   * Initialize VAD with microphone access
   */
  async initialize(): Promise<void> {
    try {
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphone = stream;

      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      console.log("VAD initialized successfully");
    } catch (error) {
      console.error("Failed to initialize VAD:", error);
      throw error;
    }
  }

  /**
   * Start monitoring audio for voice activity
   */
  start(onSpeakingChange: (isSpeaking: boolean) => void): void {
    this.onSpeakingChange = onSpeakingChange;
    this.detectVoiceActivity();
  }

  /**
   * Stop monitoring audio
   */
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.microphone) {
      this.microphone.getTracks().forEach((track) => track.stop());
      this.microphone = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.onSpeakingChange = null;
  }

  /**
   * Main voice activity detection loop
   */
  private detectVoiceActivity(): void {
    if (!this.analyser || !this.dataArray || !this.audioContext) {
      return;
    }

    // @ts-expect-error - ArrayBufferLike vs ArrayBuffer type issue in Web Audio API
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate RMS (Root Mean Square) audio level
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const value = this.dataArray[i] / 255; // Normalize to 0-1
      sum += value * value;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    this.state.audioLevel = rms;

    const now = Date.now();
    const isAboveThreshold = rms > this.config.threshold;

    if (isAboveThreshold) {
      this.state.lastSpeechTime = now;

      // Check if we've been speaking long enough
      if (
        !this.state.isSpeaking &&
        now - this.state.lastSilenceTime > this.config.speechDuration
      ) {
        this.state.isSpeaking = true;
        if (this.onSpeakingChange) {
          this.onSpeakingChange(true);
        }
      }
    } else {
      this.state.lastSilenceTime = now;

      // Check if we've been silent long enough
      if (
        this.state.isSpeaking &&
        now - this.state.lastSpeechTime > this.config.silenceDuration
      ) {
        this.state.isSpeaking = false;
        if (this.onSpeakingChange) {
          this.onSpeakingChange(false);
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(() =>
      this.detectVoiceActivity(),
    );
  }

  /**
   * Get current VAD state
   */
  getState(): VADState {
    return { ...this.state };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VADConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.state.isSpeaking;
  }

  /**
   * Get current audio level (0-1)
   */
  getAudioLevel(): number {
    return this.state.audioLevel;
  }
}

// Singleton instance
let vadInstance: VoiceActivityDetection | null = null;

export function getVAD(config?: Partial<VADConfig>): VoiceActivityDetection {
  if (!vadInstance) {
    vadInstance = new VoiceActivityDetection(config);
  } else if (config) {
    vadInstance.updateConfig(config);
  }
  return vadInstance;
}

export function releaseVAD(): void {
  if (vadInstance) {
    vadInstance.stop();
    vadInstance = null;
  }
}
