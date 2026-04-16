/**
 * React hook for Battery Optimizer
 *
 * Integrates battery optimization with the application,
 * providing power mode management and battery status monitoring.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  BatteryOptimizer,
  PowerMode,
  BatteryStatus,
  BatteryConfig,
} from "@/lib/batteryOptimizer";

export function useBatteryOptimizer(
  config: Partial<BatteryConfig> = {}
) {
  const [status, setStatus] = useState<BatteryStatus>({
    mode: PowerMode.ACTIVE,
    batteryLevel: null,
    isCharging: null,
    lastActivity: new Date(),
    estimatedTimeRemaining: null,
  });

  const [pollingInterval, setPollingInterval] = useState(1000);
  const [webRTCBitrate, setWebRTCBitrate] = useState(128);

  const batteryOptimizerRef = useRef<BatteryOptimizer | null>(null);

  // Initialize BatteryOptimizer instance
  useEffect(() => {
    if (!batteryOptimizerRef.current) {
      batteryOptimizerRef.current = new BatteryOptimizer(
        (mode) => {
          setStatus((prev) => ({ ...prev, mode }));
        },
        (interval) => {
          setPollingInterval(interval);
        },
        (bitrate) => {
          setWebRTCBitrate(bitrate);
        },
        (level) => {
          console.warn(`[BatteryOptimizer] Low battery: ${level}%`);
        },
        config
      );
    }

    return () => {
      if (batteryOptimizerRef.current) {
        batteryOptimizerRef.current.stop();
      }
    };
  }, [config]);

  // Report activity
  const reportActivity = useCallback(() => {
    if (batteryOptimizerRef.current) {
      batteryOptimizerRef.current.reportActivity();
      setStatus((prev) => ({ ...prev, lastActivity: new Date() }));
    }
  }, []);

  // Report voice activity
  const reportVoiceActivity = useCallback((level: number) => {
    if (batteryOptimizerRef.current) {
      batteryOptimizerRef.current.reportVoiceActivity(level);
    }
  }, []);

  // Get status
  const getStatus = useCallback(() => {
    if (batteryOptimizerRef.current) {
      return batteryOptimizerRef.current.getStatus();
    }
    return status;
  }, [status]);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<BatteryConfig>) => {
    if (batteryOptimizerRef.current) {
      batteryOptimizerRef.current.updateConfig(newConfig);
    }
  }, []);

  // Reset config
  const resetConfig = useCallback(() => {
    if (batteryOptimizerRef.current) {
      batteryOptimizerRef.current.resetConfig();
    }
  }, []);

  return {
    status,
    pollingInterval,
    webRTCBitrate,
    reportActivity,
    reportVoiceActivity,
    getStatus,
    updateConfig,
    resetConfig,
  };
}
