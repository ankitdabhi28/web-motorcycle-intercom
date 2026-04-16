/**
 * Battery Optimizer
 *
 * Manages battery-efficient operation for long rides with sleep modes,
 * reduced polling intervals, and optimized WebRTC processing.
 */

// Battery API type definition
declare global {
  interface Navigator {
    getBattery?: () => Promise<BatteryManager>;
  }

  interface BatteryManager extends EventTarget {
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    addEventListener(type: string, listener: (event: Event) => void): void;
    removeEventListener(type: string, listener: (event: Event) => void): void;
  }
}

export interface BatteryConfig {
  idleTimeout: number; // ms before entering idle mode
  deepSleepTimeout: number; // ms before entering deep sleep
  pollingInterval: {
    active: number; // ms - GPS polling when active
    idle: number; // ms - GPS polling when idle
    deepSleep: number; // ms - GPS polling when deep sleep
  };
  voiceActivityThreshold: number; // dB - threshold for voice activation
  webRTCBitrate: {
    active: number; // kbps
    idle: number; // kbps
    deepSleep: number; // kbps
  };
}

const DEFAULT_CONFIG: BatteryConfig = {
  idleTimeout: 30000, // 30 seconds
  deepSleepTimeout: 300000, // 5 minutes
  pollingInterval: {
    active: 1000, // 1 second
    idle: 5000, // 5 seconds
    deepSleep: 30000, // 30 seconds
  },
  voiceActivityThreshold: -40, // dB
  webRTCBitrate: {
    active: 128, // 128 kbps
    idle: 64, // 64 kbps
    deepSleep: 32, // 32 kbps
  },
};

export enum PowerMode {
  ACTIVE = "active",
  IDLE = "idle",
  DEEP_SLEEP = "deep_sleep",
}

export interface BatteryStatus {
  mode: PowerMode;
  batteryLevel: number | null;
  isCharging: boolean | null;
  lastActivity: Date;
  estimatedTimeRemaining: number | null; // seconds
}

export class BatteryOptimizer {
  private config: BatteryConfig;
  private currentMode: PowerMode = PowerMode.ACTIVE;
  private lastActivity: Date = new Date();
  private idleTimer: NodeJS.Timeout | null = null;
  private deepSleepTimer: NodeJS.Timeout | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private batteryLevel: number | null = null;
  private isCharging: boolean | null = null;

  // Event callbacks
  private onModeChange: (mode: PowerMode) => void;
  private onPollingIntervalChange: (interval: number) => void;
  private onWebRTCBitrateChange: (bitrate: number) => void;
  private onLowBattery: (level: number) => void;

  constructor(
    onModeChange: (mode: PowerMode) => void,
    onPollingIntervalChange: (interval: number) => void,
    onWebRTCBitrateChange: (bitrate: number) => void,
    onLowBattery: (level: number) => void,
    config: Partial<BatteryConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onModeChange = onModeChange;
    this.onPollingIntervalChange = onPollingIntervalChange;
    this.onWebRTCBitrateChange = onWebRTCBitrateChange;
    this.onLowBattery = onLowBattery;

    this.initBatteryMonitoring();
    this.startActivityMonitoring();
  }

  /**
   * Initialize battery monitoring
   */
  private initBatteryMonitoring(): void {
    if (typeof navigator !== "undefined" && "getBattery" in navigator) {
      (navigator as { getBattery: () => Promise<BatteryManager> })
        .getBattery()
        .then((battery: BatteryManager) => {
          this.batteryLevel = battery.level * 100;
          this.isCharging = battery.charging;

          // Listen for battery changes
          battery.addEventListener("levelchange", () => {
            this.batteryLevel = battery.level * 100;
            this.checkLowBattery();
          });

          battery.addEventListener("chargingchange", () => {
            this.isCharging = battery.charging;
            if (this.isCharging) {
              this.setMode(PowerMode.ACTIVE);
            }
          });
        })
        .catch((error) => {
          console.warn("[BatteryOptimizer] Battery API not available:", error);
        });
    }
  }

  /**
   * Start activity monitoring for automatic power mode switching
   */
  private startActivityMonitoring(): void {
    // Start idle timer
    this.resetIdleTimer();

    // Start deep sleep timer
    this.resetDeepSleepTimer();
  }

  /**
   * Reset idle timer
   */
  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      if (this.currentMode === PowerMode.ACTIVE) {
        this.setMode(PowerMode.IDLE);
      }
    }, this.config.idleTimeout);
  }

  /**
   * Reset deep sleep timer
   */
  private resetDeepSleepTimer(): void {
    if (this.deepSleepTimer) {
      clearTimeout(this.deepSleepTimer);
    }

    this.deepSleepTimer = setTimeout(() => {
      if (this.currentMode === PowerMode.IDLE) {
        this.setMode(PowerMode.DEEP_SLEEP);
      }
    }, this.config.deepSleepTimeout);
  }

  /**
   * Set power mode
   */
  private setMode(mode: PowerMode): void {
    if (this.currentMode === mode) {
      return;
    }

    this.currentMode = mode;
    this.onModeChange(mode);

    // Map enum to config keys
    const modeKey = mode === PowerMode.DEEP_SLEEP ? "deepSleep" : mode;

    // Update polling interval
    const pollingInterval =
      this.config.pollingInterval[
        modeKey as keyof typeof this.config.pollingInterval
      ];
    this.onPollingIntervalChange(pollingInterval);

    // Update WebRTC bitrate
    const bitrate =
      this.config.webRTCBitrate[
        modeKey as keyof typeof this.config.webRTCBitrate
      ];
    this.onWebRTCBitrateChange(bitrate);

    console.log(`[BatteryOptimizer] Mode changed to: ${mode}`);
  }

  /**
   * Report user activity (voice, movement, etc.)
   */
  reportActivity(): void {
    this.lastActivity = new Date();

    if (this.currentMode !== PowerMode.ACTIVE) {
      this.setMode(PowerMode.ACTIVE);
    }

    // Reset timers
    this.resetIdleTimer();
    this.resetDeepSleepTimer();
  }

  /**
   * Report voice activity level (in dB)
   */
  reportVoiceActivity(level: number): void {
    if (level > this.config.voiceActivityThreshold) {
      this.reportActivity();
    }
  }

  /**
   * Check for low battery
   */
  private checkLowBattery(): void {
    if (this.batteryLevel !== null && this.batteryLevel < 20) {
      this.onLowBattery(this.batteryLevel);
    }
  }

  /**
   * Get current battery status
   */
  getStatus(): BatteryStatus {
    return {
      mode: this.currentMode,
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging,
      lastActivity: this.lastActivity,
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(),
    };
  }

  /**
   * Calculate estimated time remaining (rough estimate)
   */
  private calculateEstimatedTimeRemaining(): number | null {
    if (this.batteryLevel === null || this.isCharging === null) {
      return null;
    }

    if (this.isCharging) {
      return null;
    }

    // Rough estimate: 1% = 3 minutes at active mode
    const minutesPerPercent =
      this.currentMode === PowerMode.ACTIVE
        ? 3
        : this.currentMode === PowerMode.IDLE
          ? 6
          : 12;

    return Math.round(this.batteryLevel * minutesPerPercent * 60);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BatteryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Stop battery optimizer
   */
  stop(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.deepSleepTimer) {
      clearTimeout(this.deepSleepTimer);
      this.deepSleepTimer = null;
    }

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
}
