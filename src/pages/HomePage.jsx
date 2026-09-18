import { Eye, FileText, ShieldAlert, History, Settings } from "lucide-react";

import { useNavigate } from "react-router-dom";

import ModeCard from "../components/common/ModeCard.jsx";
import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";
import { useNetraStore } from "../store/useNetraStore.js";

const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
};

const normalizePosition = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  heading: Number.isFinite(position.coords.heading)
    ? position.coords.heading
    : null,
  speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
  timestamp: position.timestamp,
});

export default function HomePage() {
  const navigate = useNavigate();
  const { trigger, isArmed } = useSpokenAction();

  const setWalkInitialLocation = useNetraStore(
    (state) => state.setWalkInitialLocation,
  );

  const requestMicrophonePermission = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return Promise.resolve(null);
    }

    return navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        return true;
      })
      .catch(() => null);
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      return Promise.resolve(null);
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = normalizePosition(position);
          setWalkInitialLocation(location);
          resolve(location);
        },
        () => resolve(null),
        LOCATION_OPTIONS,
      );
    });
  };

  const openWalkAssist = async () => {
    setWalkInitialLocation(null);

    await Promise.allSettled([
      requestMicrophonePermission(),
      requestLocationPermission(),
    ]);

    navigate("/walk-assist");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-emerald-700">Netra</p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            AI visual assistant
          </h1>
        </div>

        <nav className="flex gap-2" aria-label="Secondary navigation">
          <button
            type="button"
            onClick={() =>
              trigger({
                id: "history",
                announcement: "History clicked. Press again to open.",
                action: () => navigate("/history"),
              })
            }
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition ${
              isArmed("history")
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <History size={18} />
            History
          </button>

          <button
            type="button"
            onClick={() =>
              trigger({
                id: "settings",
                announcement: "Settings clicked. Press again to open.",
                action: () => navigate("/settings"),
              })
            }
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition ${
              isArmed("settings")
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Settings size={18} />
            Settings
          </button>
        </nav>
      </header>

      <section
        className="mt-10 grid gap-4 md:grid-cols-2"
        aria-label="Netra modes"
      >
        <ModeCard
          icon={Eye}
          title="Describe"
          description="Get a detailed description of your surroundings."
          selected={isArmed("describe")}
          onClick={() =>
            trigger({
              id: "describe",
              announcement: "Describe clicked. Press again to open.",
              action: () => navigate("/camera/describe"),
            })
          }
        />

        <ModeCard
          icon={FileText}
          title="Read Text"
          description="Read visible signs, labels, documents, and menus."
          selected={isArmed("read")}
          onClick={() =>
            trigger({
              id: "read",
              announcement: "Read text clicked. Press again to open.",
              action: () => navigate("/camera/read"),
            })
          }
        />

        <ModeCard
          icon={ShieldAlert}
          title="Walk Assist"
          description="Get walking directions with live awareness of nearby objects."
          selected={isArmed("assist")}
          onClick={() =>
            trigger({
              id: "assist",
              announcement:
                "Walk assist clicked. Press again to allow microphone and location access and open Walk Assist.",
              action: openWalkAssist,
            })
          }
        />
      </section>
    </main>
  );
}
