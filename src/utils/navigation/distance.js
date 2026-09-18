const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function distanceBetweenMeters(pointA, pointB) {
  if (
    !Number.isFinite(pointA?.latitude) ||
    !Number.isFinite(pointA?.longitude) ||
    !Number.isFinite(pointB?.latitude) ||
    !Number.isFinite(pointB?.longitude)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const latitude1 = toRadians(pointA.latitude);
  const latitude2 = toRadians(pointB.latitude);
  const latitudeDelta = toRadians(pointB.latitude - pointA.latitude);
  const longitudeDelta = toRadians(pointB.longitude - pointA.longitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_METERS * angularDistance;
}
