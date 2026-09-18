import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 3000,
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
      return "Location permission was denied. Enable location access to use Walk Assist.";

    case 2:
      return "Your current location is unavailable right now.";

    case 3:
      return "Getting your location took too long. Please try again.";

    default:
      return "Unable to get your current location.";
  }
};

export function useGeolocation({ enabled = false } = {}) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef(null);

  const isSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const stopTracking = useCallback(() => {
    if (isSupported && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = null;
    setIsTracking(false);
  }, [isSupported]);

  const startTracking = useCallback(() => {
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
      },
      DEFAULT_OPTIONS,
    );

    return true;
  }, [isSupported]);

  const getCurrentPosition = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (!isSupported) {
          const message = "Location is not supported by this browser.";
          setError(message);
          reject(new Error(message));
          return;
        }

        setError(null);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const nextLocation = normalizePosition(position);
            setLocation(nextLocation);
            resolve(nextLocation);
          },
          (positionError) => {
            const message = getErrorMessage(positionError);
            setError(message);
            reject(new Error(message));
          },
          DEFAULT_OPTIONS,
        );
      }),
    [isSupported],
  );

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
    startTracking,
    stopTracking,
    getCurrentPosition,
  };
}
