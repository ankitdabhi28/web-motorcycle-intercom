/**
 * One-Button Emergency Component
 *
 * Large, glove-friendly emergency button for quick emergency alerts.
 * Provides full-screen emergency button with automatic GPS location sharing.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRideStore } from "@/store";

interface EmergencyButtonProps {
  onEmergency?: (location: { lat: number; lng: number }) => void;
  className?: string;
}

export default function EmergencyButton({
  onEmergency,
  className = "",
}: EmergencyButtonProps) {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const { localRider } = useRideStore();
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);

  // Activate emergency
  const activateEmergency = useCallback(() => {
    setIsEmergencyActive(true);

    // Get current location from store or fallback to browser
    const location = localRider?.gpsLocation;
    if (location) {
      onEmergency?.(location);
    } else {
      // Fallback: try to get location from browser
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const loc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            onEmergency?.(loc);
          },
          (error) => {
            console.error("[EmergencyButton] Failed to get location:", error);
          },
        );
      }
    }

    // Auto-reset after 5 seconds
    setTimeout(() => {
      setIsEmergencyActive(false);
    }, 5000);
  }, [localRider, onEmergency]);

  const cancelEmergency = useCallback(() => {
    setIsEmergencyActive(false);
    setHoldProgress(0);
  }, []);

  // Handle emergency activation (long press to prevent accidental activation)
  const handleMouseDown = useCallback(() => {
    setHoldProgress(0);
    const timer = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          activateEmergency();
          return 100;
        }
        return prev + 10; // 1 second hold at 100ms intervals
      });
    }, 100);
    setHoldTimer(timer);
  }, [activateEmergency]);

  const handleMouseUp = useCallback(() => {
    if (holdTimer) {
      clearInterval(holdTimer);
      setHoldTimer(null);
    }
    setHoldProgress(0);
  }, [holdTimer]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleMouseDown();
    },
    [handleMouseDown],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleMouseUp();
    },
    [handleMouseUp],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimer) {
        clearInterval(holdTimer);
      }
    };
  }, [holdTimer]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {!isEmergencyActive ? (
        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative w-full h-32 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-2xl shadow-2xl transition-all duration-200 flex items-center justify-center group overflow-hidden"
          aria-label="Emergency button"
        >
          {/* Progress overlay */}
          <div
            className="absolute inset-0 bg-red-800 opacity-50 transition-opacity duration-100"
            style={{ opacity: holdProgress / 100 }}
          />

          {/* Emergency icon */}
          <div className="relative z-10 flex flex-col items-center">
            <svg
              className="w-16 h-16 text-white mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-white font-bold text-xl">EMERGENCY</span>
            <span className="text-white text-sm opacity-80">
              Hold to activate
            </span>
          </div>

          {/* Progress indicator */}
          {holdProgress > 0 && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{ width: `${holdProgress}%` }}
                />
              </div>
            </div>
          )}
        </button>
      ) : (
        /* Active emergency state */
        <div className="w-full h-32 bg-red-800 rounded-2xl shadow-2xl flex flex-col items-center justify-center animate-pulse">
          <svg
            className="w-16 h-16 text-white mb-2 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-white font-bold text-xl">EMERGENCY ACTIVE</span>
          <span className="text-white text-sm opacity-80">Location shared</span>
          <button
            onClick={cancelEmergency}
            className="mt-2 px-4 py-1 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
