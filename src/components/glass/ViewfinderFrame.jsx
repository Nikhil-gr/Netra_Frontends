import { useEffect } from "react";
import { CameraOff, RefreshCw } from "lucide-react";
import ScanBeam from "./ScanBeam.jsx";
import GlassButton from "./GlassButton.jsx";

export default function ViewfinderFrame({
  videoRef,
  stream,
  cameraError,
  isStarting,
  scanning = false,
  flash = false,
  onRetryCamera,
  children,
}) {
  const showDenied = Boolean(cameraError);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return undefined;
    }

    if (!stream) {
      video.srcObject = null;
      return undefined;
    }

    video.srcObject = stream;

    return () => {
      video.srcObject = null;
    };
  }, [stream, videoRef]);

  return (
    <div className={`netra-viewfinder ${flash ? "is-flashing" : ""}`}>
      <div className="netra-viewfinder__inner">
        {!showDenied && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="netra-viewfinder__video"
            aria-label="Live camera preview"
          />
        )}

        {!showDenied && isStarting && (
          <div className="netra-viewfinder__starting" role="status">
            Starting camera…
          </div>
        )}

        {showDenied && (
          <div className="netra-viewfinder__denied" role="alert">
            <CameraOff size={44} aria-hidden="true" />
            <h2>Camera unavailable</h2>
            <p>{cameraError}</p>
            <GlassButton variant="primary" onClick={onRetryCamera}>
              <RefreshCw size={20} aria-hidden="true" />
              Try again
            </GlassButton>
          </div>
        )}

        <ScanBeam active={scanning} />

        {scanning && (
          <div className="netra-viewfinder__analyzing-static" role="status">
            Analyzing…
          </div>
        )}

        {!showDenied && (
          <>
            <span className="netra-corner netra-corner--tl" aria-hidden="true" />
            <span className="netra-corner netra-corner--tr" aria-hidden="true" />
            <span className="netra-corner netra-corner--bl" aria-hidden="true" />
            <span className="netra-corner netra-corner--br" aria-hidden="true" />
          </>
        )}

        <div className="netra-viewfinder__flash" aria-hidden="true" />

        {children}
      </div>
    </div>
  );
}
