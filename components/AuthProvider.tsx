/**
 * Authentication Provider Component
 *
 * Wraps the application to handle authentication initialization
 * and displays loading spinner during auth check
 */

"use client";

import { useEffect } from "react";
import { useRideStore } from "@/store";
import LoadingSpinner from "./LoadingSpinner";
import { setupAxiosInterceptor } from "@/lib/auth";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initializeAuth, isAuthLoading } = useRideStore();

  useEffect(() => {
    // Setup axios interceptor for token refresh
    setupAxiosInterceptor();

    // Initialize authentication on app load
    initializeAuth();
  }, [initializeAuth]);

  if (isAuthLoading) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
