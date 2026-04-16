/**
 * Location Sharing Manager
 *
 * Handles "Where are you?" feature for separated riders with automatic
 * location sharing when >500m apart and rendezvous point suggestions.
 */

export interface LocationRequest {
  id: string;
  requesterId: string;
  targetId: string;
  timestamp: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface LocationSharingConfig {
  separationThreshold: number; // meters
  requestTimeout: number; // ms
  autoShareOnSeparation: boolean;
  privacyMode: boolean;
}

const DEFAULT_CONFIG: LocationSharingConfig = {
  separationThreshold: 500, // 500 meters
  requestTimeout: 60000, // 60 seconds
  autoShareOnSeparation: true,
  privacyMode: false,
};

export interface RendezvousPoint {
  lat: number;
  lng: number;
  name: string;
  distance: number; // meters from requester
  distanceFromTarget: number; // meters from target
}

export class LocationSharing {
  private config: LocationSharingConfig;
  private locationRequests: Map<string, LocationRequest> = new Map();
  private activeSharing: Map<string, Set<string>> = new Map(); // riderId -> Set of riderIds sharing with

  // Event callbacks
  private onLocationRequestReceived: (request: LocationRequest) => void;
  private onLocationRequestAccepted: (request: LocationRequest) => void;
  private onLocationRequestDeclined: (request: LocationRequest) => void;
  private onLocationShared: (fromId: string, toId: string, location: { lat: number; lng: number }) => void;
  private onSeparationDetected: (riderId: string, distance: number) => void;

  constructor(
    onLocationRequestReceived: (request: LocationRequest) => void,
    onLocationRequestAccepted: (request: LocationRequest) => void,
    onLocationRequestDeclined: (request: LocationRequest) => void,
    onLocationShared: (fromId: string, toId: string, location: { lat: number; lng: number }) => void,
    onSeparationDetected: (riderId: string, distance: number) => void,
    config: Partial<LocationSharingConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onLocationRequestReceived = onLocationRequestReceived;
    this.onLocationRequestAccepted = onLocationRequestAccepted;
    this.onLocationRequestDeclined = onLocationRequestDeclined;
    this.onLocationShared = onLocationShared;
    this.onSeparationDetected = onSeparationDetected;
  }

  /**
   * Request location from a rider
   */
  requestLocation(requesterId: string, targetId: string): LocationRequest {
    const request: LocationRequest = {
      id: this.generateRequestId(),
      requesterId,
      targetId,
      timestamp: new Date(),
      status: 'pending',
    };

    this.locationRequests.set(request.id, request);
    this.onLocationRequestReceived(request);

    // Set timeout for request expiration
    setTimeout(() => {
      const currentRequest = this.locationRequests.get(request.id);
      if (currentRequest && currentRequest.status === 'pending') {
        currentRequest.status = 'expired';
        this.locationRequests.set(request.id, currentRequest);
      }
    }, this.config.requestTimeout);

    return request;
  }

  /**
   * Accept location request
   */
  acceptLocationRequest(requestId: string, location: { lat: number; lng: number }): void {
    const request = this.locationRequests.get(requestId);
    if (!request) {
      return;
    }

    request.status = 'accepted';
    this.locationRequests.set(requestId, request);
    this.onLocationRequestAccepted(request);
    this.shareLocation(request.targetId, request.requesterId, location);
  }

  /**
   * Decline location request
   */
  declineLocationRequest(requestId: string): void {
    const request = this.locationRequests.get(requestId);
    if (!request) {
      return;
    }

    request.status = 'declined';
    this.locationRequests.set(requestId, request);
    this.onLocationRequestDeclined(request);
  }

  /**
   * Share location with another rider
   */
  shareLocation(fromId: string, toId: string, location: { lat: number; lng: number }): void {
    if (this.config.privacyMode) {
      console.warn('[LocationSharing] Privacy mode enabled, location not shared');
      return;
    }

    // Add to active sharing
    if (!this.activeSharing.has(fromId)) {
      this.activeSharing.set(fromId, new Set());
    }
    this.activeSharing.get(fromId)!.add(toId);

    this.onLocationShared(fromId, toId, location);
  }

  /**
   * Check separation between riders and trigger auto-sharing
   */
  checkSeparation(
    riderId: string,
    riderLocation: { lat: number; lng: number },
    otherRiders: Map<string, { lat: number; lng: number }>
  ): void {
    if (!this.config.autoShareOnSeparation) {
      return;
    }

    for (const [otherId, otherLocation] of otherRiders) {
      if (otherId === riderId) {
        continue;
      }

      const distance = this.calculateDistance(riderLocation, otherLocation);

      if (distance > this.config.separationThreshold) {
        this.onSeparationDetected(riderId, distance);

        // Auto-share location if separated
        this.shareLocation(riderId, otherId, riderLocation);
      }
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number }
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (loc1.lat * Math.PI) / 180;
    const φ2 = (loc2.lat * Math.PI) / 180;
    const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Suggest rendezvous point between two locations
   */
  suggestRendezvousPoint(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number }
  ): RendezvousPoint {
    // Simple midpoint calculation
    const midLat = (loc1.lat + loc2.lat) / 2;
    const midLng = (loc1.lng + loc2.lng) / 2;

    const distanceFrom1 = this.calculateDistance(loc1, { lat: midLat, lng: midLng });
    const distanceFrom2 = this.calculateDistance(loc2, { lat: midLat, lng: midLng });

    return {
      lat: midLat,
      lng: midLng,
      name: 'Midpoint',
      distance: distanceFrom1,
      distanceFromTarget: distanceFrom2,
    };
  }

  /**
   * Get pending requests for a rider
   */
  getPendingRequests(riderId: string): LocationRequest[] {
    return Array.from(this.locationRequests.values()).filter(
      (req) => req.targetId === riderId && req.status === 'pending'
    );
  }

  /**
   * Get active sharing for a rider
   */
  getActiveSharing(riderId: string): string[] {
    return Array.from(this.activeSharing.get(riderId) || []);
  }

  /**
   * Stop sharing location with a rider
   */
  stopSharing(fromId: string, toId: string): void {
    const sharingSet = this.activeSharing.get(fromId);
    if (sharingSet) {
      sharingSet.delete(toId);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LocationSharingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Toggle privacy mode
   */
  togglePrivacyMode(): void {
    this.config.privacyMode = !this.config.privacyMode;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
