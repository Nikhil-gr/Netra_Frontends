export function getObjectPosition(bbox, frameWidth) {
  if (!bbox || !frameWidth) {
    return "unclear";
  }

  const [x, , width] = bbox;

  const leftEdgeRatio = x / frameWidth;

  const rightEdgeRatio = (x + width) / frameWidth;

  const centerLeft = 0.34;

  const centerRight = 0.66;

  if (rightEdgeRatio < centerLeft) {
    return "left";
  }

  if (leftEdgeRatio > centerRight) {
    return "right";
  }

  return "center";
}
