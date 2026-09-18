const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function distanceBetweenMeters(pointA, pointB) {
  if (
    !Number.isFinite(Number(pointA?.latitude)) ||
    !Number.isFinite(Number(pointA?.longitude)) ||
    !Number.isFinite(Number(pointB?.latitude)) ||
    !Number.isFinite(Number(pointB?.longitude))
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const latitude1 = toRadians(Number(pointA.latitude));
  const latitude2 = toRadians(Number(pointB.latitude));
  const latitudeDelta = toRadians(
    Number(pointB.latitude) - Number(pointA.latitude),
  );
  const longitudeDelta = toRadians(
    Number(pointB.longitude) - Number(pointA.longitude),
  );

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_METERS * angularDistance;
}

export function sortDestinationsByDistance(items, currentLocation) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      ...item,
      distanceFromUserMeters: distanceBetweenMeters(currentLocation, item),
    }))
    .sort((a, b) => a.distanceFromUserMeters - b.distanceFromUserMeters);
}
