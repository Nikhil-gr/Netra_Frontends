import {
  Eye,
  LocateFixed,
  MapPin,
  Navigation,
  Pause,
  Play,
  RefreshCw,
  Volume2,
  X,
} from "lucide-react";

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return "Waiting for GPS";
  if (meters < 1000) return `${Math.max(0, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export default function WalkAssistStatusPanel({
  destination,
  currentDirection,
  distanceToStep,
  lastCue,
  location,
  locationError,
  isTracking,
  isModelLoading,
  detectionError,
  detections = [],
  isSpeaking,
  paused,
  onPauseToggle,
  pauseSelected,
  onRepeatDirection,
  repeatSelected,
  onEndWalk,
  endSelected,
}) {
  const centerDetections = detections.filter(
    (detection) => detection.position === "center",
  );

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-[#07111c] p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
            <MapPin size={21} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Walking to
            </p>
            <h2 className="mt-1 font-semibold text-white">
              {destination?.label || destination?.name || "Walking route"}
            </h2>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-blue-500/5 p-5">
        <div className="flex items-center gap-2 text-cyan-300">
          <Navigation size={20} />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">
            Next direction
          </h2>
        </div>
        <p className="mt-4 text-xl font-semibold leading-7 text-white">
          {currentDirection || "Continue along the route."}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {formatDistance(distanceToStep)} to next route point
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#07111c] p-5">
        <div className="flex items-center gap-2">
          <LocateFixed size={20} className="text-blue-400" />
          <h2 className="font-semibold text-white">Live status</h2>
        </div>
        <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-400">
          <p>
            {paused
              ? "Walk Assist is paused."
              : isSpeaking
                ? "Netra is speaking."
                : "Netra is monitoring your route and surroundings."}
          </p>
          <p>
            GPS:{" "}
            {locationError
              ? locationError
              : isTracking && location
                ? "Active"
                : "Starting..."}
          </p>
          <p>
            Camera AI:{" "}
            {detectionError
              ? detectionError
              : isModelLoading
                ? "Loading..."
                : paused
                  ? "Paused"
                  : detections.length > 0
                    ? `Active · ${detections.length} object${detections.length === 1 ? "" : "s"} in view`
                    : "Active · scanning"}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onRepeatDirection}
          className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition ${repeatSelected ? "border-blue-400 bg-blue-500/15 text-blue-300 ring-2 ring-blue-400/20" : "border-white/10 bg-white/[0.035] text-slate-200 hover:bg-white/[0.06]"}`}
        >
          <RefreshCw size={18} />
          Repeat
        </button>
        <button
          type="button"
          onClick={onPauseToggle}
          className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition ${pauseSelected ? "border-cyan-400 bg-cyan-400/10 text-cyan-200 ring-2 ring-cyan-400/20" : "border-white/10 bg-white/[0.035] text-slate-200 hover:bg-white/[0.06]"}`}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      <section className="grid gap-3 rounded-3xl border border-white/10 bg-[#07111c] p-5 text-sm text-slate-400">
        <div className="flex items-start gap-3">
          <Eye size={19} className="mt-0.5 shrink-0 text-blue-400" />
          <p>
            {paused
              ? "Camera awareness is paused."
              : centerDetections.length > 0
                ? `${centerDetections.length} detected object${centerDetections.length === 1 ? "" : "s"} currently overlap the forward camera area.`
                : "No supported common object is currently detected in the forward camera area."}
          </p>
        </div>
        <div
          className="flex items-start gap-3 border-t border-white/10 pt-3"
          aria-live="polite"
        >
          <Volume2 size={19} className="mt-0.5 shrink-0 text-blue-400" />
          <p>{lastCue || "No spoken cue yet."}</p>
        </div>
      </section>

      <button
        type="button"
        onClick={onEndWalk}
        className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 font-semibold transition ${endSelected ? "bg-red-600 text-white ring-4 ring-red-500/20" : "bg-red-500/15 text-red-300 hover:bg-red-500/20"}`}
      >
        <X size={20} />
        End Walk Assist
      </button>
    </div>
  );
}
