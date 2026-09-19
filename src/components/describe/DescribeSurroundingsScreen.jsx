import { useEffect, useState } from "react";
import { ArrowLeft, Eye, Hand } from "lucide-react";

import GlassButton from "../glass/GlassButton.jsx";
import CaptureOrb from "../glass/CaptureOrb.jsx";
import ViewfinderFrame from "../glass/ViewfinderFrame.jsx";

export default function DescribeSurroundingsScreen({
  videoRef,
  stream,
  cameraError,
  isStarting,
  onRetryCamera,
  scanning,
  flash,
  hintText,
  onCapture,
  captureDisabled,
  captureBusy,
  captureArmed,
  onBack,
  backArmed,
}) {
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    const handleVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <main className={`netra-describe ${tabHidden ? "is-tab-hidden" : ""}`}>
      <div className="netra-describe__ambient netra-describe__ambient--one" aria-hidden="true" />
      <div className="netra-describe__ambient netra-describe__ambient--two" aria-hidden="true" />
      <div className="netra-describe__particles" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <i key={index} />
        ))}
      </div>

      <header className="netra-describe__header">
        <GlassButton
          onClick={onBack}
          active={backArmed}
          aria-label={backArmed ? "Back. Press again to return home." : "Back to home"}
        >
          <ArrowLeft size={22} aria-hidden="true" />
          Back
        </GlassButton>

        <span className="netra-describe__mode-badge">
          <Eye size={16} aria-hidden="true" />
          <span>Describe surroundings</span>
        </span>
      </header>

      <div className="netra-describe__intro">
        <h1>Describe surroundings</h1>
        <p>Point the camera at the scene you want Netra to understand.</p>
      </div>

      <ViewfinderFrame
        videoRef={videoRef}
        stream={stream}
        cameraError={cameraError}
        isStarting={isStarting}
        scanning={scanning}
        flash={flash}
        onRetryCamera={onRetryCamera}
      />

      <div className="netra-describe__hint" role="status" aria-live="polite">
        <Hand size={20} aria-hidden="true" />
        <p key={hintText} className="netra-describe__hint-text">
          {hintText}
        </p>
      </div>

      <div className="netra-describe__controls">
        <CaptureOrb
          onCapture={onCapture}
          disabled={captureDisabled}
          busy={captureBusy}
          armed={captureArmed}
          label="Describe scene"
        />
      </div>
    </main>
  );
}
