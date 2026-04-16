/**
 * React hook for Speed-Adaptive Audio
 *
 * Integrates speed-adaptive audio configuration with the application,
 * monitoring GPS speed and automatically adjusting audio settings.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  SpeedAdaptiveAudio,
  SpeedMode,
  SpeedAdaptiveConfig,
} from "@/lib/speedAdaptiveAudio";

export interface SpeedAdaptiveAudioState {
  currentMode: SpeedMode;
  currentSpeed: number;
  isMonitoring: boolean;
}

export function useSpeedAdaptiveAudio(
  getCurrentSpeed: () => number,
  onModeChange?: (mode: SpeedMode) => void,
) {
  const [state, setState] = useState<SpeedAdaptiveAudioState>({
    currentMode: {
      name: "city",
      speedThreshold: 35,
      noiseSuppression: "low",
      volume: 0.6,
      echoCancellation: true,
      windFilter: false,
    },
    currentSpeed: 0,
    isMonitoring: false,
  });

  const speedAdaptiveAudioRef = useRef<SpeedAdaptiveAudio | null>(null);
  const isMonitoringRef = useRef(false);

  // Initialize SpeedAdaptiveAudio instance
  useEffect(() => {
    if (!speedAdaptiveAudioRef.current) {
      speedAdaptiveAudioRef.current = new SpeedAdaptiveAudio((mode) => {
        setState((prev) => ({
          ...prev,
          currentMode: mode,
        }));
        onModeChange?.(mode);
      });
    }

    return () => {
      speedAdaptiveAudioRef.current?.stopMonitoring();
      isMonitoringRef.current = false;
    };
  }, [onModeChange]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (speedAdaptiveAudioRef.current && !isMonitoringRef.current) {
      speedAdaptiveAudioRef.current.startMonitoring(getCurrentSpeed);
      isMonitoringRef.current = true;
      setState((prev) => ({ ...prev, isMonitoring: true }));
    }
  }, [getCurrentSpeed]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (speedAdaptiveAudioRef.current && isMonitoringRef.current) {
      speedAdaptiveAudioRef.current.stopMonitoring();
      isMonitoringRef.current = false;
      setState((prev) => ({ ...prev, isMonitoring: false }));
    }
  }, []);

  // Update speed manually
  const updateSpeed = useCallback((speed: number) => {
    if (speedAdaptiveAudioRef.current) {
      speedAdaptiveAudioRef.current.updateSpeed(speed);
      setState((prev) => ({
        ...prev,
        currentSpeed: speed,
        currentMode: speedAdaptiveAudioRef.current!.getCurrentMode(),
      }));
    }
  }, []);

  const updateConfig = useCallback((config: Partial<SpeedAdaptiveConfig>) => {
    if (speedAdaptiveAudioRef.current) {
      speedAdaptiveAudioRef.current.updateConfig(config);
    }
  }, []);

  const resetConfig = useCallback(() => {
    if (speedAdaptiveAudioRef.current) {
      speedAdaptiveAudioRef.current.resetConfig();
    }
  }, []);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    updateSpeed,
    getCurrentMode: () => speedAdaptiveAudioRef.current?.getCurrentMode(),
    updateConfig,
    resetConfig,
  };
}
