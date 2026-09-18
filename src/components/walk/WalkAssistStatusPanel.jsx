import {
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
  if (!Number.isFinite(meters)) {
    return "Waiting for GPS";
  }

  if (meters < 1000) {
    return `${Math.max(0, Math.round(meters))} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

export default function WalkAssistStatusPanel({
  destination,
  currentStep,
  currentDirection,
  distanceToStep,
  lastCue,
  location,
  locationError,
  isTracking,
  isModelLoading,
  detectionError,
  isSpeaking,
  paused,
  onPauseToggle,
  pauseSelected,
  onRepeatDirection,
  repeatSelected,
  onEndWalk,
  endSelected,
}) {
  const nextInstruction =
    currentDirection ||
    (currentStep?.maneuver === "arrive"
      ? "Destination ahead"
      : "Continue along the route");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-emerald-700" />

          <h2 className="font-semibold text-slate-950">Destination</h2>
        </div>

        <p className="mt-3 text-sm font-medium leading-6 text-slate-800">
          {destination?.label || destination?.name || "Walking route"}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Navigation size={20} className="text-emerald-700" />

          <h2 className="font-semibold text-slate-950">Next direction</h2>
        </div>

        <p className="mt-3 text-lg font-semibold leading-7 text-slate-950">
          {nextInstruction}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {formatDistance(distanceToStep)} to next route point
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <LocateFixed size={20} className="text-emerald-700" />

          <h2 className="font-semibold text-slate-950">Live status</h2>
        </div>

        <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
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
                  : "Active"}
          </p>
        </div>
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-white p-5"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <Volume2 size={20} className="text-emerald-700" />

          <h2 className="font-semibold text-slate-950">Last cue</h2>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {lastCue || "No spoken cue yet."}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onRepeatDirection}
          className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-4 font-semibold transition ${
            repeatSelected
              ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100"
              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
          }`}
        >
          <RefreshCw size={19} />
          Repeat direction
        </button>

        <button
          type="button"
          onClick={onPauseToggle}
          className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-4 font-semibold transition ${
            pauseSelected
              ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100"
              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
          }`}
        >
          {paused ? <Play size={19} /> : <Pause size={19} />}

          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      <button
        type="button"
        onClick={onEndWalk}
        className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 font-semibold transition ${
          endSelected
            ? "bg-red-700 text-white ring-4 ring-red-100"
            : "bg-slate-950 text-white hover:bg-slate-800"
        }`}
      >
        <X size={20} />
        End Walk Assist
      </button>
    </div>
  );
}
