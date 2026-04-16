"use client";

import { useEffect, useState, useCallback } from "react";
import { getVAD, releaseVAD, VADConfig } from "@/lib/voiceActivityDetection";

export function useVoiceActivityDetection(config?: Partial<VADConfig>) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    try {
      setError(null);
      const vad = getVAD(config);
      await vad.initialize();
      setIsInitialized(true);
      
      vad.start((speaking) => {
        setIsSpeaking(speaking);
      });
      
      // Start polling for audio level
      const interval = setInterval(() => {
        setAudioLevel(vad.getAudioLevel());
      }, 100);
      
      return () => {
        clearInterval(interval);
        vad.stop();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize VAD");
      console.error("VAD initialization error:", err);
    }
  }, [config]);

  const stop = useCallback(() => {
    releaseVAD();
    setIsInitialized(false);
    setIsSpeaking(false);
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isSpeaking,
    audioLevel,
    isInitialized,
    error,
    initialize,
    stop,
  };
}
