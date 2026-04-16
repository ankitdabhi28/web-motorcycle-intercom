/**
 * Voice Commands Manager
 *
 * Handles glove-friendly voice control using Web Speech API
 * for commands like mute, emergency, and location queries.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Web Speech API types are browser-specific and complex, using any for compatibility

export interface VoiceCommand {
  phrase: string;
  action: (params?: string[]) => void;
  description: string;
}

export interface VoiceCommandConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  wakeWord: string;
}

const DEFAULT_CONFIG: VoiceCommandConfig = {
  language: "en-US",
  continuous: true,
  interimResults: true,
  maxAlternatives: 3,
  wakeWord: "Hey Intercom",
};

export interface VoiceRecognitionStatus {
  isListening: boolean;
  isSupported: boolean;
  lastCommand: string | null;
  lastRecognized: string | null;
  confidence: number | null;
}

export class VoiceCommands {
  private config: VoiceCommandConfig;
  private commands: Map<string, VoiceCommand> = new Map();
  private recognition: any = null;
  private isListening: boolean = false;
  private lastCommand: string | null = null;
  private lastRecognized: string | null = null;
  private confidence: number | null = null;

  // Event callbacks
  private onCommandRecognized: (command: string, params?: string[]) => void;
  private onListeningStart: () => void;
  private onListeningStop: () => void;
  private onError: (error: string) => void;

  constructor(
    onCommandRecognized: (command: string, params?: string[]) => void,
    onListeningStart: () => void,
    onListeningStop: () => void,
    onError: (error: string) => void,
    config: Partial<VoiceCommandConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onCommandRecognized = onCommandRecognized;
    this.onListeningStart = onListeningStart;
    this.onListeningStop = onListeningStop;
    this.onError = onError;

    this.initSpeechRecognition();
    this.registerDefaultCommands();
  }

  /**
   * Initialize speech recognition
   */
  private initSpeechRecognition(): void {
    if (typeof window !== "undefined" && (window as any).SpeechRecognition) {
      this.recognition = new (window as any).SpeechRecognition();
      this.setupRecognitionHandlers();
    } else if (
      typeof window !== "undefined" &&
      (window as any).webkitSpeechRecognition
    ) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.setupRecognitionHandlers();
    } else {
      console.warn("[VoiceCommands] Speech recognition not supported");
      this.onError("Speech recognition not supported in this browser");
    }
  }

  /**
   * Setup recognition event handlers
   */
  private setupRecognitionHandlers(): void {
    if (!this.recognition) return;

    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onListeningStart();
      console.log("[VoiceCommands] Listening started");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onListeningStop();
      console.log("[VoiceCommands] Listening stopped");

      // Restart if continuous mode
      if (this.config.continuous) {
        this.startListening();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[VoiceCommands] Recognition error:", event.error);
      this.onError(event.error);
    };
  }

  /**
   * Handle recognition result
   */
  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript.trim().toLowerCase();
    const conf = result[0].confidence;

    this.lastRecognized = transcript;
    this.confidence = conf;

    console.log(
      `[VoiceCommands] Recognized: "${transcript}" (confidence: ${conf})`,
    );

    // Check for wake word
    if (transcript.startsWith(this.config.wakeWord.toLowerCase())) {
      const commandText = transcript
        .replace(this.config.wakeWord.toLowerCase(), "")
        .trim();
      this.processCommand(commandText);
    }
  }

  /**
   * Process voice command
   */
  private processCommand(text: string): void {
    console.log(`[VoiceCommands] Processing command: "${text}"`);

    // Check against registered commands
    for (const [key, command] of this.commands) {
      const regex = new RegExp(key, "i");
      const match = text.match(regex);

      if (match) {
        // Extract parameters (everything after the command phrase)
        const params = text
          .replace(regex, "")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        this.lastCommand = command.phrase;
        this.onCommandRecognized(command.phrase, params);
        console.log(
          `[VoiceCommands] Command executed: ${command.phrase}`,
          params,
        );
        return;
      }
    }

    console.log(`[VoiceCommands] No matching command found for: "${text}"`);
  }

  /**
   * Register default commands
   */
  private registerDefaultCommands(): void {
    // Mute rider
    this.registerCommand(
      "mute (.+)",
      (params) => {
        console.log(`[VoiceCommands] Mute rider: ${params?.[0]}`);
      },
      "Mute a specific rider",
    );

    // Emergency
    this.registerCommand(
      "emergency",
      () => {
        console.log("[VoiceCommands] Emergency activated");
      },
      "Activate emergency alert",
    );

    // Where is rider
    this.registerCommand(
      "where is (.+)",
      (params) => {
        console.log(`[VoiceCommands] Where is rider: ${params?.[0]}`);
      },
      "Get location of a rider",
    );

    // Unmute
    this.registerCommand(
      "unmute (.+)",
      (params) => {
        console.log(`[VoiceCommands] Unmute rider: ${params?.[0]}`);
      },
      "Unmute a specific rider",
    );

    // Stop listening
    this.registerCommand(
      "stop listening",
      () => {
        this.stopListening();
      },
      "Stop voice recognition",
    );
  }

  /**
   * Register a custom command
   */
  registerCommand(
    phrase: string,
    action: (params?: string[]) => void,
    description: string,
  ): void {
    this.commands.set(phrase, { phrase, action, description });
    console.log(`[VoiceCommands] Registered command: "${phrase}"`);
  }

  /**
   * Unregister a command
   */
  unregisterCommand(phrase: string): void {
    this.commands.delete(phrase);
    console.log(`[VoiceCommands] Unregistered command: "${phrase}"`);
  }

  /**
   * Start listening
   */
  startListening(): void {
    if (!this.recognition) {
      this.onError("Speech recognition not available");
      return;
    }

    if (this.isListening) {
      console.warn("[VoiceCommands] Already listening");
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error("[VoiceCommands] Failed to start listening:", error);
      this.onError("Failed to start listening");
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error("[VoiceCommands] Failed to stop listening:", error);
      this.onError("Failed to stop listening");
    }
  }

  /**
   * Get current status
   */
  getStatus(): VoiceRecognitionStatus {
    return {
      isListening: this.isListening,
      isSupported: this.recognition !== null,
      lastCommand: this.lastCommand,
      lastRecognized: this.lastRecognized,
      confidence: this.confidence,
    };
  }

  /**
   * Get registered commands
   */
  getCommands(): VoiceCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceCommandConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.recognition) {
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
    }
  }

  /**
   * Check if speech recognition is supported
   */
  static isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }
}
