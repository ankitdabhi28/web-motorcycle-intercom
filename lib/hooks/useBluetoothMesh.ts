/**
 * React hook for Bluetooth Mesh Network
 *
 * Integrates Bluetooth mesh functionality with the application,
 * providing peer discovery, messaging, and queue management.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  BluetoothMesh,
  BluetoothPeer,
  MeshMessage,
  BluetoothMeshConfig,
} from "@/lib/bluetoothMesh";

export interface BluetoothMeshState {
  isScanning: boolean;
  peers: BluetoothPeer[];
  queueStatus: {
    total: number;
    byPriority: { high: number; medium: number; low: number };
  };
  isBluetoothAvailable: boolean;
}

export function useBluetoothMesh(config: Partial<BluetoothMeshConfig> = {}) {
  const [state, setState] = useState<BluetoothMeshState>({
    isScanning: false,
    peers: [],
    queueStatus: {
      total: 0,
      byPriority: { high: 0, medium: 0, low: 0 },
    },
    isBluetoothAvailable: BluetoothMesh.isBluetoothAvailable(),
  });

  const bluetoothMeshRef = useRef<BluetoothMesh | null>(null);

  // Update queue status
  const updateQueueStatus = useCallback(() => {
    if (bluetoothMeshRef.current) {
      const queueStatus = bluetoothMeshRef.current.getQueueStatus();
      setState((prev) => ({ ...prev, queueStatus }));
    }
  }, []);

  // Initialize BluetoothMesh instance
  useEffect(() => {
    if (!bluetoothMeshRef.current && BluetoothMesh.isBluetoothAvailable()) {
      bluetoothMeshRef.current = new BluetoothMesh(
        (peer) => {
          setState((prev) => ({
            ...prev,
            peers: [...prev.peers, peer],
          }));
        },
        (peerId) => {
          console.log("[BluetoothMesh] Peer connected:", peerId);
        },
        (peerId) => {
          setState((prev) => ({
            ...prev,
            peers: prev.peers.filter((p) => p.id !== peerId),
          }));
        },
        (peerId, message) => {
          console.log(
            "[BluetoothMesh] Message received from:",
            peerId,
            message,
          );
        },
        (messageId) => {
          console.log("[BluetoothMesh] Message delivered:", messageId);
          updateQueueStatus();
        },
        (messageId) => {
          console.log("[BluetoothMesh] Message failed:", messageId);
          updateQueueStatus();
        },
        config,
      );
    }

    return () => {
      if (bluetoothMeshRef.current) {
        bluetoothMeshRef.current.stopScanning();
      }
    };
  }, [config, updateQueueStatus]);

  // Start scanning
  const startScanning = useCallback(async () => {
    if (!bluetoothMeshRef.current) {
      console.warn("[BluetoothMesh] Bluetooth mesh not initialized");
      return;
    }

    try {
      await bluetoothMeshRef.current.startScanning();
      setState((prev) => ({ ...prev, isScanning: true }));
    } catch (error) {
      console.error("[BluetoothMesh] Failed to start scanning:", error);
    }
  }, []);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (bluetoothMeshRef.current) {
      bluetoothMeshRef.current.stopScanning();
      setState((prev) => ({ ...prev, isScanning: false }));
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (
      targetPeerId: string,
      message: MeshMessage,
      priority: "high" | "medium" | "low" = "medium",
    ) => {
      if (!bluetoothMeshRef.current) {
        console.warn("[BluetoothMesh] Bluetooth mesh not initialized");
        return;
      }

      await bluetoothMeshRef.current.sendMessage(
        targetPeerId,
        message,
        priority,
      );
      updateQueueStatus();
    },
    [updateQueueStatus],
  );

  // Clear queue
  const clearQueue = useCallback(() => {
    if (bluetoothMeshRef.current) {
      bluetoothMeshRef.current.clearQueue();
      updateQueueStatus();
    }
  }, [updateQueueStatus]);

  // Update config
  const updateConfig = useCallback(
    (newConfig: Partial<BluetoothMeshConfig>) => {
      if (bluetoothMeshRef.current) {
        bluetoothMeshRef.current.updateConfig(newConfig);
      }
    },
    [],
  );

  return {
    ...state,
    startScanning,
    stopScanning,
    sendMessage,
    clearQueue,
    updateConfig,
  };
}
