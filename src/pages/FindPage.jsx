import { useEffect, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNetraStore } from "../store/useNetraStore.js";
import { useSpeechSynthesis } from "../hooks/speech/useSpeechSynthesis.js";
import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";
import {
  DesktopHeader,
  MobileBottomNav,
} from "../components/layout/NetraNavigation.jsx";

export default function FindPage() {
  const navigate = useNavigate();
  const locationRoute = useLocation();
  const [query, setQuery] = useState("");
  const setFindQuery = useNetraStore((state) => state.setFindQuery);
  const speechRate = useNetraStore((state) => state.speechRate);
  const language = useNetraStore((state) => state.language);
  const { speak } = useSpeechSynthesis();
  const { trigger, isArmed } = useSpokenAction();

  useEffect(() => {
    speak("Find object mode. Type what you want to find.", {
      language: language === "ne" ? "ne-NP" : "en-US",
      rate: speechRate,
    });
  }, [language, speak, speechRate]);

  const startFinding = () => {
    const cleanedQuery = query.trim();
    if (!cleanedQuery) {
      speak("Please enter an object first.");
      return;
    }
    setFindQuery(cleanedQuery);
    navigate("/camera/find");
  };

  return (
    <main className="min-h-screen bg-[#080c14] pb-24 text-slate-100 outline-none md:pb-8">
      <DesktopHeader compact />
      <div className="mx-auto w-full max-w-md px-4 pt-3 sm:px-6 md:pt-8">
        <header className="flex h-12 items-center justify-between mb-4">
          <button
            type="button"
            onClick={() =>
              trigger({
                id: "find-back",
                announcement: "Back button clicked. Press again to return home.",
                action: () => navigate("/"),
              })
            }
            className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition active:scale-95"
            aria-label="Back to home"
          >
            <ChevronLeft size={19} />
            <span>Back</span>
          </button>
          <span className="text-sm font-semibold text-white">Find Object</span>
          <div className="w-10" />
        </header>

        <section className="rounded-2xl border border-white/[0.08] bg-[#0d131f] p-5 sm:p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Search size={22} />
          </div>

          <h1 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Find an object
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Type the name of any item (e.g. chair, bottle, keys, door). Netra will scan through the camera and guide you towards it.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) startFinding();
            }}
            className="mt-6"
          >
            <label
              htmlFor="object-query"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Search item
            </label>
            <input
              id="object-query"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. chair, backpack, cup"
              autoFocus
              className="mt-2 min-h-[48px] w-full rounded-xl border border-white/10 bg-[#121927] px-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Searching
            </button>
          </form>
        </section>
      </div>
      <MobileBottomNav pathname={locationRoute.pathname} />
    </main>
  );
}
