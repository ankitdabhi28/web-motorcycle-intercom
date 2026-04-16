/**
 * React hook for Auto-Reconnection
 *
 * Integrates auto-reconnection functionality with the application,
 * providing smart retry logic and connection quality monitoring.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  AutoReconnection,
  ConnectionStatus,
  ReconnectionConfig,
} from "@/lib/autoReconnection";

export function useAutoReconnection(config: Partial<ReconnectionConfig> = {}) {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastConnected: null,
    lastDisconnected: null,
    retryCount: 0,
    currentRetryDelay: 1000,
    connectionQuality: "none",
  });

  const [reconnecting, setReconnecting] = useState(false);

  const autoReconnectionRef = useRef<AutoReconnection | null>(null);

  // Initialize AutoReconnection instance
  useEffect(() => {
    if (!autoReconnectionRef.current) {
      autoReconnectionRef.current = new AutoReconnection(
        () => {
          setStatus((prev) => ({
            ...prev,
            isConnected: true,
            lastConnected: new Date(),
            retryCount: 0,
            currentRetryDelay: 1000,
          }));
          setReconnecting(false);
        },
        () => {
          setStatus((prev) => ({
            ...prev,
            isConnected: false,
            lastDisconnected: new Date(),
          }));
          setReconnecting(true);
        },
        (attempt, delay) => {
          setStatus((prev) => ({
            ...prev,
            retryCount: attempt,
            currentRetryDelay: delay,
          }));
        },
        () => {
          setReconnecting(false);
          console.warn("[AutoReconnection] Reconnection failed");
        },
        (quality) => {
          setStatus((prev) => ({ ...prev, connectionQuality: quality }));
        },
        config
      );
    }

    return () => {
      if (autoReconnectionRef.current) {
        autoReconnectionRef.current.stop();
      }
    };
  }, [config]);

  // Report connection established
  const reportConnected = useCallback(() => {
    if (autoReconnectionRef.current) {
      autoReconnectionRef.current.reportConnected();
    }
  }, []);

  // Report connection lost
  const reportDisconnected = useCallback(() => {
    if (autoReconnectionRef.current) {
      autoReconnectionRef.current.reportDisconnected();
    }
  }, []);

  // Update connection quality
  const updateConnectionQuality = useCallback(
    (quality: ConnectionStatus["connectionQuality"]) => {
      if (autoReconnectionRef.current) {
        autoReconnectionRef.current.updateConnectionQuality(quality);
      }
    },
    []
  );

  // Reset retry count
  const resetRetryCount = useCallback(() => {
    if (autoReconnectionRef.current) {
      autoReconnectionRef.current.resetRetryCount();
    }
  }, []);

  // Get status
  const getStatus = useCallback(() => {
    if (autoReconnectionRef.current) {
      return autoReconnectionRef.current.getStatus();
    }
    return status;
  }, [status]);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<ReconnectionConfig>) => {
    if (autoReconnectionRef.current) {
      autoReconnectionRef.current.updateConfig(newConfig);
    }
  }, []);

  return {
    status,
    reconnecting,
    reportConnected,
    reportDisconnected,
    updateConnectionQuality,
    resetRetryCount,
    getStatus,
    updateConfig,
  };
}
