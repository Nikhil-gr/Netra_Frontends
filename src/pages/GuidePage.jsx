import { ArrowLeft, BookOpen, Eye, Hand, HelpCircle, Mic, Navigation, PhoneCall, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DesktopHeader, MobileBottomNav } from "../components/layout/NetraNavigation.jsx";

export default function GuidePage() {
  const navigate = useNavigate();

  const voiceCommands = [
    {
      cmd: "Describe",
      desc: "Scans environment using camera and describes your surroundings out loud.",
      icon: Eye,
    },
    {
      cmd: "Read Text",
      desc: "Reads signs, documents, menus, product labels, and printed text.",
      icon: BookOpen,
    },
    {
      cmd: "Walk Assist / Navigate",
      desc: "Helps you set a destination and gives turn-by-turn walking directions.",
      icon: Navigation,
    },
    {
      cmd: "Guide / Help",
      desc: "Opens this manual or speaks available voice commands and options.",
      icon: HelpCircle,
    },
    {
      cmd: "Emergency / Emergency Help",
      desc: "Triggers emergency alert and opens emergency calling (voice version of 3-tap).",
      icon: PhoneCall,
    },
    {
      cmd: "Stop / Exit / Cut",
      desc: "Stops Netra from talking immediately, interrupts speech, or cuts an emergency call.",
      icon: VolumeX,
    },
    {
      cmd: "Back / Home",
      desc: "Navigates back to the previous screen or returns to the main home page.",
      icon: ArrowLeft,
    },
  ];

  const gestureShortcuts = [
    {
      gesture: "Double Tap / Double Click",
      action: "Reactivates Netra Voice Assistant from anywhere on any page if idle or timed out.",
      icon: Mic,
    },
    {
      gesture: "Triple Tap (3 Tap)",
      action: "Instantly opens Emergency Call screen and initiates verbal emergency alert.",
      icon: PhoneCall,
    },
  ];

  return (
    <main className="min-h-screen bg-[#0b0f1a] pb-28 text-slate-100 outline-none md:pb-8">
      <DesktopHeader />

      <div className="mx-auto w-full max-w-xl px-4 py-5 sm:px-5 md:max-w-3xl md:py-8">
        
        {/* Top bar with back button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#111722] text-slate-400 transition hover:bg-[#161e2e] hover:text-white"
            aria-label="Go back to Home"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">User Guide & Manual</h1>
            <p className="text-xs text-slate-400">Predefined voice commands and gesture shortcuts</p>
          </div>
        </div>

        {/* Section 1: Predefined Voice Commands */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Mic size={16} className="text-blue-400" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Predefined Voice Commands
            </h2>
          </div>

          <div className="space-y-2.5">
            {voiceCommands.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.cmd}
                  className="flex items-start gap-3.5 rounded-xl border border-white/[0.07] bg-[#111722] p-3.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/15 mt-0.5">
                    <Icon size={17} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-md bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300 border border-blue-500/20 mb-1">
                      "{item.cmd}"
                    </span>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Touch & Tap Gestures */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Hand size={16} className="text-red-400" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Gesture Shortcuts
            </h2>
          </div>

          <div className="space-y-2.5">
            {gestureShortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.gesture}
                  className="flex items-start gap-3.5 rounded-xl border border-white/[0.07] bg-[#111722] p-3.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/15 mt-0.5">
                    <Icon size={17} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300 border border-red-500/20 mb-1">
                      {item.gesture}
                    </span>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {item.action}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      <MobileBottomNav pathname="/guide" />
    </main>
  );
}
