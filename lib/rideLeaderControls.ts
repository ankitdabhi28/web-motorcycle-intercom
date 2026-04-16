// Ride Leader Controls
// Allows ride leaders to control group audio and membership

export interface LeaderAction {
  actionId: string;
  leaderId: string;
  leaderName: string;
  type:
    | "MUTE_ALL"
    | "UNMUTE_ALL"
    | "MUTE_RIDER"
    | "UNMUTE_RIDER"
    | "KICK_RIDER";
  targetRiderId?: string;
  targetRiderName?: string;
  reason?: string;
  timestamp: number;
}

export interface LeaderControlsConfig {
  requireConfirmation: boolean;
  allowKickSelf: boolean;
  muteAllCooldown: number; // Minimum time between mute all actions (ms)
}

export class RideLeaderControls {
  private config: LeaderControlsConfig;
  private socket: unknown = null;
  private localRiderId: string = "";
  private isLeader: boolean = false;
  private lastMuteAllTime: number = 0;

  constructor(config: Partial<LeaderControlsConfig> = {}) {
    this.config = {
      requireConfirmation:
        config.requireConfirmation !== undefined
          ? config.requireConfirmation
          : true,
      allowKickSelf:
        config.allowKickSelf !== undefined ? config.allowKickSelf : false,
      muteAllCooldown: config.muteAllCooldown || 30000, // 30 seconds
    };
  }

  /**
   * Set socket instance for broadcasting leader actions
   */
  setSocket(socket: unknown): void {
    this.socket = socket;
    this.setupSocketListeners();
  }

  /**
   * Set local rider ID
   */
  setLocalRiderId(riderId: string): void {
    this.localRiderId = riderId;
  }

  /**
   * Set leader status
   */
  setIsLeader(isLeader: boolean): void {
    this.isLeader = isLeader;
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    (
      this.socket as {
        on: (event: string, callback: (data: unknown) => void) => void;
      }
    ).on("LEADER_ACTION", (action: unknown) => {
      this.handleLeaderAction(action as LeaderAction);
    });
  }

  /**
   * Handle incoming leader action from ride leader
   */
  private handleLeaderAction(action: LeaderAction): void {
    switch (action.type) {
      case "MUTE_ALL":
        this.handleMuteAll(action);
        break;
      case "UNMUTE_ALL":
        this.handleUnmuteAll(action);
        break;
      case "MUTE_RIDER":
        this.handleMuteRider(action);
        break;
      case "UNMUTE_RIDER":
        this.handleUnmuteRider(action);
        break;
      case "KICK_RIDER":
        this.handleKickRider(action);
        break;
    }
  }

  /**
   * Mute all riders in the ride
   */
  muteAll(reason?: string): LeaderAction | null {
    if (!this.isLeader) {
      console.warn("Only ride leaders can mute all riders");
      return null;
    }

    const now = Date.now();
    if (now - this.lastMuteAllTime < this.config.muteAllCooldown) {
      console.warn("Mute all action is on cooldown");
      return null;
    }

    this.lastMuteAllTime = now;

    const action: LeaderAction = {
      actionId: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      leaderId: this.localRiderId,
      leaderName: "", // Will be filled by caller
      type: "MUTE_ALL",
      reason,
      timestamp: now,
    };

    // Broadcast via socket
    if (this.socket) {
      (this.socket as { emit: (event: string, data: unknown) => void }).emit(
        "LEADER_ACTION",
        action,
      );
    }

    return action;
  }

  /**
   * Unmute all riders in the ride
   */
  unmuteAll(reason?: string): LeaderAction | null {
    if (!this.isLeader) {
      console.warn("Only ride leaders can unmute all riders");
      return null;
    }

    const action: LeaderAction = {
      actionId: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      leaderId: this.localRiderId,
      leaderName: "", // Will be filled by caller
      type: "UNMUTE_ALL",
      reason,
      timestamp: Date.now(),
    };

    // Broadcast via socket
    if (this.socket) {
      (this.socket as { emit: (event: string, data: unknown) => void }).emit(
        "LEADER_ACTION",
        action,
      );
    }

    return action;
  }

  /**
   * Mute a specific rider
   */
  muteRider(
    targetRiderId: string,
    targetRiderName: string,
    reason?: string,
  ): LeaderAction | null {
    if (!this.isLeader) {
      console.warn("Only ride leaders can mute riders");
      return null;
    }

    if (targetRiderId === this.localRiderId && !this.config.allowKickSelf) {
      console.warn("Leaders cannot mute themselves");
      return null;
    }

    const action: LeaderAction = {
      actionId: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      leaderId: this.localRiderId,
      leaderName: "", // Will be filled by caller
      type: "MUTE_RIDER",
      targetRiderId,
      targetRiderName,
      reason,
      timestamp: Date.now(),
    };

    // Broadcast via socket
    if (this.socket) {
      (this.socket as { emit: (event: string, data: unknown) => void }).emit(
        "LEADER_ACTION",
        action,
      );
    }

    return action;
  }

  /**
   * Unmute a specific rider
   */
  unmuteRider(
    targetRiderId: string,
    targetRiderName: string,
    reason?: string,
  ): LeaderAction | null {
    if (!this.isLeader) {
      console.warn("Only ride leaders can unmute riders");
      return null;
    }

    const action: LeaderAction = {
      actionId: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      leaderId: this.localRiderId,
      leaderName: "", // Will be filled by caller
      type: "UNMUTE_RIDER",
      targetRiderId,
      targetRiderName,
      reason,
      timestamp: Date.now(),
    };

    // Broadcast via socket
    if (this.socket) {
      (this.socket as { emit: (event: string, data: unknown) => void }).emit(
        "LEADER_ACTION",
        action,
      );
    }

    return action;
  }

  /**
   * Kick a rider from the ride
   */
  kickRider(
    targetRiderId: string,
    targetRiderName: string,
    reason?: string,
  ): LeaderAction | null {
    if (!this.isLeader) {
      console.warn("Only ride leaders can kick riders");
      return null;
    }

    if (targetRiderId === this.localRiderId && !this.config.allowKickSelf) {
      console.warn("Leaders cannot kick themselves");
      return null;
    }

    if (this.config.requireConfirmation) {
      const confirmed = confirm(
        `Are you sure you want to kick ${targetRiderName} from the ride?${reason ? `\nReason: ${reason}` : ""}`,
      );
      if (!confirmed) {
        return null;
      }
    }

    const action: LeaderAction = {
      actionId: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      leaderId: this.localRiderId,
      leaderName: "", // Will be filled by caller
      type: "KICK_RIDER",
      targetRiderId,
      targetRiderName,
      reason,
      timestamp: Date.now(),
    };

    // Broadcast via socket
    if (this.socket) {
      (this.socket as { emit: (event: string, data: unknown) => void }).emit(
        "LEADER_ACTION",
        action,
      );
    }

    return action;
  }

  /**
   * Handle mute all action
   */
  private handleMuteAll(action: LeaderAction): void {
    // This would be handled by the audio system
    // Dispatch event for UI to update
    window.dispatchEvent(
      new CustomEvent("leader-mute-all", {
        detail: action,
      }),
    );
  }

  /**
   * Handle unmute all action
   */
  private handleUnmuteAll(action: LeaderAction): void {
    // This would be handled by the audio system
    // Dispatch event for UI to update
    window.dispatchEvent(
      new CustomEvent("leader-unmute-all", {
        detail: action,
      }),
    );
  }

  /**
   * Handle mute rider action
   */
  private handleMuteRider(action: LeaderAction): void {
    if (action.targetRiderId === this.localRiderId) {
      // I was muted
      window.dispatchEvent(
        new CustomEvent("leader-muted-me", {
          detail: action,
        }),
      );
    }
  }

  /**
   * Handle unmute rider action
   */
  private handleUnmuteRider(action: LeaderAction): void {
    if (action.targetRiderId === this.localRiderId) {
      // I was unmuted
      window.dispatchEvent(
        new CustomEvent("leader-unmuted-me", {
          detail: action,
        }),
      );
    }
  }

  /**
   * Handle kick rider action
   */
  private handleKickRider(action: LeaderAction): void {
    if (action.targetRiderId === this.localRiderId) {
      // I was kicked
      window.dispatchEvent(
        new CustomEvent("leader-kicked-me", {
          detail: action,
        }),
      );
    }
  }

  /**
   * Check if can perform leader action
   */
  canPerformAction(): boolean {
    return this.isLeader;
  }

  /**
   * Get time until mute all cooldown expires
   */
  getMuteAllCooldownRemaining(): number {
    const now = Date.now();
    const elapsed = now - this.lastMuteAllTime;
    return Math.max(0, this.config.muteAllCooldown - elapsed);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LeaderControlsConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
let leaderControlsInstance: RideLeaderControls | null = null;

export function getRideLeaderControls(
  config?: Partial<LeaderControlsConfig>,
): RideLeaderControls {
  if (!leaderControlsInstance) {
    leaderControlsInstance = new RideLeaderControls(config);
  } else if (config) {
    leaderControlsInstance.updateConfig(config);
  }
  return leaderControlsInstance;
}

export function releaseRideLeaderControls(): void {
  leaderControlsInstance = null;
}
