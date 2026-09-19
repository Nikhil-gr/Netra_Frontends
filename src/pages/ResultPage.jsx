import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import DescribeResult from "../components/results/DescribeResult.jsx";

import { useSpeechSynthesis } from "../hooks/speech/useSpeechSynthesis.js";
import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";
import { useNetraStore } from "../store/useNetraStore.js";
import ReadResult from "../components/results/ReadResults.jsx";
import { useNetraVoice } from "../voice/useNetraVoice.js";
import { parseVoiceIntent } from "../voice/voiceIntents.js";
import { openWalkAssist } from "../voice/openWalkAssist.js";

const RESULT_COPY = {
  describe: {
    eyebrow: "Describe result",
    title: "What Netra found",
  },

  read: {
    eyebrow: "Read text result",
    title: "What Netra read",
  },

  find: {
    eyebrow: "Find result",
    title: "What Netra found",
  },

  assist: {
    eyebrow: "Assist result",
    title: "What Netra noticed",
  },
};

export default function ResultPage() {
  const navigate = useNavigate();

  const hasSpokenRef = useRef(false);
  const conversationRef = useRef(0);
  const speechInterruptedRef = useRef(false);
  const [resultSpeechDone, setResultSpeechDone] = useState(false);
  const { ask, speakAndWait: voiceSpeakAndWait, cancelConversation, voiceAssistantActive, voiceEnabled, deactivateVoiceAssistant } = useNetraVoice();

  const currentResult = useNetraStore((state) => state.currentResult);

  const speechRate = useNetraStore((state) => state.speechRate);
  const autoSpeak = useNetraStore((state) => state.autoSpeak);
  const setWalkInitialLocation = useNetraStore((state) => state.setWalkInitialLocation);

  const { speak, isSpeaking } = useSpeechSynthesis();

  const { trigger, isArmed } = useSpokenAction();

  const mode = currentResult?.mode;
  const result = currentResult?.result;

  // Netra is English-only for MVP.
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
      if (hasSpokenRef.current) {
        return;
      }

      hasSpokenRef.current = true;

      speak(result.spokenResponse, {
        language: speechLanguage,

        rate: speechRate,

        onEnd: () => setResultSpeechDone(true),

        onError: () => setResultSpeechDone(true),
      });
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoSpeak, mode, result?.spokenResponse, speak, speechRate]);

  useEffect(() => {
    if (!voiceAssistantActive || !voiceEnabled || !resultSpeechDone || (mode !== "describe" && mode !== "read")) return undefined;
    const version = ++conversationRef.current;
    let cancelled = false;
    const run = async () => {
      let prompt = speechInterruptedRef.current
        ? "What can I help you with?"
        : mode === "read" ? "Would you like me to read something else?" : "Would you like me to describe again?";
      let confirmingHome = false;
      while (!cancelled) {
        const command = await ask(prompt);
        prompt = "";
        if (!command || cancelled) return;
        const nextIntent = parseVoiceIntent(command, { expectsConfirmation: true });
        if (nextIntent.type === "stop_voice") {
          deactivateVoiceAssistant();
          return;
        } else if (nextIntent.type === "repeat" || nextIntent.type === "resume") {
          await voiceSpeakAndWait(result.spokenResponse);
          prompt = "What can I help you with?";
        } else if (nextIntent.type === "yes" && confirmingHome) {
          navigate("/");
          return;
        } else if (nextIntent.type === "yes" || nextIntent.type === "scan_again" || nextIntent.type === mode || nextIntent.type === "back") {
          navigate(`/camera/${mode}`);
          return;
        } else if (nextIntent.type === "describe") {
          navigate("/camera/describe");
          return;
        } else if (nextIntent.type === "read") {
          navigate("/camera/read");
          return;
        } else if (nextIntent.type === "walk") {
          await openWalkAssist({ navigate, setWalkInitialLocation });
          return;
        } else if (nextIntent.type === "home") {
          navigate("/");
          return;
        } else if (nextIntent.type === "help") {
          await voiceSpeakAndWait("Say Repeat to hear the result again, Scan Again, Describe, Read Text, Walk Assist, Back, Home, Stop, Continue, or Guide.");
          prompt = "What can I help you with?";
        } else if (nextIntent.type === "no") {
          confirmingHome = true;
          prompt = "Would you like to return Home?";
        } else {
          prompt = "I didn't understand. Say Repeat, Scan Again, or Home.";
        }
      }
    };
    run();
    return () => {
      cancelled = true;
      conversationRef.current += 1;
      cancelConversation();
    };
  }, [ask, cancelConversation, deactivateVoiceAssistant, mode, navigate, result?.spokenResponse, resultSpeechDone, setWalkInitialLocation, voiceAssistantActive, voiceEnabled, voiceSpeakAndWait]);

  if (!currentResult || !result) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-8">
        <h1 className="text-2xl font-semibold text-slate-950">
          No result available
        </h1>

        <p className="mt-2 leading-7 text-slate-600">
          Analyze something first.
        </p>

        <button
          type="button"
          onClick={() =>
            trigger({
              id: "empty-result-home",

              announcement:
                "Return home button clicked. Press again to return home.",

              action: () => navigate("/"),
            })
          }
          className={`mt-6 inline-flex min-h-12 w-fit items-center justify-center rounded-xl px-5 font-medium text-white ${
            isArmed("empty-result-home")
              ? "bg-emerald-800 ring-4 ring-emerald-100"
              : "bg-emerald-700"
          }`}
        >
          Return home
        </button>
      </main>
    );
  }

  const repeatResult = () => {
    if (!result.spokenResponse) {
      return;
    }

    speak(result.spokenResponse, {
      language: "en-US",

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
    eyebrow: "Analysis result",

    title: "What Netra found",
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() =>
          trigger({
            id: "result-home",

            announcement: "Home button clicked. Press again to return home.",

            action: goHome,
          })
        }
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
          isArmed("result-home")
            ? "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        <ArrowLeft size={20} />
        Home
      </button>

      <section className="mt-7">
        <p className="text-sm font-medium text-emerald-700">{copy.eyebrow}</p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          {copy.title}
        </h1>

        <p
          className="mt-4 text-xl leading-8 text-slate-800"
          role="status"
          aria-live="polite"
        >
          {result.spokenResponse}
        </p>

        {isSpeaking && (
          <div
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"
            role="status"
          >
            <Volume2 size={17} />
            Netra is speaking
          </div>
        )}
      </section>

      <div className="mt-7">
        {mode === "describe" && <DescribeResult result={result} />}

        {mode === "read" && <ReadResult result={result} />}
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            trigger({
              id: "listen-again",

              announcement:
                "Listen again button clicked. Press again to repeat the result.",

              action: repeatResult,
            })
          }
          className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-6 py-4 font-semibold transition ${
            isArmed("listen-again")
              ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-100"
              : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Volume2 size={21} />
          Listen again
        </button>

        <button
          type="button"
          onClick={() =>
            trigger({
              id: "scan-again",

              announcement:
                mode === "read"
                  ? "Scan again button clicked. Press again to open the camera and read more text."
                  : "Scan again button clicked. Press again to open the camera.",

              action: scanAgain,
            })
          }
          className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 py-4 font-semibold text-white transition ${
            isArmed("scan-again")
              ? "bg-emerald-800 ring-4 ring-emerald-100"
              : "bg-emerald-700 hover:bg-emerald-800"
          }`}
        >
          <Camera size={21} />
          Scan again
        </button>
      </div>
    </main>
  );
}
