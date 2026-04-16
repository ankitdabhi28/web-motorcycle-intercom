/**
 * React hook for Location Sharing
 *
 * Integrates location sharing functionality with the application,
 * providing "Where are you?" feature for separated riders.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  LocationSharing,
  LocationRequest,
  LocationSharingConfig,
  RendezvousPoint,
} from "@/lib/locationSharing";

export function useLocationSharing(
  config: Partial<LocationSharingConfig> = {},
) {
  const [pendingRequests, setPendingRequests] = useState<LocationRequest[]>([]);
  const [activeSharing, setActiveSharing] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [privacyMode, setPrivacyMode] = useState(false);
  const [lastRendezvousPoint, setLastRendezvousPoint] =
    useState<RendezvousPoint | null>(null);

  const locationSharingRef = useRef<LocationSharing | null>(null);

  // Update pending requests
  const updatePendingRequests = useCallback((riderId: string) => {
    if (!locationSharingRef.current) return;
    const requests = locationSharingRef.current.getPendingRequests(riderId);
    setPendingRequests(requests);
  }, []);

  // Update active sharing
  const updateActiveSharing = useCallback((riderId: string) => {
    if (!locationSharingRef.current) return;
    const sharing = locationSharingRef.current.getActiveSharing(riderId);
    setActiveSharing((prev) => new Map(prev).set(riderId, sharing));
  }, []);

  // Initialize LocationSharing instance
  useEffect(() => {
    if (!locationSharingRef.current) {
      locationSharingRef.current = new LocationSharing(
        (request) => {
          console.log(
            "[useLocationSharing] Location request received:",
            request,
          );
        },
        (request) => {
          console.log(
            "[useLocationSharing] Location request accepted:",
            request,
          );
        },
        (request) => {
          console.log(
            "[useLocationSharing] Location request declined:",
            request,
          );
        },
        (fromId, toId) => {
          console.log(
            "[useLocationSharing] Location shared:",
            fromId,
            "->",
            toId,
          );
        },
        (riderId, distance) => {
          console.log(
            "[useLocationSharing] Separation detected:",
            riderId,
            distance,
          );
        },
        config,
      );
    }

    return () => {
      // Cleanup if needed
    };
  }, [config]);

  // Request location from a rider
  const requestLocation = useCallback(
    (requesterId: string, targetId: string) => {
      if (!locationSharingRef.current) return;
      return locationSharingRef.current.requestLocation(requesterId, targetId);
    },
    [],
  );

  // Accept location request
  const acceptLocationRequest = useCallback(
    (requestId: string, location: { lat: number; lng: number }) => {
      if (!locationSharingRef.current) return;
      locationSharingRef.current.acceptLocationRequest(requestId, location);
    },
    [],
  );

  // Decline location request
  const declineLocationRequest = useCallback((requestId: string) => {
    if (!locationSharingRef.current) return;
    locationSharingRef.current.declineLocationRequest(requestId);
  }, []);

  // Share location with another rider
  const shareLocation = useCallback(
    (fromId: string, toId: string, location: { lat: number; lng: number }) => {
      if (!locationSharingRef.current) return;
      locationSharingRef.current.shareLocation(fromId, toId, location);
    },
    [],
  );

  // Check separation between riders
  const checkSeparation = useCallback(
    (
      riderId: string,
      riderLocation: { lat: number; lng: number },
      otherRiders: Map<string, { lat: number; lng: number }>,
    ) => {
      if (!locationSharingRef.current) return;
      locationSharingRef.current.checkSeparation(
        riderId,
        riderLocation,
        otherRiders,
      );
    },
    [],
  );

  // Suggest rendezvous point
  const suggestRendezvousPoint = useCallback(
    (
      loc1: { lat: number; lng: number },
      loc2: { lat: number; lng: number },
    ) => {
      if (!locationSharingRef.current) return null;
      const point = locationSharingRef.current.suggestRendezvousPoint(
        loc1,
        loc2,
      );
      setLastRendezvousPoint(point);
      return point;
    },
    [],
  );

  // Get pending requests
  const getPendingRequests = useCallback((riderId: string) => {
    if (!locationSharingRef.current) return [];
    return locationSharingRef.current.getPendingRequests(riderId);
  }, []);

  // Get active sharing
  const getActiveSharing = useCallback((riderId: string) => {
    if (!locationSharingRef.current) return [];
    return locationSharingRef.current.getActiveSharing(riderId);
  }, []);

  // Stop sharing location
  const stopSharing = useCallback((fromId: string, toId: string) => {
    if (!locationSharingRef.current) return;
    locationSharingRef.current.stopSharing(fromId, toId);
  }, []);

  // Update config
  const updateConfig = useCallback(
    (newConfig: Partial<LocationSharingConfig>) => {
      if (!locationSharingRef.current) return;
      locationSharingRef.current.updateConfig(newConfig);
    },
    [],
  );

  // Toggle privacy mode
  const togglePrivacyMode = useCallback(() => {
    if (!locationSharingRef.current) return;
    locationSharingRef.current.togglePrivacyMode();
    setPrivacyMode((prev) => !prev);
  }, []);

  return {
    pendingRequests,
    activeSharing,
    privacyMode,
    lastRendezvousPoint,
    requestLocation,
    acceptLocationRequest,
    declineLocationRequest,
    shareLocation,
    checkSeparation,
    suggestRendezvousPoint,
    getPendingRequests,
    getActiveSharing,
    stopSharing,
    updateConfig,
    togglePrivacyMode,
    updatePendingRequests,
    updateActiveSharing,
  };
}
