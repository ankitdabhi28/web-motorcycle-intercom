/**
 * Bluetooth Mesh Network
 *
 * Provides local peer-to-peer communication via Bluetooth when cellular
 * coverage is unavailable, with message queuing for delivery when back online.
 */

// Bluetooth type definitions (Web Bluetooth API)
declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }

  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface RequestDeviceOptions {
    acceptAllDevices?: boolean;
    filters?: BluetoothLEScanFilter[];
    optionalServices?: string[];
  }

  interface BluetoothDevice {
    id: string;
    name: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(event: string, listener: (event: Event) => void): void;
    removeEventListener(event: string, listener: (event: Event) => void): void;
  }

  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(
      characteristic: string,
    ): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    value: DataView;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    startNotifications(): Promise<void>;
    stopNotifications(): Promise<void>;
    addEventListener(event: string, listener: (event: Event) => void): void;
    removeEventListener(event: string, listener: (event: Event) => void): void;
  }

  interface BluetoothLEScanFilter {
    services?: string[];
    name?: string;
    namePrefix?: string;
  }
}

export interface BluetoothPeer {
  id: string;
  name: string;
  deviceId: string;
  lastSeen: Date;
  signalStrength: number;
}

export interface MeshMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface QueuedMessage {
  id: string;
  targetPeerId: string;
  message: MeshMessage;
  timestamp: Date;
  priority: "high" | "medium" | "low";
  attempts: number;
}

export interface BluetoothMeshConfig {
  scanInterval: number; // ms
  connectionTimeout: number; // ms
  maxRetryAttempts: number;
  maxQueueSize: number;
}

const DEFAULT_CONFIG: BluetoothMeshConfig = {
  scanInterval: 5000, // Scan every 5 seconds
  connectionTimeout: 10000, // 10 seconds
  maxRetryAttempts: 3,
  maxQueueSize: 100,
};

export class BluetoothMesh {
  private config: BluetoothMeshConfig;
  private peers: Map<string, BluetoothPeer> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private isScanning: boolean = false;
  private scanTimer: NodeJS.Timeout | null = null;
  private queueProcessorTimer: NodeJS.Timeout | null = null;
  private bluetoothDevice: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  // Event callbacks
  private onPeerDiscovered: (peer: BluetoothPeer) => void;
  private onPeerConnected: (peerId: string) => void;
  private onPeerDisconnected: (peerId: string) => void;
  private onMessageReceived: (peerId: string, message: MeshMessage) => void;
  private onMessageDelivered: (messageId: string) => void;
  private onMessageFailed: (messageId: string) => void;

  constructor(
    onPeerDiscovered: (peer: BluetoothPeer) => void,
    onPeerConnected: (peerId: string) => void,
    onPeerDisconnected: (peerId: string) => void,
    onMessageReceived: (peerId: string, message: MeshMessage) => void,
    onMessageDelivered: (messageId: string) => void,
    onMessageFailed: (messageId: string) => void,
    config: Partial<BluetoothMeshConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onPeerDiscovered = onPeerDiscovered;
    this.onPeerConnected = onPeerConnected;
    this.onPeerDisconnected = onPeerDisconnected;
    this.onMessageReceived = onMessageReceived;
    this.onMessageDelivered = onMessageDelivered;
    this.onMessageFailed = onMessageFailed;
  }

  /**
   * Check if Bluetooth is available in the browser
   */
  static isBluetoothAvailable(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  /**
   * Start scanning for nearby Bluetooth devices
   */
  async startScanning(): Promise<void> {
    if (!BluetoothMesh.isBluetoothAvailable()) {
      throw new Error("Bluetooth is not available in this browser");
    }

    if (this.isScanning) {
      console.warn("[BluetoothMesh] Already scanning");
      return;
    }

    try {
      this.isScanning = true;
      console.log("[BluetoothMesh] Starting Bluetooth scan");

      // Request Bluetooth device
      this.bluetoothDevice = await (navigator.bluetooth?.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "device_information"],
      }) ?? Promise.reject(new Error("Bluetooth not available")));

      // Connect to device
      if (!this.bluetoothDevice) {
        throw new Error("Bluetooth device not available");
      }
      const gattServer = await this.bluetoothDevice.gatt?.connect();
      this.server = gattServer ?? null;
      if (!this.server) {
        throw new Error("Failed to connect to GATT server");
      }

      this.onPeerDiscovered({
        id: this.bluetoothDevice?.id || "unknown",
        name: this.bluetoothDevice?.name || "Unknown Device",
        deviceId: this.bluetoothDevice?.id || "unknown",
        lastSeen: new Date(),
        signalStrength: 0, // Will be updated by RSSI if available
      });

      this.onPeerConnected(this.bluetoothDevice?.id || "unknown");

      // Start periodic scanning
      this.scanTimer = setInterval(() => {
        this.scanForPeers();
      }, this.config.scanInterval);

      // Start message queue processor
      this.startQueueProcessor();

      console.log("[BluetoothMesh] Bluetooth scan started successfully");
    } catch (error) {
      this.isScanning = false;
      console.error("[BluetoothMesh] Failed to start scanning:", error);
      throw error;
    }
  }

  /**
   * Stop scanning for Bluetooth devices
   */
  stopScanning(): void {
    if (!this.isScanning) {
      return;
    }

    this.isScanning = false;

    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    if (this.queueProcessorTimer) {
      clearInterval(this.queueProcessorTimer);
      this.queueProcessorTimer = null;
    }

    if (this.server && this.server.connected) {
      this.server.disconnect();
    }

    console.log("[BluetoothMesh] Bluetooth scan stopped");
  }

  /**
   * Scan for nearby peers
   */
  private async scanForPeers(): Promise<void> {
    // In a real implementation, this would use Web Bluetooth API to discover devices
    // For now, this is a placeholder that simulates peer discovery
    console.log("[BluetoothMesh] Scanning for peers...");
  }

  /**
   * Send message to a peer via Bluetooth
   */
  async sendMessage(
    targetPeerId: string,
    message: MeshMessage,
    priority: "high" | "medium" | "low" = "medium",
  ): Promise<void> {
    const queuedMessage: QueuedMessage = {
      id: this.generateMessageId(),
      targetPeerId,
      message,
      timestamp: new Date(),
      priority,
      attempts: 0,
    };

    // Add to queue
    this.messageQueue.push(queuedMessage);

    // Trim queue if it exceeds max size
    if (this.messageQueue.length > this.config.maxQueueSize) {
      // Remove oldest low priority messages first
      this.messageQueue = this.messageQueue
        .filter((msg) => msg.priority !== "low" || msg.id === queuedMessage.id)
        .slice(0, this.config.maxQueueSize);
    }

    console.log("[BluetoothMesh] Message queued:", queuedMessage.id);
  }

  /**
   * Start processing message queue
   */
  private startQueueProcessor(): void {
    this.queueProcessorTimer = setInterval(() => {
      this.processMessageQueue();
    }, 1000); // Process queue every second
  }

  /**
   * Process message queue
   */
  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) {
      return;
    }

    // Sort by priority (high first)
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Try to send first message
    const message = this.messageQueue[0];

    try {
      await this.attemptMessageDelivery(message);
      this.messageQueue.shift(); // Remove from queue on success
      this.onMessageDelivered(message.id);
    } catch (error) {
      message.attempts++;

      if (message.attempts >= this.config.maxRetryAttempts) {
        this.messageQueue.shift(); // Remove from queue on failure
        this.onMessageFailed(message.id);
        console.error(
          "[BluetoothMesh] Message delivery failed:",
          message.id,
          error,
        );
      }
    }
  }

  /**
   * Attempt to deliver a message
   */
  private async attemptMessageDelivery(message: QueuedMessage): Promise<void> {
    const peer = this.peers.get(message.targetPeerId);

    if (!peer) {
      throw new Error(`Peer ${message.targetPeerId} not found`);
    }

    // In a real implementation, this would send the message via Bluetooth
    // For now, this is a placeholder
    console.log("[BluetoothMesh] Delivering message to peer:", peer.id);

    // Simulate delivery
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Get all discovered peers
   */
  getPeers(): BluetoothPeer[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get message queue status
   */
  getQueueStatus(): {
    total: number;
    byPriority: { high: number; medium: number; low: number };
  } {
    return {
      total: this.messageQueue.length,
      byPriority: {
        high: this.messageQueue.filter((m) => m.priority === "high").length,
        medium: this.messageQueue.filter((m) => m.priority === "medium").length,
        low: this.messageQueue.filter((m) => m.priority === "low").length,
      },
    };
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.messageQueue = [];
    console.log("[BluetoothMesh] Message queue cleared");
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BluetoothMeshConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if currently scanning
   */
  isBluetoothScanning(): boolean {
    return this.isScanning;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
