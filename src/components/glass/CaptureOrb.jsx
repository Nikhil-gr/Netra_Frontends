import { forwardRef, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";

const CaptureOrb = forwardRef(function CaptureOrb(
  { onCapture, disabled = false, busy = false, armed = false, label = "Capture" },
  ref,
) {
  const [ripples, setRipples] = useState([]);

  const fireRipple = () => {
    const id = Date.now();
    setRipples((current) => [...current, id]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((rippleId) => rippleId !== id));
    }, 650);
  };

  const handleActivate = (event) => {
    event.stopPropagation();
    if (disabled || busy) return;
    fireRipple();
    onCapture?.();
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`netra-capture-orb ${busy ? "is-busy" : ""} ${armed ? "is-armed" : ""}`}
      onClick={handleActivate}
      disabled={disabled || busy}
      aria-label={busy ? "Analyzing, please wait" : armed ? `${label}. Press again to analyze.` : label}
    >
      <span className="netra-capture-orb__core">
        {busy ? (
          <LoaderCircle size={30} className="netra-capture-orb__spinner" aria-hidden="true" />
        ) : (
          <Camera size={30} aria-hidden="true" />
        )}
      </span>

      {ripples.map((id) => (
        <span key={id} className="netra-capture-orb__ripple" aria-hidden="true" />
      ))}

      {busy && <span className="netra-capture-orb__ring" aria-hidden="true" />}
    </button>
  );
});

export default CaptureOrb;
