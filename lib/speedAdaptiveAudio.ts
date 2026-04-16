/**
 * Speed-Adaptive Audio Configuration
 * 
 * Automatically adjusts audio settings based on GPS speed to optimize
 * audio quality for different riding conditions (city vs highway).
 */

export interface SpeedMode {
  name: 'city' | 'highway';
  speedThreshold: number; // mph
  noiseSuppression: 'low' | 'medium' | 'aggressive';
  volume: number; // 0.0 to 1.0
  echoCancellation: boolean;
  windFilter: boolean;
}

export interface SpeedAdaptiveConfig {
  cityMode: SpeedMode;
  highwayMode: SpeedMode;
  transitionThreshold: number; // mph - buffer zone for smooth transitions
  updateInterval: number; // ms - how often to check speed
}

const DEFAULT_CONFIG: SpeedAdaptiveConfig = {
  cityMode: {
    name: 'city',
    speedThreshold: 35, // mph
    noiseSuppression: 'low',
    volume: 0.6,
    echoCancellation: true,
    windFilter: false,
  },
  highwayMode: {
    name: 'highway',
    speedThreshold: 65, // mph
    noiseSuppression: 'aggressive',
    volume: 0.9,
    echoCancellation: true,
    windFilter: true,
  },
  transitionThreshold: 5, // mph buffer zone
  updateInterval: 2000, // Check speed every 2 seconds
};

export class SpeedAdaptiveAudio {
  private config: SpeedAdaptiveConfig;
  private currentMode: SpeedMode;
  private currentSpeed: number = 0;
  private updateTimer: NodeJS.Timeout | null = null;
  private onModeChange: (mode: SpeedMode) => void;

  constructor(
    onModeChange: (mode: SpeedMode) => void,
    config: Partial<SpeedAdaptiveConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentMode = this.config.cityMode;
    this.onModeChange = onModeChange;
  }

  /**
   * Update current speed and determine appropriate audio mode
   */
  updateSpeed(speedMph: number): void {
    this.currentSpeed = speedMph;
    const newMode = this.determineMode(speedMph);

    if (newMode.name !== this.currentMode.name) {
      this.currentMode = newMode;
      this.onModeChange(newMode);
    }
  }

  /**
   * Determine audio mode based on speed
   */
  private determineMode(speedMph: number): SpeedMode {
    const { cityMode, highwayMode, transitionThreshold } = this.config;

    // Highway mode: speed >= highway threshold - transition buffer
    if (speedMph >= highwayMode.speedThreshold - transitionThreshold) {
      return highwayMode;
    }

    // City mode: speed <= city threshold + transition buffer
    if (speedMph <= cityMode.speedThreshold + transitionThreshold) {
      return cityMode;
    }

    // In transition zone - maintain current mode for stability
    return this.currentMode;
  }

  /**
   * Start automatic speed monitoring
   */
  startMonitoring(getCurrentSpeed: () => number): void {
    if (this.updateTimer) {
      this.stopMonitoring();
    }

    this.updateTimer = setInterval(() => {
      const speed = getCurrentSpeed();
      this.updateSpeed(speed);
    }, this.config.updateInterval);
  }

  /**
   * Stop automatic speed monitoring
   */
  stopMonitoring(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Get current audio mode
   */
  getCurrentMode(): SpeedMode {
    return this.currentMode;
  }

  /**
   * Get current speed
   */
  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpeedAdaptiveConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }
}
