import {
  ChevronLeft,
  Info,
  Languages,
  Mic2,
  ShieldCheck,
  Vibrate,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNetraStore } from "../store/useNetraStore.js";
import {
  DesktopHeader,
  MobileBottomNav,
} from "../components/layout/NetraNavigation.jsx";

export default function SettingsPage() {
  const navigate = useNavigate();
  const locationRoute = useLocation();
  const language = useNetraStore((state) => state.language);
  const setLanguage = useNetraStore((state) => state.setLanguage);
  const autoSpeak = useNetraStore((state) => state.autoSpeak);
  const setAutoSpeak = useNetraStore((state) => state.setAutoSpeak);
  const vibrationEnabled = useNetraStore((state) => state.vibrationEnabled);
  const setVibrationEnabled = useNetraStore(
    (state) => state.setVibrationEnabled,
  );

  return (
    <main className="min-h-screen bg-[#0b0f1a] pb-24 text-slate-100 outline-none md:pb-8">
      <DesktopHeader compact />

      <div className="mx-auto w-full max-w-xl px-4 pt-3 sm:px-6 md:max-w-2xl md:pt-8">
        <header className="flex h-12 items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition active:scale-95"
            aria-label="Back to home"
          >
            <ChevronLeft size={19} />
            <span>Back</span>
          </button>
          <span className="text-sm font-semibold text-white">Preferences</span>
          <div className="w-10" />
        </header>

        <div className="mb-5 px-1">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Adjust speech, voice feedback and device accessibility.
          </p>
        </div>

        <section className="space-y-3">
          {/* Language Setting */}
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#111722] p-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Languages size={20} />
              </span>
              <div>
                <label htmlFor="language" className="text-sm font-semibold text-white">
                  Speech Language
                </label>
                <p className="mt-0.5 text-xs text-slate-400">
                  Voice reading and guidance language
                </p>
              </div>
            </div>
            <select
              id="language"
              className="min-h-[40px] rounded-xl border border-white/10 bg-[#141b2b] px-3 text-xs font-medium text-white outline-none focus:border-blue-500"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">English (US)</option>
              <option value="ne">Nepali (नेपाली)</option>
            </select>
          </div>

          {/* Auto Speak Toggle */}
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/[0.08] bg-[#111722] p-4 shadow-sm transition hover:bg-[#111827]">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Mic2 size={20} />
              </span>
              <div>
                <span className="block text-sm font-semibold text-white">
                  Auto Speak
                </span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  Read results aloud automatically when ready
                </span>
              </div>
            </div>
            <input
              checked={autoSpeak}
              onChange={(event) => setAutoSpeak(event.target.checked)}
              type="checkbox"
              className="h-5 w-5 rounded accent-blue-600 cursor-pointer"
            />
          </label>

          {/* Vibration Feedback Toggle */}
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/[0.08] bg-[#111722] p-4 shadow-sm transition hover:bg-[#111827]">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <Vibrate size={20} />
              </span>
              <div>
                <span className="block text-sm font-semibold text-white">
                  Haptic Vibration
                </span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  Tactile vibration cues for buttons and turns
                </span>
              </div>
            </div>
            <input
              checked={vibrationEnabled}
              onChange={(event) => setVibrationEnabled(event.target.checked)}
              type="checkbox"
              className="h-5 w-5 rounded accent-blue-600 cursor-pointer"
            />
          </label>

          {/* Info cards */}
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.07] bg-[#111722] p-4">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck size={18} className="text-blue-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">Privacy & Hardware</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Camera, microphone and location data remain on your device and are used solely for real-time visual assistance.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#111722] p-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Info size={18} className="text-blue-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">About Netra</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                An accessibility-first companion designed to make the visual world accessible and independent for everyone.
              </p>
            </div>
          </div>
        </section>
      </div>

      <MobileBottomNav pathname={locationRoute.pathname} />
    </main>
  );
}
