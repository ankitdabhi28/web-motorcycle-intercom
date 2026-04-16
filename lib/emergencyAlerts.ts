// Emergency Alert System
// Allows riders to send emergency alerts to the entire group

export interface EmergencyAlert {
  alertId: string;
  riderId: string;
  riderName: string;
  type: "emergency" | "warning" | "info";
  message: string;
  location: { lat: number; lng: number };
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string[];
}

export interface EmergencyAlertConfig {
  autoAcknowledge: boolean;
  alertSound: boolean;
  vibration: boolean;
  alertDuration: number; // How long alert stays active (ms)
}

export class EmergencyAlertSystem {
  private alerts: Map<string, EmergencyAlert> = new Map();
  private config: EmergencyAlertConfig;
  private socket: unknown = null;
  private localRiderId: string = "";

  constructor(config: Partial<EmergencyAlertConfig> = {}) {
    this.config = {
      autoAcknowledge: config.autoAcknowledge || false,
      alertSound: config.alertSound !== undefined ? config.alertSound : true,
      vibration: config.vibration !== undefined ? config.vibration : true,
      alertDuration: config.alertDuration || 30000, // 30 seconds
    };
  }

  /**
   * Set socket instance for broadcasting alerts
   */
  setSocket(socket: unknown): void {
    this.socket = socket;
    this.setupSocketListeners();
  }

  /**
   * Set local rider ID
   */
  setLocalRiderId(riderId: string): void {
    this.localRiderId = riderId;
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    (
      this.socket as {
        on: (event: string, callback: (data: unknown) => void) => void;
      }
    ).on("EMERGENCY_ALERT", (alert: unknown) => {
      this.handleIncomingAlert(alert as EmergencyAlert);
    });

    (
      this.socket as {
        on: (event: string, callback: (data: unknown) => void) => void;
      }
    ).on("EMERGENCY_ALERT_ACK", (data: unknown) => {
      this.handleAlertAcknowledgment(
        data as { alertId: string; riderId: string },
      );
    });
  }

  /**
   * Send an emergency alert
   */
  sendEmergencyAlert(
    riderId: string,
    riderName: string,
    message: string,
    location: { lat: number; lng: number },
    type: "emergency" | "warning" | "info" = "emergency",
  ): EmergencyAlert {
    const alert: EmergencyAlert = {
      alertId: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      riderId,
      riderName,
      type,
      message,
      location,
      timestamp: Date.now(),
      acknowledged: false,
      acknowledgedBy: [],
    };

    this.alerts.set(alert.alertId, alert);

    // Broadcast via socket
    if (this.socket) {
      (this.socket as { emit: (event: string, data: unknown) => void }).emit(
        "EMERGENCY_ALERT",
        alert,
      );
    }

    // Trigger local alert
    this.triggerLocalAlert(alert);

    return alert;
  }

  /**
   * Handle incoming alert from another rider
   */
  private handleIncomingAlert(alert: EmergencyAlert): void {
    this.alerts.set(alert.alertId, alert);
    this.triggerLocalAlert(alert);
  }

  /**
   * Trigger local alert (sound, vibration, notification)
   */
  private triggerLocalAlert(alert: EmergencyAlert): void {
    // Play alert sound
    if (this.config.alertSound) {
      this.playAlertSound(alert.type);
    }

    // Vibrate device
    if (this.config.vibration && navigator.vibrate) {
      const pattern =
        alert.type === "emergency" ? [200, 100, 200, 100, 200] : [100, 50, 100];
      navigator.vibrate(pattern);
    }

    // Show browser notification
    if (Notification.permission === "granted") {
      new Notification(`${alert.type.toUpperCase()}: ${alert.riderName}`, {
        body: alert.message,
        icon: "/favicon.ico",
        tag: alert.alertId,
        requireInteraction: alert.type === "emergency",
      });
    }

    // Auto-acknowledge if configured
    if (this.config.autoAcknowledge && alert.type !== "emergency") {
      setTimeout(() => {
        this.acknowledgeAlert(alert.alertId, this.localRiderId);
      }, 5000);
    }
  }

  /**
   * Play alert sound based on type
   */
  private playAlertSound(type: string): void {
    const audioContext = new (
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === "emergency") {
      // Emergency: High-pitched repeating sound
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.3);
    } else if (type === "warning") {
      // Warning: Medium-pitched sound
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    } else {
      // Info: Low-pitched sound
      oscillator.frequency.setValueAtTime(330, audioContext.currentTime);
    }

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, riderId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert) return;

    if (!alert.acknowledgedBy) {
      alert.acknowledgedBy = [];
    }

    if (!alert.acknowledgedBy.includes(riderId)) {
      alert.acknowledgedBy.push(riderId);
    }

    // Broadcast acknowledgment
    if (this.socket) {
      (this.socket as { emit: (event: string, data: unknown) => void }).emit(
        "EMERGENCY_ALERT_ACK",
        { alertId, riderId },
      );
    }
  }

  /**
   * Handle alert acknowledgment from another rider
   */
  private handleAlertAcknowledgment(data: {
    alertId: string;
    riderId: string;
  }): void {
    const alert = this.alerts.get(data.alertId);
    if (!alert) return;

    if (!alert.acknowledgedBy) {
      alert.acknowledgedBy = [];
    }

    if (!alert.acknowledgedBy.includes(data.riderId)) {
      alert.acknowledgedBy.push(data.riderId);
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): EmergencyAlert[] {
    const now = Date.now();
    return Array.from(this.alerts.values()).filter(
      (alert) => now - alert.timestamp < this.config.alertDuration,
    );
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): EmergencyAlert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Clear an alert
   */
  clearAlert(alertId: string): void {
    this.alerts.delete(alertId);
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): void {
    this.alerts.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EmergencyAlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
}

// Singleton instance
let emergencyAlertInstance: EmergencyAlertSystem | null = null;

export function getEmergencyAlertSystem(
  config?: Partial<EmergencyAlertConfig>,
): EmergencyAlertSystem {
  if (!emergencyAlertInstance) {
    emergencyAlertInstance = new EmergencyAlertSystem(config);
  } else if (config) {
    emergencyAlertInstance.updateConfig(config);
  }
  return emergencyAlertInstance;
}

export function releaseEmergencyAlertSystem(): void {
  emergencyAlertInstance = null;
}
