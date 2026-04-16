import { useState, useEffect } from "react";

interface GeolocationError {
  code: number;
  message: string;
}

export function useGeolocation(options?: PositionOptions) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setError({ code: 0, message: "Geolocation is not supported" });
      setLoading(false);
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      setPosition(pos);
      setLoading(false);
    };

    const onError = (err: GeolocationPositionError) => {
      setError({ code: err.code, message: err.message });
      setLoading(false);
    };

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
      ...options,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [options]);

  return { position, error, loading };
}
