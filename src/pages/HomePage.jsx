import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Eye,
  HelpCircle,
  Loader2,
  MapPin,
  Navigation,
  PhoneCall,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNetraStore } from "../store/useNetraStore.js";
import { useNetraVoice } from "../voice/useNetraVoice.js";
import { useSpeechSynthesis } from "../hooks/speech/useSpeechSynthesis.js";
import { openWalkAssist as enterWalkAssist } from "../voice/openWalkAssist.js";
import {
  DesktopHeader,
  MobileBottomNav,
} from "../components/layout/NetraNavigation.jsx";

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    registerActions,
    voiceAssistantActive,
    isActivatingVoice,
    activateVoiceAssistant,
  } = useNetraVoice();

  const { speak } = useSpeechSynthesis();

  const setWalkInitialLocation = useNetraStore(
    (state) => state.setWalkInitialLocation,
  );

  const lastTapRef = useRef(0);
  const activationLockRef = useRef(false);
  // Triple-tap emergency
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  const [entered, setEntered] = useState(() => {
    try {
      return window.sessionStorage.getItem("netra-ui-entered") === "1";
    } catch {
      return false;
    }
  });

  const [emergencyOpen, setEmergencyOpen] = useState(false);

  const openWalkAssist = useCallback(async () => {
    await enterWalkAssist({ navigate, setWalkInitialLocation });
  }, [navigate, setWalkInitialLocation]);

  const openDescribe = useCallback(() => navigate("/camera/describe"), [navigate]);
  const openRead = useCallback(() => navigate("/camera/read"), [navigate]);
  const openGuide = useCallback(() => navigate("/guide"), [navigate]);

  const handleEmergency = useCallback(() => {
    setEmergencyOpen(true);
    speak("Emergency help opened. Tap Call Emergency Services to dial emergency or share your location.");
  }, [speak]);

  useEffect(
    () => registerActions({ describe: openDescribe, read: openRead, walk: openWalkAssist, guide: openGuide }),
    [openDescribe, openGuide, openRead, openWalkAssist, registerActions],
  );

  const enterApp = useCallback(() => {
    setEntered(true);
    try { window.sessionStorage.setItem("netra-ui-entered", "1"); } catch { /* optional */ }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Double tap anywhere to activate Netra voice assistant.");
      u.lang = "en-US";
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch (_) { /* optional */ }
  }, []);

  // Splash screen speech ("Welcome to Netra.") and auto redirect after ~2.2s
  useEffect(() => {
    if (entered) return undefined;

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Welcome to Netra.");
      u.lang = "en-US";
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch (_) { /* optional */ }

    const timer = setTimeout(() => {
      enterApp();
    }, 3000);

    return () => clearTimeout(timer);
  }, [entered, enterApp]);

  // Triple-tap → emergency call
  const triggerEmergencyTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      navigate("/emergency-call");
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 600);
  }, [navigate]);

  const activateFromGesture = useCallback(async () => {
    if (voiceAssistantActive || isActivatingVoice || activationLockRef.current) return;
    activationLockRef.current = true;
    try { await activateVoiceAssistant(); } finally { activationLockRef.current = false; }
  }, [activateVoiceAssistant, isActivatingVoice, voiceAssistantActive]);

  const handlePointerUp = useCallback((event) => {
    if (event.pointerType === "mouse") return;
    if (!entered) {
      const now = Date.now();
      const elapsed = now - lastTapRef.current;
      if (elapsed > 0 && elapsed <= 450) {
        lastTapRef.current = 0;
        enterApp();
        return;
      }
      lastTapRef.current = now;
    }
  }, [enterApp, entered]);

  const handleDoubleClick = useCallback(() => {
    if (!entered) enterApp();
  }, [enterApp, entered]);

  const handleKeyDown = useCallback((event) => {
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    if (!entered) enterApp();
  }, [enterApp, entered]);

  /* ── Splash ── */
  if (!entered) {
    return (
      <main
        className="relative flex min-h-screen cursor-pointer flex-col items-center justify-center bg-[#0b0f1a] px-6 py-14 text-white outline-none select-none"
        onClick={enterApp}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label="Welcome to Netra. Loading home screen..."
      >
        {/* Glow halo behind centered logo */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="absolute h-48 w-48 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
          
          {/* Centered logo */}
          <img
            src="/netra_WPA/05_netra_logo.png"
            alt="Netra"
            className="relative z-10 w-[210px] max-w-[65vw] object-contain drop-shadow-[0_4px_24px_rgba(59,130,246,0.25)]"
          />

          {/* Spinner matching reference design */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-blue-400/80" />
            <span className="text-[11px] font-medium tracking-[0.2em] text-slate-400 uppercase">
              Loading Netra...
            </span>
          </div>
        </div>

        {/* Footer text */}
        <div className="absolute bottom-10 flex flex-col items-center">
          <span className="text-[10px] tracking-[0.22em] text-slate-500 uppercase">
Let your voice be your vision.
Intelligent voice assistance that helps you understand your surroundings, navigate your world, and move through everyday life more independently.         
 </span>
        </div>
      </main>
    );
  }

  const features = [
    {
      key: "describe",
      name: "Describe Surroundings",
      description: "Audio description of what is around you",
      action: openDescribe,
      icon: Eye,
    },
    {
      key: "read",
      name: "Read Text",
      description: "Scan and listen to documents, signs and labels",
      action: openRead,
      icon: BookOpen,
    },
    {
      key: "walk",
      name: "Walk Assist",
      description: "Turn-by-turn walking route with obstacle awareness",
      action: openWalkAssist,
      icon: Navigation,
    },
    {
      key: "guide",
      name: "User Guide & Help",
      description: "Manual of predefined commands and voice shortcuts",
      action: openGuide,
      icon: HelpCircle,
    },
    {
      key: "emergency",
      name: "Emergency Help",
      description: "Call emergency services or share your location",
      action: handleEmergency,
      icon: PhoneCall,
    },
  ];

  return (
    <main
      className="min-h-screen bg-[#0b0f1a] pb-28 text-slate-100 outline-none md:pb-8"
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={voiceAssistantActive ? undefined : 0}
      aria-label={voiceAssistantActive ? undefined : "Double tap or press Enter twice to activate Netra voice assistant"}
    >
      <DesktopHeader />

      {/* Mobile logo header */}
      <header className="flex items-center px-5 pt-5 pb-2 md:hidden">
        <img
          src="/netra_WPA/05_netra_logo.png"
          alt="Netra"
          className="h-12 w-auto object-contain"
        />
      </header>

      <div className="mx-auto w-full max-w-xl px-4 sm:px-5 md:max-w-4xl md:pt-4">

        {/* ── Hero + overlapping mic ── */}
        <div className="relative">
          <div className="relative h-64 w-full overflow-hidden rounded-xl sm:h-72">
            <img
              src="/netra_WPA/02_home_hero.webp"
              alt="Person walking independently with a white cane"
              className="h-full w-full object-cover object-[center_30%]"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-[#0b0f1a]/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-[#0b0f1a]/25 to-transparent" />

            {/* Caption */}
            <div className="absolute bottom-12 left-4 right-4">
              <p className="text-sm font-semibold leading-snug text-white/90">
Let your voice be your vision.
            </p>
              <p className="mt-0.5 text-[11px] text-slate-300/70">
Experience the world around you through intelligent voice guidance, every day.              </p>
            </div>
          </div>

          {/* Mic overlapping bottom of hero */}
          <div className="absolute -bottom-7 left-0 right-0 flex justify-center">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); activateFromGesture(); }}
              aria-label="Activate voice assistant"
              className="group relative flex items-center justify-center focus:outline-none"
            >
              {voiceAssistantActive && (
                <>
                  <span className="absolute h-16 w-16 animate-ping rounded-full bg-blue-500/15" style={{ animationDuration: "1.4s" }} />
                  <span className="absolute h-20 w-20 animate-ping rounded-full bg-blue-500/08" style={{ animationDuration: "2s", animationDelay: "0.35s" }} />
                </>
              )}
              {isActivatingVoice && !voiceAssistantActive && (
                <span className="absolute h-16 w-16 animate-ping rounded-full bg-slate-400/12" style={{ animationDuration: "1s" }} />
              )}
              <span className={`relative z-10 flex h-[58px] w-[58px] items-center justify-center rounded-full border shadow-lg transition-all duration-200 group-active:scale-95 ${
                voiceAssistantActive
                  ? "border-blue-500/70 bg-blue-600 shadow-blue-600/25"
                  : "border-white/15 bg-[#161d2e] shadow-black/30"
              }`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22" height="22" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-colors ${voiceAssistantActive ? "text-white" : "text-slate-300"} ${isActivatingVoice ? "animate-pulse" : ""}`}
                >
                  <rect x="9" y="2" width="6" height="11" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="8" y1="22" x2="16" y2="22" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* Mic label + wave bars */}
        <div className="mt-10 flex flex-col items-center gap-1.5">
          {voiceAssistantActive && (
            <span className="flex items-end gap-[3px] h-[14px]" aria-hidden="true">
              {[0.5, 1, 0.65, 1, 0.5].map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-blue-400"
                  style={{
                    height: `${h * 14}px`,
                    animation: "wavebar 0.8s ease-in-out infinite alternate",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </span>
          )}
          <span className="text-[11px] text-slate-500">
            {isActivatingVoice ? "Connecting..." : voiceAssistantActive ? "Speak your command" : "Double-tap anywhere · or tap mic"}
          </span>
        </div>

        {/* ── Feature cards — individual ── */}
        <div className="mt-6">
          <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600">
            Features
          </p>
          <div className="space-y-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.key}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); feature.action(); }}
                  className="flex min-h-[60px] w-full items-center gap-3.5 rounded-xl border border-white/[0.07] bg-[#111722] px-4 py-3 text-left transition hover:border-white/[0.12] hover:bg-[#161e2e] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/15">
                    <Icon size={17} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-slate-100">
                      {feature.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-normal text-slate-500">
                      {feature.description}
                    </span>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-slate-600" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wavebar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      {/* Emergency Modal */}
      {emergencyOpen && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="emergency-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4 sm:items-center"
          onClick={() => setEmergencyOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111722] p-5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 id="emergency-title" className="text-sm font-bold text-white">
                Emergency Help
              </h3>
              <button
                type="button"
                onClick={() => setEmergencyOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:text-white transition"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-400 mb-4">
              Immediate medical, police, or safety assistance.
            </p>
            <div className="space-y-2">
              <a
                href="tel:911"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98]"
              >
                <PhoneCall size={16} />
                Call Emergency Services (911 / 112)
              </a>
              <button
                type="button"
                onClick={() => { speak("Sharing current coordinates with emergency contacts."); setEmergencyOpen(false); }}
                className="flex min-h-10 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs font-medium text-slate-300 transition hover:bg-white/[0.07]"
              >
                Announce / Share Location
              </button>
              <button
                type="button"
                onClick={() => setEmergencyOpen(false)}
                className="flex min-h-9 w-full items-center justify-center text-xs text-slate-600 hover:text-slate-400"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav pathname={location.pathname} />
    </main>
  );
}
