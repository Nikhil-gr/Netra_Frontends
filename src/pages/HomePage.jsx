import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Eye,
  Home,
  MapPin,
  Mic,
  Navigation,
  Settings,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNetraStore } from "../store/useNetraStore.js";
import { useNetraVoice } from "../voice/useNetraVoice.js";
import { openWalkAssist as enterWalkAssist } from "../voice/openWalkAssist.js";
import { MobileBottomNav } from "../components/layout/NetraNavigation.jsx";

const FEATURE_ASSETS = {
  describe: "/netra_WPA/07_describe_icon.webp",
  guide: "/netra_WPA/08_navigation_icon.png",
  read: "/netra_WPA/09_read_text_icon.webp",
  history: "/netra_WPA/11_history_icon.png",
  settings: "/netra_WPA/14_settings_icon.png",
};

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    registerActions,
    voiceAssistantActive,
    voiceEnabled,
    isActivatingVoice,
    activateVoiceAssistant,
  } = useNetraVoice();

  const setWalkInitialLocation = useNetraStore(
    (state) => state.setWalkInitialLocation,
  );

  const lastTapRef = useRef(0);
  const activationLockRef = useRef(false);

  const [entered, setEntered] = useState(() => {
    try {
      return window.sessionStorage.getItem("netra-ui-entered") === "1";
    } catch {
      return false;
    }
  });

  const openWalkAssist = useCallback(async () => {
    await enterWalkAssist({ navigate, setWalkInitialLocation });
  }, [navigate, setWalkInitialLocation]);

  const openDescribe = useCallback(
    () => navigate("/camera/describe"),
    [navigate],
  );

  const openRead = useCallback(() => navigate("/camera/read"), [navigate]);

  useEffect(
    () =>
      registerActions({
        describe: openDescribe,
        read: openRead,
        walk: openWalkAssist,
      }),
    [openDescribe, openRead, openWalkAssist, registerActions],
  );

  const enterApp = useCallback(() => {
    setEntered(true);

    try {
      window.sessionStorage.setItem("netra-ui-entered", "1");
    } catch {
      // Session storage is optional; UI still works without it.
    }
  }, []);

  const activateFromGesture = useCallback(async () => {
    if (
      voiceAssistantActive ||
      isActivatingVoice ||
      activationLockRef.current
    ) {
      return;
    }

    activationLockRef.current = true;

    try {
      await activateVoiceAssistant();
    } finally {
      activationLockRef.current = false;
    }
  }, [activateVoiceAssistant, isActivatingVoice, voiceAssistantActive]);

  const handlePointerUp = useCallback(
    (event) => {
      if (event.pointerType === "mouse") return;

      const now = Date.now();
      const elapsed = now - lastTapRef.current;

      if (elapsed > 0 && elapsed <= 420) {
        lastTapRef.current = 0;

        if (!entered) {
          enterApp();
        } else if (!voiceAssistantActive) {
          activateFromGesture();
        }

        return;
      }

      lastTapRef.current = now;
    },
    [activateFromGesture, enterApp, entered, voiceAssistantActive],
  );

  const handleDoubleClick = useCallback(() => {
    if (!entered) {
      enterApp();
    } else if (!voiceAssistantActive) {
      activateFromGesture();
    }
  }, [activateFromGesture, enterApp, entered, voiceAssistantActive]);

  const handleKeyDown = useCallback(
    (event) => {
      if (!["Enter", " "].includes(event.key)) return;

      event.preventDefault();

      const now = Date.now();

      if (now - lastTapRef.current <= 700) {
        lastTapRef.current = 0;

        if (!entered) {
          enterApp();
        } else if (!voiceAssistantActive) {
          activateFromGesture();
        }
      } else {
        lastTapRef.current = now;
      }
    },
    [activateFromGesture, enterApp, entered, voiceAssistantActive],
  );

  if (!entered) {
    return (
      <main
        className="relative flex min-h-screen cursor-default items-center justify-center overflow-hidden bg-[#050b12] px-6 text-white outline-none"
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label="Double tap or press Enter twice to continue to Netra"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(37,99,235,0.11),transparent_34%)]" />

        <div className="relative flex w-full max-w-sm flex-col items-center text-center">
          <img
            src="/netra_WPA/05_netra_logo.png"
            alt="Netra. See with confidence."
            className="w-[245px] max-w-[72vw] object-contain"
          />

          <p className="mt-24 text-sm font-medium tracking-wide text-slate-300 sm:mt-32">
            Double tap anywhere to continue
          </p>
        </div>
      </main>
    );
  }

  const features = [
    {
      key: "describe",
      name: "Describe",
      description: "Get a detailed description of your surroundings",
      action: openDescribe,
    },
    {
      key: "guide",
      name: "Navigation / Guide",
      description: "Find your way with voice guidance",
      action: openWalkAssist,
    },
    {
      key: "read",
      name: "Read Text",
      description: "Scan and listen to text aloud",
      action: openRead,
    },
    {
      key: "history",
      name: "History",
      description: "View your recent activity",
      action: () => navigate("/history"),
    },
    {
      key: "settings",
      name: "Settings",
      description: "Customize your experience",
      action: () => navigate("/settings"),
      desktopOnly: true,
    },
  ];

  const voiceStatus = isActivatingVoice
    ? "Activating voice assistant..."
    : voiceAssistantActive && voiceEnabled
      ? "Voice assistant active"
      : "Double tap anywhere to activate assistant.";

  return (
    <main
      className="min-h-screen bg-[#050b12] pb-24 text-white outline-none md:pb-0"
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={voiceAssistantActive ? undefined : 0}
      aria-label={
        voiceAssistantActive
          ? undefined
          : "Double tap or press Enter twice to activate Netra voice assistant"
      }
    >
      <header className="hidden h-[74px] border-b border-white/[0.07] bg-[#050b12] md:block">
        <div className="mx-auto flex h-full w-full max-w-[1640px] items-center justify-between px-8 lg:px-12">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Netra home"
          >
            <img
              src="/netra_WPA/05_netra_logo.png"
              alt=""
              className="h-10 w-auto max-w-[120px] object-contain"
            />
          </button>

          <nav
            className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2"
            aria-label="Primary navigation"
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-[#0b274a] px-5 text-sm font-medium text-blue-200 transition hover:bg-[#10325e] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <Home size={18} />
              Home
            </button>

            <button
              type="button"
              onClick={openWalkAssist}
              className="flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <MapPin size={18} />
              Guide
            </button>

            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <Settings size={18} />
              Settings
            </button>
          </nav>

          <span className="text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-500">
            A clearer tomorrow
          </span>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1640px] md:px-8 md:py-5 lg:px-12 lg:py-6">
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_360px] md:overflow-hidden md:rounded-[22px] md:border md:border-white/[0.10] md:bg-[#07111b] xl:grid-cols-[minmax(0,1fr)_390px]">
          {/* MOBILE HERO */}
          <section className="relative min-h-[430px] overflow-visible bg-[#07111b] sm:min-h-[500px] md:hidden">
            <img
              src="/netra_WPA/02_home_hero.webp"
              alt="Person walking independently with a white cane"
              className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-[#050b12]/95" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5">
              <img
                src="/netra_WPA/05_netra_logo.png"
                alt="Netra"
                className="h-9 w-auto max-w-[118px] object-contain"
              />

              <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.27em] text-white/75">
                A clearer tomorrow
              </span>
            </div>

            <div className="absolute right-5 top-[30%] w-[132px] text-right sm:right-8 sm:w-[160px]">
              <p className="text-[18px] font-medium leading-[1.13] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] sm:text-[22px]">
                A clearer
                <br />
                brighter
                <br />
                more independent
                <br />
                tomorrow
              </p>
              <span className="mt-3 ml-auto block h-[2px] w-8 bg-sky-400" />
            </div>

            <div className="absolute inset-x-0 bottom-[-43px] z-30 flex flex-col items-center">
              <div
                className={`relative flex h-[88px] w-[88px] items-center justify-center rounded-full border border-blue-300/45 bg-[radial-gradient(circle_at_38%_30%,#8ec5ff_0%,#3b82f6_22%,#3d3a9b_60%,#111827_100%)] shadow-[0_0_20px_rgba(96,165,250,0.7),0_0_44px_rgba(79,70,229,0.45)] transition ${
                  voiceAssistantActive && voiceEnabled
                    ? "scale-105 shadow-[0_0_25px_rgba(96,165,250,0.9),0_0_58px_rgba(79,70,229,0.62)]"
                    : ""
                } ${isActivatingVoice ? "animate-pulse" : ""}`}
                aria-hidden="true"
              >
                <div className="absolute inset-[8px] rounded-full border border-white/20" />
                <Mic size={39} className="relative z-10 text-white" />
              </div>

              <p className="mt-3 px-4 text-center text-[12px] font-medium text-slate-200">
                {voiceStatus}
              </p>
            </div>
          </section>

          {/* DESKTOP HERO */}
          <section className="relative hidden min-h-[410px] overflow-hidden bg-[#07111b] md:block xl:min-h-[450px]">
            <img
              src="/netra_WPA/02_home_hero.webp"
              alt="Person walking independently with a white cane"
              className="absolute inset-0 h-full w-full object-cover object-[55%_42%]"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-[#06101a]/98 via-[#06101a]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050b12]/35 via-transparent to-black/10" />

            <div className="absolute left-8 top-1/2 z-10 w-[290px] -translate-y-[54%] lg:left-12 xl:left-16 xl:w-[330px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.30em] text-sky-300">
                A clearer tomorrow
              </p>

              <h1 className="mt-3 text-[54px] font-semibold leading-none tracking-[-0.045em] text-white xl:text-[62px]">
                Netra
              </h1>

              <p className="mt-3 max-w-[300px] text-[18px] leading-[1.35] text-slate-100 xl:text-[20px]">
                Technology for a more independent tomorrow
              </p>

              <p className="mt-3 max-w-[300px] text-[12px] leading-5 text-slate-300">
                Your AI companion that helps you see, understand and navigate
                the world with confidence.
              </p>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  activateFromGesture();
                }}
                className="mt-4 inline-flex min-h-10 items-center gap-3 rounded-full bg-gradient-to-r from-[#2580ff] to-[#1f6ef2] px-6 text-xs font-semibold text-white shadow-[0_8px_28px_rgba(37,99,235,0.25)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                <Mic size={17} />
                {isActivatingVoice
                  ? "Activating..."
                  : voiceAssistantActive && voiceEnabled
                    ? "Voice Assistant Active"
                    : "Start with Voice Assistant"}
              </button>

              <p className="mt-2 pl-7 text-[11px] text-slate-400">
                Double tap anywhere to activate assistant
              </p>
            </div>

            <div className="absolute right-[8%] top-[23%] z-10 w-[150px] xl:right-[7%] xl:w-[180px]">
              <p className="text-[17px] font-medium leading-[1.20] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] xl:text-[20px]">
                A clearer
                <br />
                brighter
                <br />
                more independent
                <br />
                tomorrow
              </p>
              <span className="mt-4 block h-[2px] w-9 bg-sky-400" />
            </div>
          </section>

          {/* FEATURES */}
          <aside className="relative z-20 bg-[#07111b] px-4 pb-5 pt-5 sm:px-5 md:flex md:min-h-[410px] md:flex-col md:px-5 md:py-5 xl:min-h-[450px] xl:px-6">
            <div className="hidden md:block">
              <h2 className="text-[16px] font-semibold tracking-tight text-white">
                Access Netra
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Choose a tool or use the voice assistant.
              </p>
            </div>

            <div className="space-y-2 md:mt-4 md:space-y-2">
              {features.map((feature) => (
                <button
                  key={feature.key}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    feature.action();
                  }}
                  className={`${feature.desktopOnly ? "hidden md:flex" : "flex"} min-h-[58px] w-full items-center gap-3 rounded-[14px] border border-white/[0.09] bg-[#0a1520] px-3 py-2 text-left transition hover:border-blue-400/30 hover:bg-[#0d1a28] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:min-h-[62px] md:px-3`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#102033]">
                    <img
                      src={FEATURE_ASSETS[feature.key]}
                      alt=""
                      className="h-8 w-8 object-contain"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold leading-5 text-white md:text-[16px]">
                      {feature.name}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-400">
                      {feature.description}
                    </span>
                  </span>

                  <ChevronRight
                    size={20}
                    strokeWidth={2}
                    className="shrink-0 text-slate-500"
                  />
                </button>
              ))}
            </div>

            <div className="mt-5 hidden rounded-[17px] border border-white/[0.09] bg-[#0a1520] p-5 text-sm text-slate-400 md:block">
              <div className="flex items-center gap-2.5 text-slate-200">
                {voiceAssistantActive ? (
                  <Eye size={18} />
                ) : (
                  <Navigation size={18} />
                )}
                <span className="font-medium">Voice-first accessibility</span>
              </div>

              <p className="mt-3 leading-6">
                {voiceAssistantActive
                  ? "Netra is ready for Describe, Read Text, Walk Assist, or Guide commands."
                  : "Double tap anywhere on this page whenever Netra is idle to wake the assistant."}
              </p>
            </div>
          </aside>
        </div>
      </section>

      <MobileBottomNav pathname={location.pathname} />
    </main>
  );
}
