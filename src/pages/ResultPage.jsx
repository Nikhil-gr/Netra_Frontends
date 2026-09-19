import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, Volume2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import DescribeResult from "../components/results/DescribeResult.jsx";
import ReadResult from "../components/results/ReadResults.jsx";

import { useSpeechSynthesis } from "../hooks/speech/useSpeechSynthesis.js";
import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";
import { useNetraStore } from "../store/useNetraStore.js";
import { useNetraVoice } from "../voice/useNetraVoice.js";
import {
  DesktopHeader,
  MobileBottomNav,
} from "../components/layout/NetraNavigation.jsx";

const RESULT_COPY = {
  describe: {
    eyebrow: "Scene Description",
    title: "What Netra noticed",
  },
  read: {
    eyebrow: "Text Recognition",
    title: "What Netra read",
  },
  find: {
    eyebrow: "Object Search",
    title: "What Netra found",
  },
  assist: {
    eyebrow: "Walk Assist",
    title: "Route awareness",
  },
};

export default function ResultPage() {
  const navigate = useNavigate();
  const locationRoute = useLocation();

  const hasSpokenRef = useRef(false);
  const speechInterruptedRef = useRef(false);
  const [, setResultSpeechDone] = useState(false);

  const currentResult = useNetraStore((state) => state.currentResult);
  const speechRate = useNetraStore((state) => state.speechRate);
  const autoSpeak = useNetraStore((state) => state.autoSpeak);

  const { speak, isSpeaking } = useSpeechSynthesis();
  const { trigger, isArmed } = useSpokenAction();

  const mode = currentResult?.mode;
  const result = currentResult?.result;
  const speechLanguage = "en-US";

  useEffect(() => {
    const onStopped = () => {
      if (!hasSpokenRef.current) return;
      speechInterruptedRef.current = true;
      setResultSpeechDone(true);
    };
    window.addEventListener("netra-stop-speech", onStopped);
    return () => window.removeEventListener("netra-stop-speech", onStopped);
  }, []);

  useEffect(() => {
    const shouldSpeakAutomatically = mode === "describe" || mode === "read";

    if (
      !autoSpeak ||
      !shouldSpeakAutomatically ||
      !result?.spokenResponse ||
      hasSpokenRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (hasSpokenRef.current) return;
      hasSpokenRef.current = true;

      speak(result.spokenResponse, {
        language: speechLanguage,
        rate: speechRate,
        onEnd: () => setResultSpeechDone(true),
        onError: () => setResultSpeechDone(true),
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [autoSpeak, mode, result?.spokenResponse, speak, speechLanguage, speechRate]);

  if (!currentResult || !result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-[#080c14] px-5 text-white">
        <h1 className="text-xl font-semibold text-white">No active result</h1>
        <p className="mt-1 text-xs text-slate-400">
          Capture a scene or scan text to see results here.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-5 inline-flex min-h-[44px] w-fit items-center justify-center rounded-full bg-blue-600 px-5 text-xs font-semibold text-white"
        >
          Return home
        </button>
      </main>
    );
  }

  const repeatResult = () => {
    if (!result.spokenResponse) return;
    speak(result.spokenResponse, {
      language: speechLanguage,
      rate: speechRate,
    });
  };

  const scanAgain = () => {
    navigate(`/camera/${mode}`);
  };

  const goHome = () => {
    navigate("/");
  };

  const copy = RESULT_COPY[mode] || {
    eyebrow: "Result",
    title: "What Netra found",
  };

  return (
    <main className="min-h-screen bg-[#0b0f1a] pb-24 text-slate-100 outline-none md:pb-8">
      <DesktopHeader compact />

      <div className="mx-auto w-full max-w-xl px-4 pt-3 sm:px-6 md:max-w-2xl md:pt-8">
        <header className="flex h-12 items-center justify-between mb-4">
          <button
            type="button"
            onClick={goHome}
            className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition active:scale-95"
            aria-label="Back to home"
          >
            <ChevronLeft size={19} />
            <span>Home</span>
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {copy.eyebrow}
          </span>
          <div className="w-10" />
        </header>

        <section className="rounded-2xl border border-white/[0.07] bg-[#111722] p-5 sm:p-6">
          <h1 className="text-lg font-bold text-white sm:text-xl">
            {copy.title}
          </h1>

          <p className="mt-3 text-base leading-relaxed text-slate-200">
            {result.spokenResponse}
          </p>

          {isSpeaking && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-500/15 border border-blue-500/25 px-3 py-1 text-xs font-medium text-blue-400">
              <Volume2 size={15} />
              <span>Netra is speaking...</span>
            </div>
          )}

          <div className="mt-5 border-t border-white/[0.07] pt-4">
            {mode === "describe" && <DescribeResult result={result} />}
            {mode === "read" && <ReadResult result={result} />}
          </div>
        </section>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              trigger({
                id: "listen-again",
                announcement: "Listen again button clicked. Press again to repeat the result.",
                action: repeatResult,
              })
            }
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/10 bg-[#111722] px-5 text-xs font-semibold text-slate-200 transition hover:bg-[#161e2e] active:scale-95 ${
              isArmed("listen-again") ? "ring-2 ring-blue-400" : ""
            }`}
          >
            <Volume2 size={17} />
            Listen again
          </button>

          <button
            type="button"
            onClick={() =>
              trigger({
                id: "scan-again",
                announcement: "Scan again button clicked. Press again to open camera.",
                action: scanAgain,
              })
            }
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 active:scale-95 ${
              isArmed("scan-again") ? "ring-2 ring-blue-300" : ""
            }`}
          >
            <Camera size={17} />
            Scan again
          </button>
        </div>
      </div>

      <MobileBottomNav pathname={locationRoute.pathname} />
    </main>
  );
}
