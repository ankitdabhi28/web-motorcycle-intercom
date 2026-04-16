/**
 * Helmet Audio Calibration
 *
 * Setup wizard for different helmet speakers/mics with test audio patterns
 * and helmet-specific audio profiles.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Web Audio API types are browser-specific, using any for compatibility

export interface HelmetProfile {
  id: string;
  name: string;
  brand: string;
  model: string;
  audioSettings: AudioSettings;
  createdAt: Date;
}

export interface AudioSettings {
  volume: number; // 0.0 to 1.0
  bass: number; // 0.0 to 1.0
  treble: number; // 0.0 to 1.0
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  inputGain: number; // 0.0 to 2.0
  outputGain: number; // 0.0 to 2.0
}

export interface CalibrationStep {
  step: number;
  description: string;
  testPattern?: AudioTestPattern;
}

export interface AudioTestPattern {
  type: "sine" | "white_noise" | "speech" | "sweep";
  frequency?: number; // Hz for sine wave
  duration: number; // ms
  volume: number; // 0.0 to 1.0
}

export interface CalibrationConfig {
  testVolume: number;
  testDuration: number;
  steps: CalibrationStep[];
}

const DEFAULT_CONFIG: CalibrationConfig = {
  testVolume: 0.7,
  testDuration: 2000,
  steps: [
    {
      step: 1,
      description: "Test speaker output with sine wave",
      testPattern: {
        type: "sine",
        frequency: 440,
        duration: 2000,
        volume: 0.7,
      },
    },
    {
      step: 2,
      description: "Test microphone input",
      testPattern: {
        type: "speech",
        duration: 2000,
        volume: 0.7,
      },
    },
    {
      step: 3,
      description: "Test with white noise",
      testPattern: {
        type: "white_noise",
        duration: 2000,
        volume: 0.5,
      },
    },
    {
      step: 4,
      description: "Frequency sweep test",
      testPattern: {
        type: "sweep",
        duration: 3000,
        volume: 0.6,
      },
    },
  ],
};

export class HelmetCalibration {
  private config: CalibrationConfig;
  private profiles: Map<string, HelmetProfile> = new Map();
  private currentStep: number = 0;
  private isCalibrating: boolean = false;
  private audioContext: AudioContext | null = null;

  // Event callbacks
  private onStepComplete: (step: number) => void;
  private onCalibrationComplete: (profile: HelmetProfile) => void;
  private onError: (error: string) => void;

  constructor(
    onStepComplete: (step: number) => void,
    onCalibrationComplete: (profile: HelmetProfile) => void,
    onError: (error: string) => void,
    config: Partial<CalibrationConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onStepComplete = onStepComplete;
    this.onCalibrationComplete = onCalibrationComplete;
    this.onError = onError;
  }

  /**
   * Start calibration process
   */
  async startCalibration(
    helmetName: string,
    brand: string,
    model: string,
    initialSettings: Partial<AudioSettings> = {},
  ): Promise<void> {
    if (this.isCalibrating) {
      throw new Error("Calibration already in progress");
    }

    this.isCalibrating = true;
    this.currentStep = 0;

    try {
      // Initialize audio context
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();

      // Run calibration steps
      for (const step of this.config.steps) {
        await this.runCalibrationStep(step);
        this.onStepComplete(step.step);
      }

      // Create profile
      const profile: HelmetProfile = {
        id: this.generateProfileId(),
        name: helmetName,
        brand,
        model,
        audioSettings: {
          volume: initialSettings.volume || 0.7,
          bass: initialSettings.bass || 0.5,
          treble: initialSettings.treble || 0.5,
          echoCancellation:
            initialSettings.echoCancellation !== undefined
              ? initialSettings.echoCancellation
              : true,
          noiseSuppression:
            initialSettings.noiseSuppression !== undefined
              ? initialSettings.noiseSuppression
              : true,
          autoGainControl:
            initialSettings.autoGainControl !== undefined
              ? initialSettings.autoGainControl
              : true,
          inputGain: initialSettings.inputGain || 1.0,
          outputGain: initialSettings.outputGain || 1.0,
        },
        createdAt: new Date(),
      };

      this.profiles.set(profile.id, profile);
      this.onCalibrationComplete(profile);
    } catch (error) {
      this.onError((error as Error).message);
    } finally {
      this.isCalibrating = false;
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
    }
  }

  /**
   * Run a single calibration step
   */
  private async runCalibrationStep(step: CalibrationStep): Promise<void> {
    if (!step.testPattern || !this.audioContext) {
      return;
    }

    await this.playTestPattern(step.testPattern);
  }

  /**
   * Play audio test pattern
   */
  private async playTestPattern(pattern: AudioTestPattern): Promise<void> {
    if (!this.audioContext) {
      throw new Error("Audio context not initialized");
    }

    return new Promise((resolve, reject) => {
      try {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();
        const destination = this.audioContext!.destination;

        oscillator.connect(gainNode);
        gainNode.connect(destination);

        // Configure based on pattern type
        switch (pattern.type) {
          case "sine":
            oscillator.type = "sine";
            oscillator.frequency.value = pattern.frequency || 440;
            break;
          case "white_noise":
            oscillator.type = "square";
            oscillator.frequency.value = 100;
            break;
          case "speech":
            oscillator.type = "triangle";
            oscillator.frequency.value = 200;
            break;
          case "sweep":
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(
              100,
              this.audioContext!.currentTime,
            );
            oscillator.frequency.exponentialRampToValueAtTime(
              2000,
              this.audioContext!.currentTime + pattern.duration / 1000,
            );
            break;
        }

        gainNode.gain.value = pattern.volume;

        oscillator.start();
        oscillator.stop(
          this.audioContext!.currentTime + pattern.duration / 1000,
        );

        setTimeout(() => {
          resolve();
        }, pattern.duration);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Save audio settings during calibration
   */
  saveSettings(settings: Partial<AudioSettings>): void {
    // This would be called during calibration to adjust settings based on user feedback
    console.log("[HelmetCalibration] Settings saved:", settings);
  }

  /**
   * Get all saved profiles
   */
  getProfiles(): HelmetProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get profile by ID
   */
  getProfile(id: string): HelmetProfile | undefined {
    return this.profiles.get(id);
  }

  /**
   * Delete profile
   */
  deleteProfile(id: string): void {
    this.profiles.delete(id);
  }

  /**
   * Update profile
   */
  updateProfile(id: string, updates: Partial<HelmetProfile>): void {
    const profile = this.profiles.get(id);
    if (profile) {
      this.profiles.set(id, { ...profile, ...updates });
    }
  }

  /**
   * Get current calibration status
   */
  getStatus(): {
    isCalibrating: boolean;
    currentStep: number;
    totalSteps: number;
  } {
    return {
      isCalibrating: this.isCalibrating,
      currentStep: this.currentStep,
      totalSteps: this.config.steps.length,
    };
  }

  /**
   * Cancel calibration
   */
  cancelCalibration(): void {
    this.isCalibrating = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CalibrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate unique profile ID
   */
  private generateProfileId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
