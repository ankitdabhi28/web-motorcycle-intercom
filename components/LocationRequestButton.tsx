/**
 * Location Request Button Component
 *
 * One-tap location request button for separated riders with
 * accept/decline UI for incoming requests.
 */

"use client";

import { useState } from "react";

interface LocationRequestButtonProps {
  onRequestLocation: (targetId: string) => void;
  onAcceptRequest?: (requestId: string) => void;
  onDeclineRequest?: (requestId: string) => void;
  targetId: string;
  targetName: string;
  className?: string;
}

export default function LocationRequestButton({
  onRequestLocation,
  onAcceptRequest,
  onDeclineRequest,
  targetId,
  targetName,
  className = "",
}: LocationRequestButtonProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestLocation = () => {
    setIsRequesting(true);
    onRequestLocation(targetId);
    setTimeout(() => setIsRequesting(false), 2000);
  };

  return (
    <button
      onClick={handleRequestLocation}
      disabled={isRequesting}
      className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg shadow transition-colors ${className}`}
      aria-label={`Request location from ${targetName}`}
    >
      {isRequesting ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Requesting...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Where is {targetName}?
        </span>
      )}
    </button>
  );
}
