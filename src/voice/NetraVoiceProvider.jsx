import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSpeechRecognition } from "../hooks/speech/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/speech/useSpeechSynthesis.js";
import { useNetraStore } from "../store/useNetraStore.js";
import { NetraVoiceContext } from "./useNetraVoice.js";
import { parseVoiceIntent } from "./voiceIntents.js";

let homeIntroductionPlayed = false;
const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const HELP = {
  home: "You can say Describe, Read Text, or Walk Assist.",
  describe: "Point the camera forward and say Describe. You can also say Home.",
  read: "Point the camera toward text and say Read Text. You can also say Home.",
  result: "You can say Repeat, Scan Again, or Home.",
  assist: "You can say Pause, Resume, Repeat Direction, or End Walk.",
};

export default function NetraVoiceProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const autoSpeak = useNetraStore((state) => state.autoSpeak);
  const speechRate = useNetraStore((state) => state.speechRate);
  const [actionsVersion, setActionsVersion] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [isAnySpeaking, setIsAnySpeaking] = useState(false);
  const actionsRef = useRef({});
  const routeVersionRef = useRef(0);
  const activeLoopRef = useRef(false);
  const interruptedRef = useRef(false);
  const lastMeaningfulPromptRef = useRef("");

  const recognition = useSpeechRecognition({ language: "en-US" });
  const speech = useSpeechSynthesis();

  const cancel = useCallback(() => {
    routeVersionRef.current += 1;
    activeLoopRef.current = false;
    recognition.abortListening();
  }, [recognition.abortListening]);

  const registerActions = useCallback((actions) => {
    actionsRef.current = actions || {};
    setActionsVersion((value) => value + 1);
    return () => {
      if (actionsRef.current === actions) actionsRef.current = {};
    };
  }, []);

  const speakAndWait = useCallback(async (text, options = {}) => {
    if (!autoSpeak) return false;
    if (text?.trim()) lastMeaningfulPromptRef.current = text.trim();
    recognition.abortListening();
    const spoken = await speech.speakAndWait(text, {
      language: "en-US", rate: speechRate, ...options,
    });
    await delay(400);
    return spoken;
  }, [autoSpeak, recognition.abortListening, speech.speakAndWait, speechRate]);

  const speak = useCallback((text, options = {}) => {
    if (!autoSpeak) return false;
    if (text?.trim()) lastMeaningfulPromptRef.current = text.trim();
    recognition.abortListening();
    return speech.speak(text, { language: "en-US", rate: speechRate, ...options });
  }, [autoSpeak, recognition.abortListening, speech.speak, speechRate]);

  const listenWithTimeout = useCallback(async (timeoutMs = 9000) => {
    if (!voiceEnabled) throw new Error("Voice conversation is stopped.");
    if (document.hidden) throw new Error("Voice listening paused while the page is hidden.");
    return recognition.listenWithTimeout(timeoutMs);
  }, [recognition.listenWithTimeout, voiceEnabled]);

  const ask = useCallback(async (prompt, version = routeVersionRef.current) => {
    let silence = 0;
    let nextPrompt = prompt;
    while (routeVersionRef.current === version) {
      await speakAndWait(nextPrompt);
      if (routeVersionRef.current !== version) return null;
      try {
        const heard = await listenWithTimeout(silence < 2 ? 9000 : 7000);
        if (interruptedRef.current) {
          const interruptionIntent = parseVoiceIntent(heard);
          if (interruptionIntent.type === "resume" || interruptionIntent.type === "repeat") {
            interruptedRef.current = false;
            nextPrompt = lastMeaningfulPromptRef.current || prompt;
            continue;
          }
          interruptedRef.current = false;
        }
        return heard;
      } catch (error) {
        if (routeVersionRef.current !== version) return null;
        const denied = /denied|not.allowed|service.not.allowed/i.test(error.message);
        if (denied) {
          setFallbackMessage("Microphone access is blocked. Allow microphone permission in your browser settings to use voice commands.");
          setVoiceEnabled(false);
          return null;
        }
        silence += 1;
        if (silence === 1) nextPrompt = "Are you still there? Do you still need help?";
        else if (silence === 2) nextPrompt = "I still haven't heard you. Say what you need, or say Home.";
        else {
          await speakAndWait("No response detected. Going back to Home.");
          navigate("/");
          return null;
        }
      }
    }
    return null;
  }, [listenWithTimeout, navigate, speakAndWait]);

  const performDirect = useCallback(async (intent) => {
    const actions = actionsRef.current;
    if (intent === "describe") return actions.describe?.() ?? navigate("/camera/describe");
    if (intent === "read") return actions.read?.() ?? navigate("/camera/read");
    if (intent === "walk") return actions.walk?.() ?? navigate("/walk-assist");
    if (intent === "history") return navigate("/history");
    if (intent === "settings") return navigate("/settings");
    if (intent === "home") return actions.home?.() ?? navigate("/");
    return undefined;
  }, [navigate]);

  useEffect(() => {
    cancel();
    const version = routeVersionRef.current;
    setFallbackMessage("");
    if (!autoSpeak || !voiceEnabled || !recognition.isSupported || document.hidden) {
      if (!recognition.isSupported) setFallbackMessage(recognition.unsupportedReason);
      return undefined;
    }

    const runHome = async () => {
      const intro = homeIntroductionPlayed
        ? "You're back on Home. Say Describe, Read Text, or Walk Assist."
        : "Welcome to Netra. I can describe your surroundings, read visible text, or help you while walking. Describe tells you what is around you. Read Text reads signs, labels, menus, and documents. Walk Assist gives walking directions and announces supported nearby objects. You can say Describe, Read Text, or Walk Assist. Would you like to use Describe?";
      const prompts = [intro, "Would you like to use Read Text?", "Would you like to use Walk Assist?"];
      const targets = ["describe", "read", "walk"];
      for (let index = 0; index < prompts.length && routeVersionRef.current === version; index += 1) {
        const heard = await ask(prompts[index], version);
        if (!heard) return;
        if (index === 0) homeIntroductionPlayed = true;
        const intent = parseVoiceIntent(heard, { expectsConfirmation: true });
        if (["describe", "read", "walk", "history", "settings", "home"].includes(intent.type)) return performDirect(intent.type);
        if (intent.type === "yes") return performDirect(targets[index]);
        if (intent.type !== "no") {
          await speakAndWait("I didn't understand. Say Describe, Read Text, or Walk Assist.");
          index -= 1;
        }
      }
      await speakAndWait("Okay. You can say Describe, Read Text, or Walk Assist whenever you're ready.");
      while (routeVersionRef.current === version) {
        const heard = await ask("", version);
        if (!heard) return;
        const intent = parseVoiceIntent(heard);
        if (intent.type === "help") await speakAndWait(HELP.home);
        else if (["describe", "read", "walk", "history", "settings"].includes(intent.type)) return performDirect(intent.type);
        else await speakAndWait("I didn't understand. Say Describe, Read Text, or Walk Assist.");
      }
    };

    const runCamera = async (mode) => {
      const actions = actionsRef.current;
      if (actions.cameraError) {
        await speakAndWait("I can't access the camera. Allow camera permission and try again, or say Home.");
        return;
      }
      if (!actions.cameraReady || actions.pending) return;
      const label = mode === "read" ? "Read Text" : "Describe mode";
      const question = mode === "read"
        ? "Read Text is ready. Point the camera toward the text. Would you like me to read it?"
        : "Describe mode is ready. Point the camera toward your surroundings. Would you like me to describe what is ahead?";
      const waitForCommand = async () => {
        while (routeVersionRef.current === version) {
          const next = await ask("", version);
          if (!next) return;
          const nextIntent = parseVoiceIntent(next);
          if (nextIntent.type === mode || nextIntent.type === "scan_again") return actions.analyze?.();
          if (nextIntent.type === "home") return actions.home?.();
          if (nextIntent.type === "help") await speakAndWait(HELP[mode]);
          else await speakAndWait(`I didn't understand. Say ${label}, Home, or Help.`);
        }
      };
      let heard = await ask(question, version);
      if (!heard) return;
      let intent = parseVoiceIntent(heard, { expectsConfirmation: true });
      if (intent.type === "yes" || intent.type === mode || (intent.type === "scan_again")) return actions.analyze?.();
      if (intent.type === "home") return actions.home?.();
      if (intent.type === "no") {
        heard = await ask("Would you like to return Home?", version);
        if (!heard) return;
        intent = parseVoiceIntent(heard, { expectsConfirmation: true });
        if (intent.type === "yes" || intent.type === "home") return actions.home?.();
        if (intent.type === "no") {
          await speakAndWait(`Okay. Say ${label} when you're ready, or say Home.`);
          return waitForCommand();
        }
      } else if (intent.type === "help") await speakAndWait(HELP[mode]);
      else await speakAndWait(`I didn't understand. Say ${label}, Home, or Help.`);
      return waitForCommand();
    };

    if (location.pathname === "/") runHome();
    else if (location.pathname === "/camera/describe") runCamera("describe");
    else if (location.pathname === "/camera/read") runCamera("read");
    return cancel;
  }, [actionsVersion, ask, autoSpeak, cancel, location.pathname, performDirect, recognition.isSupported, recognition.unsupportedReason, speakAndWait, voiceEnabled]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) recognition.abortListening();
      else setActionsVersion((value) => value + 1);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [recognition.abortListening]);

  useEffect(() => {
    const handleStart = () => setIsAnySpeaking(true);
    const handleEnd = () => setIsAnySpeaking(window.speechSynthesis?.speaking || false);
    window.addEventListener("netra-speech-start", handleStart);
    window.addEventListener("netra-speech-end", handleEnd);
    return () => {
      window.removeEventListener("netra-speech-start", handleStart);
      window.removeEventListener("netra-speech-end", handleEnd);
    };
  }, []);

  const stopTalking = useCallback(() => {
    if (!window.speechSynthesis?.speaking && !isAnySpeaking) return;
    interruptedRef.current = true;
    window.dispatchEvent(new CustomEvent("netra-stop-speech"));
    window.speechSynthesis?.cancel();
    setIsAnySpeaking(false);
  }, [isAnySpeaking]);

  const startVoiceGuide = useCallback(async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
      setVoiceEnabled(true);
      setFallbackMessage("");
      setActionsVersion((value) => value + 1);
    } catch {
      setFallbackMessage("Microphone access is blocked. Allow microphone permission in your browser settings to use voice commands.");
    }
  }, []);

  const value = useMemo(() => ({
    ...recognition, speak, speakAndWait, stopSpeech: speech.stop,
    listenWithTimeout, ask, registerActions, cancelConversation: cancel,
  }), [ask, cancel, listenWithTimeout, recognition, registerActions, speak, speakAndWait, speech.stop]);

  return (
    <NetraVoiceContext.Provider value={value}>
      {children}
      {fallbackMessage && (
        <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md rounded-2xl border border-amber-200 bg-white p-3 shadow-lg" role="status">
          <p className="text-sm leading-5 text-slate-700">{fallbackMessage}</p>
          {recognition.isSupported && (
            <button type="button" onClick={startVoiceGuide} className="mt-2 min-h-11 w-full rounded-xl bg-emerald-700 px-4 font-semibold text-white">
              Start Voice Guide
            </button>
          )}
        </div>
      )}
      {isAnySpeaking && (
        <button
          type="button"
          onClick={stopTalking}
          className="fixed bottom-3 right-3 z-[60] min-h-11 rounded-xl bg-slate-950 px-4 font-semibold text-white shadow-lg"
          aria-label="Stop Netra speaking"
        >
          Stop talking
        </button>
      )}
    </NetraVoiceContext.Provider>
  );
}
