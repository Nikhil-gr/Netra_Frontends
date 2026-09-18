import { useEffect, useState } from "react";

import { ArrowLeft, Search } from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useNetraStore } from "../store/useNetraStore.js";

import { useSpeechSynthesis } from "../hooks/speech/useSpeechSynthesis.js";
import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";


export default function FindPage() {
  const navigate = useNavigate();

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
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() =>
          trigger({
            id: "find-back",

            announcement: "Back button clicked. Press again to return home.",

            action: () => navigate("/"),
          })
        }
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium ${
          isArmed("find-back")
            ? "bg-emerald-50 text-emerald-800"
            : "text-slate-700"
        }`}
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <section className="mt-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Search size={28} />
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Find an object
        </h1>

        <p className="mt-3 leading-7 text-slate-600">
          What are you looking for?
        </p>

        <div className="mt-8">
          <label htmlFor="object-query" className="font-medium text-slate-900">
            Object
          </label>

          <input
            id="object-query"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="For example: chair"
            autoFocus
            className="mt-2 min-h-14 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
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
            className={`mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-2xl px-6 py-4 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isArmed("start-find")
                ? "bg-emerald-800 ring-4 ring-emerald-100"
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            Start finding
          </button>
        </div>
      </section>
    </main>
  );
}
