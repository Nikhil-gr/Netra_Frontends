import { Info, Languages, Mic2, ShieldCheck, Vibrate } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useNetraStore } from "../store/useNetraStore.js";
import {
  DesktopHeader,
  MobileBottomNav,
} from "../components/layout/NetraNavigation.jsx";

export default function SettingsPage() {
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
    <main className="min-h-screen bg-[#030a12] pb-24 text-white md:pb-0">
      <DesktopHeader compact />

      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 md:py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">
            Netra preferences
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Settings
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Adjust speech and feedback without changing how Netra works.
          </p>
        </div>

        <section className="grid gap-3">
          <div className="rounded-3xl border border-white/10 bg-[#07111c] p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <Languages size={23} />
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor="language" className="font-semibold text-white">
                  Language
                </label>
                <p className="mt-1 text-sm text-slate-400">
                  Choose Netra's speech language.
                </p>
              </div>
              <select
                id="language"
                className="min-h-11 rounded-xl border border-white/10 bg-[#0b1724] px-3 text-sm text-white outline-none"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                <option value="en">English</option>
                <option value="ne">Nepali</option>
              </select>
            </div>
          </div>

          <label className="flex min-h-20 items-center gap-4 rounded-3xl border border-white/10 bg-[#07111c] p-5 sm:p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
              <Mic2 size={23} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-white">Auto speak</span>
              <span className="mt-1 block text-sm text-slate-400">
                Read Netra's results aloud automatically.
              </span>
            </span>
            <input
              checked={autoSpeak}
              onChange={(event) => setAutoSpeak(event.target.checked)}
              type="checkbox"
              className="h-6 w-6 accent-blue-500"
            />
          </label>

          <label className="flex min-h-20 items-center gap-4 rounded-3xl border border-white/10 bg-[#07111c] p-5 sm:p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
              <Vibrate size={23} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-white">Vibration</span>
              <span className="mt-1 block text-sm text-slate-400">
                Use tactile feedback for supported actions.
              </span>
            </span>
            <input
              checked={vibrationEnabled}
              onChange={(event) => setVibrationEnabled(event.target.checked)}
              type="checkbox"
              className="h-6 w-6 accent-blue-500"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#07111c] p-5">
              <ShieldCheck size={22} className="text-blue-400" />
              <h2 className="mt-4 font-semibold">Permissions</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Camera, microphone and location permissions stay controlled by
                your browser or device.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#07111c] p-5">
              <Info size={22} className="text-blue-400" />
              <h2 className="mt-4 font-semibold">About Netra</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Accessibility-first visual assistance built around voice, camera
                and navigation.
              </p>
            </div>
          </div>
        </section>
      </div>

      <MobileBottomNav pathname={locationRoute.pathname} />
    </main>
  );
}
