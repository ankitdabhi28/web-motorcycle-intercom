/**
 * React hook for Helmet Audio Calibration
 *
 * Integrates helmet audio calibration with the application,
 * providing setup wizard for different helmet speakers/mics.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  HelmetCalibration,
  HelmetProfile,
  AudioSettings,
  CalibrationConfig,
} from "@/lib/helmetCalibration";

export function useHelmetCalibration(config: Partial<CalibrationConfig> = {}) {
  const [profiles, setProfiles] = useState<HelmetProfile[]>([]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [lastCompletedProfile, setLastCompletedProfile] = useState<HelmetProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const helmetCalibrationRef = useRef<HelmetCalibration | null>(null);

  // Initialize HelmetCalibration instance
  useEffect(() => {
    if (!helmetCalibrationRef.current) {
      helmetCalibrationRef.current = new HelmetCalibration(
        (step) => {
          setCurrentStep(step);
        },
        (profile) => {
          setLastCompletedProfile(profile);
          setProfiles(helmetCalibrationRef.current!.getProfiles());
        },
        (err) => {
          setError(err);
        },
        config
      );

      // Load initial profiles
      setProfiles(helmetCalibrationRef.current.getProfiles());
      setTotalSteps(helmetCalibrationRef.current.getStatus().totalSteps);
    }

    return () => {
      if (helmetCalibrationRef.current) {
        helmetCalibrationRef.current.cancelCalibration();
      }
    };
  }, [config]);

  // Start calibration
  const startCalibration = useCallback(
    async (
      helmetName: string,
      brand: string,
      model: string,
      initialSettings?: Partial<AudioSettings>
    ) => {
      if (!helmetCalibrationRef.current) {
        return;
      }

      setError(null);
      setIsCalibrating(true);
      setCurrentStep(0);

      try {
        await helmetCalibrationRef.current.startCalibration(
          helmetName,
          brand,
          model,
          initialSettings
        );
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsCalibrating(false);
      }
    },
    []
  );

  // Cancel calibration
  const cancelCalibration = useCallback(() => {
    if (helmetCalibrationRef.current) {
      helmetCalibrationRef.current.cancelCalibration();
      setIsCalibrating(false);
      setCurrentStep(0);
    }
  }, []);

  // Save settings during calibration
  const saveSettings = useCallback((settings: Partial<AudioSettings>) => {
    if (helmetCalibrationRef.current) {
      helmetCalibrationRef.current.saveSettings(settings);
    }
  }, []);

  // Get profile by ID
  const getProfile = useCallback((id: string) => {
    if (helmetCalibrationRef.current) {
      return helmetCalibrationRef.current.getProfile(id);
    }
    return undefined;
  }, []);

  // Delete profile
  const deleteProfile = useCallback((id: string) => {
    if (helmetCalibrationRef.current) {
      helmetCalibrationRef.current.deleteProfile(id);
      setProfiles(helmetCalibrationRef.current.getProfiles());
    }
  }, []);

  // Update profile
  const updateProfile = useCallback((id: string, updates: Partial<HelmetProfile>) => {
    if (helmetCalibrationRef.current) {
      helmetCalibrationRef.current.updateProfile(id, updates);
      setProfiles(helmetCalibrationRef.current.getProfiles());
    }
  }, []);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<CalibrationConfig>) => {
    if (helmetCalibrationRef.current) {
      helmetCalibrationRef.current.updateConfig(newConfig);
      setTotalSteps(helmetCalibrationRef.current.getStatus().totalSteps);
    }
  }, []);

  // Get status
  const getStatus = useCallback(() => {
    if (helmetCalibrationRef.current) {
      return helmetCalibrationRef.current.getStatus();
    }
    return { isCalibrating: false, currentStep: 0, totalSteps: 0 };
  }, []);

  return {
    profiles,
    isCalibrating,
    currentStep,
    totalSteps,
    lastCompletedProfile,
    error,
    startCalibration,
    cancelCalibration,
    saveSettings,
    getProfile,
    deleteProfile,
    updateProfile,
    updateConfig,
    getStatus,
  };
}
