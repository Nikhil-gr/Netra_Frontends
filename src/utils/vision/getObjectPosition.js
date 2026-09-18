export function getObjectPosition(bbox, frameWidth) {
  if (!bbox || !frameWidth) {
    return "unclear";
  }

  const [x, , width] = bbox;

  const objectCenter = x + width / 2;

  const positionRatio = objectCenter / frameWidth;

  if (positionRatio < 0.35) {
    return "left";
  }

  if (positionRatio > 0.65) {
    return "right";
  }

  return "center";
}
