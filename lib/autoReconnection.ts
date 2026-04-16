/**
 * Auto-Reconnection Manager
 *
 * Handles automatic reconnection when back in range with smart retry logic,
 * exponential backoff, and connection quality monitoring.
 */

export interface ReconnectionConfig {
  maxRetryAttempts: number;
  initialRetryDelay: number; // ms
  maxRetryDelay: number; // ms
  backoffMultiplier: number;
  connectionTimeout: number; // ms
  healthCheckInterval: number; // ms
}

const DEFAULT_CONFIG: ReconnectionConfig = {
  maxRetryAttempts: 10,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  connectionTimeout: 10000, // 10 seconds
  healthCheckInterval: 5000, // 5 seconds
};

export interface ConnectionStatus {
  isConnected: boolean;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  retryCount: number;
  currentRetryDelay: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
}

export class AutoReconnection {
  private config: ReconnectionConfig;
  private status: ConnectionStatus;
  private retryTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;

  // Event callbacks
  private onConnected: () => void;
  private onDisconnected: () => void;
  private onReconnecting: (attempt: number, delay: number) => void;
  private onReconnectionFailed: () => void;
  private onConnectionQualityChange: (quality: ConnectionStatus['connectionQuality']) => void;

  constructor(
    onConnected: () => void,
    onDisconnected: () => void,
    onReconnecting: (attempt: number, delay: number) => void,
    onReconnectionFailed: () => void,
    onConnectionQualityChange: (quality: ConnectionStatus['connectionQuality']) => void,
    config: Partial<ReconnectionConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status = {
      isConnected: false,
      lastConnected: null,
      lastDisconnected: null,
      retryCount: 0,
      currentRetryDelay: this.config.initialRetryDelay,
      connectionQuality: 'none',
    };
    this.onConnected = onConnected;
    this.onDisconnected = onDisconnected;
    this.onReconnecting = onReconnecting;
    this.onReconnectionFailed = onReconnectionFailed;
    this.onConnectionQualityChange = onConnectionQualityChange;
  }

  /**
   * Report connection established
   */
  reportConnected(): void {
    if (!this.status.isConnected) {
      this.status.isConnected = true;
      this.status.lastConnected = new Date();
      this.status.retryCount = 0;
      this.status.currentRetryDelay = this.config.initialRetryDelay;
      this.stopReconnection();
      this.startHealthCheck();
      this.onConnected();
      console.log('[AutoReconnection] Connected');
    }
  }

  /**
   * Report connection lost
   */
  reportDisconnected(): void {
    if (this.status.isConnected) {
      this.status.isConnected = false;
      this.status.lastDisconnected = new Date();
      this.stopHealthCheck();
      this.onDisconnected();
      console.log('[AutoReconnection] Disconnected, starting reconnection...');
      this.startReconnection();
    }
  }

  /**
   * Start automatic reconnection
   */
  private startReconnection(): void {
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.scheduleNextRetry();
  }

  /**
   * Stop automatic reconnection
   */
  private stopReconnection(): void {
    this.isReconnecting = false;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Schedule next retry attempt
   */
  private scheduleNextRetry(): void {
    if (!this.isReconnecting) {
      return;
    }

    if (this.status.retryCount >= this.config.maxRetryAttempts) {
      this.stopReconnection();
      this.onReconnectionFailed();
      console.log('[AutoReconnection] Max retry attempts reached');
      return;
    }

    const delay = this.calculateRetryDelay();
    this.status.currentRetryDelay = delay;

    console.log(`[AutoReconnection] Retry attempt ${this.status.retryCount + 1}/${this.config.maxRetryAttempts} in ${delay}ms`);
    this.onReconnecting(this.status.retryCount + 1, delay);

    this.retryTimer = setTimeout(() => {
      this.attemptReconnection();
    }, delay);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(): number {
    const delay = this.config.initialRetryDelay * Math.pow(this.config.backoffMultiplier, this.status.retryCount);
    return Math.min(delay, this.config.maxRetryDelay);
  }

  /**
   * Attempt reconnection (to be implemented by caller)
   */
  private async attemptReconnection(): Promise<void> {
    this.status.retryCount++;

    // This is a placeholder - actual reconnection logic should be provided by caller
    // The caller should call reportConnected() or reportDisconnected() based on result
    console.log('[AutoReconnection] Attempting reconnection...');

    // Simulate connection attempt
    // In real implementation, this would trigger the actual reconnection logic
    // and the caller would report the result
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.checkConnectionQuality();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health check monitoring
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Check connection quality
   */
  private checkConnectionQuality(): void {
    // This is a placeholder - actual quality check should be provided by caller
    // The caller should update the connection quality based on actual metrics
    // For now, we'll default to 'good' if connected
    if (this.status.isConnected) {
      this.updateConnectionQuality('good');
    } else {
      this.updateConnectionQuality('none');
    }
  }

  /**
   * Update connection quality
   */
  updateConnectionQuality(quality: ConnectionStatus['connectionQuality']): void {
    if (this.status.connectionQuality !== quality) {
      this.status.connectionQuality = quality;
      this.onConnectionQualityChange(quality);
      console.log(`[AutoReconnection] Connection quality: ${quality}`);
    }
  }

  /**
   * Get current status
   */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Reset retry count
   */
  resetRetryCount(): void {
    this.status.retryCount = 0;
    this.status.currentRetryDelay = this.config.initialRetryDelay;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Stop auto-reconnection manager
   */
  stop(): void {
    this.stopReconnection();
    this.stopHealthCheck();
  }
}
