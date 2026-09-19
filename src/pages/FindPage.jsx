import { useEffect, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
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
    speak("Find object mode. Type the object you want to find.", {
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
    <main className="min-h-screen bg-[#030a12] pb-24 text-white md:pb-0">
      <DesktopHeader compact />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 md:py-12">
        <button
          type="button"
          onClick={() =>
            trigger({
              id: "find-back",
              announcement: "Back button clicked. Press again to return home.",
              action: () => navigate("/"),
            })
          }
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium ${isArmed("find-back") ? "bg-blue-500/15 text-blue-300" : "text-slate-300 hover:bg-white/5"}`}
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <section className="mt-10 rounded-3xl border border-white/10 bg-[#07111c] p-5 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
            <Search size={28} />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Find an object
          </h1>
          <p className="mt-3 leading-7 text-slate-400">
            What are you looking for?
          </p>

          <div className="mt-8">
            <label
              htmlFor="object-query"
              className="font-medium text-slate-200"
            >
              Object
            </label>
            <input
              id="object-query"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="For example: chair"
              autoFocus
              className="mt-2 min-h-14 w-full rounded-2xl border border-white/15 bg-[#0b1724] px-4 text-base text-white placeholder:text-slate-600 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
            />
            <button
              type="button"
              disabled={!query.trim()}
              onClick={() =>
                trigger({
                  id: "start-find",
                  announcement: `Start finding ${query.trim()} button clicked. Press again to start.`,
                  action: startFinding,
                })
              }
              className={`mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-4 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${isArmed("start-find") ? "ring-4 ring-blue-400/25" : ""}`}
            >
              Start finding
            </button>
          </div>
        </section>
      </div>
      <MobileBottomNav pathname={locationRoute.pathname} />
    </main>
  );
}
