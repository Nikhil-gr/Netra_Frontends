import { useCallback, useEffect, useRef, useState } from "react";

const HIGH_ACCURACY_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
};

const FALLBACK_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 30000,
};

const normalizePosition = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  heading: Number.isFinite(position.coords.heading)
    ? position.coords.heading
    : null,
  speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
  timestamp: position.timestamp,
});

const getErrorMessage = (error) => {
  switch (error?.code) {
    case 1:
      return "Location permission was denied. Allow location access in your browser settings, then open Walk Assist again.";

    case 2:
      return "Your location is temporarily unavailable. Move to an area with a better GPS signal and try again.";

    case 3:
      return "Getting your location took too long. Please try again.";

    default:
      return "Unable to get your current location.";
  }
};

const getPosition = (options) =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

export function useGeolocation({ enabled = false } = {}) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef(null);

  const isSecure =
    typeof window !== "undefined" &&
    (window.isSecureContext || window.location.hostname === "localhost");

  const isSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator && isSecure;

  const stopTracking = useCallback(() => {
    if (
      typeof navigator !== "undefined" &&
      "geolocation" in navigator &&
      watchIdRef.current !== null
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = null;
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!isSecure) {
      setError(
        "Walk Assist location requires HTTPS on mobile. Open Netra using your HTTPS ngrok link.",
      );
      return false;
    }

    if (!isSupported) {
      setError("Location is not supported by this browser.");
      return false;
    }

    if (watchIdRef.current !== null) {
      return true;
    }

    setError(null);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation(normalizePosition(position));
        setError(null);
        setIsTracking(true);
      },
      (positionError) => {
        setError(getErrorMessage(positionError));
        setIsTracking(false);
      },
      HIGH_ACCURACY_OPTIONS,
    );

    return true;
  }, [isSecure, isSupported]);

  const getCurrentPosition = useCallback(async () => {
    if (!isSecure) {
      const message =
        "Walk Assist location requires HTTPS on mobile. Open Netra using your HTTPS ngrok link.";

      setError(message);
      throw new Error(message);
    }

    if (!isSupported) {
      const message = "Location is not supported by this browser.";

      setError(message);
      throw new Error(message);
    }

    setError(null);

    try {
      const position = await getPosition(HIGH_ACCURACY_OPTIONS);
      const nextLocation = normalizePosition(position);

      setLocation(nextLocation);
      return nextLocation;
    } catch (firstError) {
      if (firstError?.code === 1) {
        const message = getErrorMessage(firstError);
        setError(message);
        throw new Error(message);
      }

      try {
        const fallbackPosition = await getPosition(FALLBACK_OPTIONS);
        const nextLocation = normalizePosition(fallbackPosition);

        setLocation(nextLocation);
        return nextLocation;
      } catch (fallbackError) {
        const message = getErrorMessage(fallbackError);
        setError(message);
        throw new Error(message);
      }
    }
  }, [isSecure, isSupported]);

  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);

  return {
    location,
    error,
    isTracking,
    isSupported,
    isSecure,
    startTracking,
    stopTracking,
    getCurrentPosition,
  };
}
