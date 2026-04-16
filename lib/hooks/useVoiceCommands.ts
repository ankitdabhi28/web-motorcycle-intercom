/**
 * React hook for Voice Commands
 *
 * Integrates voice command functionality with the application,
 * providing glove-friendly voice control for intercom features.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  VoiceCommands,
  VoiceRecognitionStatus,
  VoiceCommandConfig,
  VoiceCommand,
} from "@/lib/voiceCommands";

export function useVoiceCommands(config: Partial<VoiceCommandConfig> = {}) {
  const [status, setStatus] = useState<VoiceRecognitionStatus>({
    isListening: false,
    isSupported: VoiceCommands.isSupported(),
    lastCommand: null,
    lastRecognized: null,
    confidence: null,
  });

  const [commands, setCommands] = useState<VoiceCommand[]>([]);

  const voiceCommandsRef = useRef<VoiceCommands | null>(null);

  // Initialize VoiceCommands instance
  useEffect(() => {
    if (!voiceCommandsRef.current) {
      voiceCommandsRef.current = new VoiceCommands(
        (command, params) => {
          setStatus((prev) => ({ ...prev, lastCommand: command }));
          console.log("[useVoiceCommands] Command recognized:", command, params);
        },
        () => {
          setStatus((prev) => ({ ...prev, isListening: true }));
        },
        () => {
          setStatus((prev) => ({ ...prev, isListening: false }));
        },
        (error) => {
          console.error("[useVoiceCommands] Error:", error);
        },
        config
      );

      // Load registered commands
      setCommands(voiceCommandsRef.current.getCommands());
    }

    return () => {
      if (voiceCommandsRef.current) {
        voiceCommandsRef.current.stopListening();
      }
    };
  }, [config]);

  // Start listening
  const startListening = useCallback(() => {
    if (voiceCommandsRef.current) {
      voiceCommandsRef.current.startListening();
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (voiceCommandsRef.current) {
      voiceCommandsRef.current.stopListening();
    }
  }, []);

  // Register custom command
  const registerCommand = useCallback(
    (phrase: string, action: (params?: string[]) => void, description: string) => {
      if (voiceCommandsRef.current) {
        voiceCommandsRef.current.registerCommand(phrase, action, description);
        setCommands(voiceCommandsRef.current.getCommands());
      }
    },
    []
  );

  // Unregister command
  const unregisterCommand = useCallback((phrase: string) => {
    if (voiceCommandsRef.current) {
      voiceCommandsRef.current.unregisterCommand(phrase);
      setCommands(voiceCommandsRef.current.getCommands());
    }
  }, []);

  // Get status
  const getStatus = useCallback(() => {
    if (voiceCommandsRef.current) {
      return voiceCommandsRef.current.getStatus();
    }
    return status;
  }, [status]);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<VoiceCommandConfig>) => {
    if (voiceCommandsRef.current) {
      voiceCommandsRef.current.updateConfig(newConfig);
    }
  }, []);

  return {
    status,
    commands,
    startListening,
    stopListening,
    registerCommand,
    unregisterCommand,
    getStatus,
    updateConfig,
    isSupported: VoiceCommands.isSupported(),
  };
}
