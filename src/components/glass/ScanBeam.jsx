export default function ScanBeam({ active = false }) {
  if (!active) {
    return null;
  }

  return (
    <div className="netra-scanbeam" aria-hidden="true">
      <div className="netra-scanbeam__grid" />
      <div className="netra-scanbeam__sweep">
        <div className="netra-scanbeam__trail" />
        <div className="netra-scanbeam__line" />
      </div>
    </div>
  );
}
