const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
};

export async function openWalkAssist({ navigate, setWalkInitialLocation }) {
  setWalkInitialLocation(null);
  if (navigator.geolocation && (window.isSecureContext || window.location.hostname === "localhost")) {
    await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setWalkInitialLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
            speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
            timestamp: position.timestamp,
          });
          resolve();
        },
        () => resolve(),
        LOCATION_OPTIONS,
      );
    });
  }
  navigate("/walk-assist");
}
