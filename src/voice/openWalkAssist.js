export function openWalkAssist({ navigate }) {
  // Enter Walk Assist immediately.
  // Location belongs to WalkAssitPage, where the existing flow can reuse a fresh
  // location or request one once. Do not block Home for up to 15 seconds first.
  navigate("/walk-assist");
}
