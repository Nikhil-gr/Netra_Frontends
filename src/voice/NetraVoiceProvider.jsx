import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSpeechRecognition } from "../hooks/speech/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/speech/useSpeechSynthesis.js";
import { useNetraStore } from "../store/useNetraStore.js";
import { NetraVoiceContext } from "./useNetraVoice.js";
import {
  normalizeVoiceText,
  parseBestVoiceIntent,
  parseVoiceIntent,
} from "./voiceIntents.js";
import { openWalkAssist } from "./openWalkAssist.js";

const LANDING_INTRO =
  "Welcome to Netra, your AI visual assistant. Double tap anywhere to activate the voice assistant.";
const ACTIVATED =
  "Voice assistant activated. What can I help you with? You can say Describe, Read Text, Walk Assist, Guide, or Emergency.";
const READY = "What can I help you with?";
const GUIDE = {
  home: "Here's a quick guide. Describe uses your camera to explain your surroundings. Read Text reads visible signs, labels, menus, and documents. Walk Assist helps you choose a destination and provides walking guidance.",
  describe:
    "Describe uses your camera to explain surroundings. Say Describe to scan, Repeat for this prompt, Back or Home to return, Stop to interrupt speech, Continue to resume, or Guide for help.",
  read: "Read Text uses your camera to read visible text. Say Read Text to scan, Repeat for this prompt, Back or Home to return, Stop to interrupt speech, Continue to resume, or Guide for help.",
  result:
    "Say Repeat to hear the result again, Scan Again, Describe, Read Text, Walk Assist, Back, Home, Stop, Continue, or Guide.",
  setup:
    "Tell me a destination. I will search nearby matches and ask you to confirm one. Say Back or Home to return, Stop to interrupt speech, Continue to resume, or Guide for help.",
  assist:
    "Say Pause, Resume or Continue, Repeat Direction, Destination, Mute Guidance, Unmute Guidance, End Walk, Back, Home, Stop, or Guide.",
};
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
let landingIntroStarted = false;

export default function NetraVoiceProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const autoSpeak = useNetraStore((state) => state.autoSpeak);
  const speechRate = useNetraStore((state) => state.speechRate);
  const setWalkInitialLocation = useNetraStore(
    (state) => state.setWalkInitialLocation,
  );
  const [voiceAssistantActive, setVoiceAssistantActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isActivatingVoice, setIsActivatingVoice] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [actionsVersion, setActionsVersion] = useState(0);
  const actionsRef = useRef({});
  const actionSignatureRef = useRef("");
  const versionRef = useRef(0);
  const activationRef = useRef(null);
  const firstActivationRef = useRef(false);
  const interruptedRef = useRef(false);
  const lastPromptRef = useRef("");
  const interruptedPromptRef = useRef("");
  const currentSpeechRef = useRef("");
  const bargeRef = useRef(0);
  const recognition = useSpeechRecognition({ language: "en-US" });
  const speech = useSpeechSynthesis();

  const cancelConversation = useCallback(() => {
    versionRef.current += 1;
    recognition.abortListening();
  }, [recognition.abortListening]);

  const registerActions = useCallback((actions) => {
    actionsRef.current = actions || {};
    const signature = JSON.stringify({
      cameraReady: actions?.cameraReady,
      cameraError: actions?.cameraError,
      pending: actions?.pending,
      resultReady: actions?.resultReady,
    });
    if (signature !== actionSignatureRef.current) {
      actionSignatureRef.current = signature;
      setActionsVersion((n) => n + 1);
    }
    return () => {
      if (actionsRef.current === actions) {
        actionsRef.current = {};
      }
    };
  }, []);

  const stopCurrentSpeech = useCallback(() => {
    interruptedPromptRef.current = lastPromptRef.current;
    interruptedRef.current = true;
    bargeRef.current += 1;
    window.dispatchEvent(new CustomEvent("netra-stop-speech"));
    window.speechSynthesis?.cancel();
  }, []);

  const speakAndWait = useCallback(
    async (text, options = {}) => {
      if (!text?.trim() || !autoSpeak) return false;
      lastPromptRef.current = text.trim();
      recognition.abortListening();
      const spoken = await speech.speakAndWait(text, {
        language: "en-US",
        rate: speechRate,
        ...options,
      });
      if (spoken) await sleep(100);
      return spoken;
    },
    [autoSpeak, recognition.abortListening, speech.speakAndWait, speechRate],
  );

  const speak = useCallback(
    (text, options = {}) => {
      if (!text?.trim() || !autoSpeak) return false;
      lastPromptRef.current = text.trim();
      recognition.abortListening();
      return speech.speak(text, {
        language: "en-US",
        rate: speechRate,
        ...options,
      });
    },
    [autoSpeak, recognition.abortListening, speech.speak, speechRate],
  );

  const listenWithTimeout = useCallback(
    (ms = 9000) => {
      if (!voiceAssistantActive || !voiceEnabled || document.hidden) {
        return Promise.reject(new Error("Voice assistant is not listening."));
      }
      return recognition.listenWithTimeout(ms);
    },
    [recognition.listenWithTimeout, voiceAssistantActive, voiceEnabled],
  );

  const listenDetailedWithTimeout = useCallback(
    (ms = 9000) => {
      if (!voiceAssistantActive || !voiceEnabled || document.hidden) {
        return Promise.reject(new Error("Voice assistant is not listening."));
      }
      return recognition.listenDetailedWithTimeout(ms);
    },
    [recognition.listenDetailedWithTimeout, voiceAssistantActive, voiceEnabled],
  );

  const deactivateVoiceAssistant = useCallback(
    (announce = true) => {
      cancelConversation();
      bargeRef.current += 1;
      setVoiceEnabled(false);
      setVoiceAssistantActive(false);
      if (announce && autoSpeak) {
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance("Voice assistant turned off.");
          u.lang = "en-US";
          u.rate = 1;
          window.speechSynthesis.speak(u);
        } catch (_) {
          /* optional */
        }
      }
    },
    [autoSpeak, cancelConversation],
  );

  const activateVoiceAssistant = useCallback(async () => {
    if (activationRef.current) return activationRef.current;

    cancelConversation();
    stopCurrentSpeech();
    try {
      window.speechSynthesis?.cancel();
    } catch (_) {
      /* ignore */
    }

    const pending = (async () => {
      setIsActivatingVoice(true);
      setFallbackMessage("");
      if (!recognition.isSupported) {
        setFallbackMessage(recognition.unsupportedReason);
        setIsActivatingVoice(false);
        return false;
      }
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((track) => track.stop());
        }
        firstActivationRef.current = true;
        setVoiceAssistantActive(true);
        setVoiceEnabled(true);
        setActionsVersion((n) => n + 1);
        return true;
      } catch {
        setFallbackMessage(
          "Microphone access is blocked. Allow it in browser settings, then double tap again.",
        );
        return false;
      } finally {
        setIsActivatingVoice(false);
        activationRef.current = null;
      }
    })();
    activationRef.current = pending;
    return pending;
  }, [
    cancelConversation,
    recognition.isSupported,
    recognition.unsupportedReason,
    stopCurrentSpeech,
  ]);

  const ask = useCallback(
    async (
      prompt,
      version = versionRef.current,
      { preferCommands = false } = {},
    ) => {
      if (!voiceAssistantActive || !voiceEnabled) return null;
      let misses = 0;
      let next = prompt;
      while (
        versionRef.current === version &&
        voiceAssistantActive &&
        voiceEnabled
      ) {
        if (next) {
          lastPromptRef.current = next;
          await speakAndWait(next);
        }
        if (versionRef.current !== version || !voiceEnabled) return null;
        if (interruptedRef.current && next !== READY) {
          next = READY;
          continue;
        }
        try {
          const timeout = misses === 2 ? 7000 : 9000;
          const detailed = preferCommands
            ? await listenDetailedWithTimeout(timeout)
            : null;
          const heard = preferCommands
            ? parseBestVoiceIntent(
                detailed?.alternatives || [detailed?.transcript],
              ).transcript
            : await listenWithTimeout(timeout);
          const intent = parseVoiceIntent(heard);
          if (intent.type === "stop_voice" || intent.type === "stop_talking") {
            deactivateVoiceAssistant(true);
            return null;
          }
          if (
            interruptedRef.current &&
            (intent.type === "resume" || intent.type === "repeat")
          ) {
            interruptedRef.current = false;
            next = interruptedPromptRef.current || prompt || READY;
            misses = 0;
            continue;
          }
          interruptedRef.current = false;
          return heard;
        } catch (error) {
          if (
            versionRef.current !== version ||
            !voiceEnabled ||
            document.hidden
          )
            return null;
          if (
            /denied|not.allowed|service.not.allowed|network|audio-capture/i.test(
              error?.message || "",
            )
          ) {
            setFallbackMessage(error.message);
            deactivateVoiceAssistant();
            return null;
          }
          misses += 1;
          if (misses === 1)
            next =
              location.pathname === "/"
                ? "Are you still there? Say Describe, Read Text, Walk Assist, or Guide."
                : "Are you still there?";
          else if (misses === 2) next = "I still haven't heard you.";
          else {
            if (location.pathname === "/walk-assist") {
              return null;
            }
            deactivateVoiceAssistant();
            return null;
          }
        }
      }
      return null;
    },
    [
      deactivateVoiceAssistant,
      listenDetailedWithTimeout,
      listenWithTimeout,
      location.pathname,
      speakAndWait,
      stopCurrentSpeech,
      voiceAssistantActive,
      voiceEnabled,
    ],
  );

  const performDirect = useCallback(
    async (intent) => {
      const actions = actionsRef.current;
      if (intent === "describe")
        return actions.describe
          ? actions.describe()
          : navigate("/camera/describe");
      if (intent === "read")
        return actions.read ? actions.read() : navigate("/camera/read");
      if (intent === "walk")
        return actions.walk
          ? actions.walk()
          : openWalkAssist({ navigate, setWalkInitialLocation });
      if (intent === "guide" || intent === "help")
        return actions.guide ? actions.guide() : navigate("/guide");
      if (intent === "emergency")
        return actions.emergency
          ? actions.emergency()
          : navigate("/emergency-call");
      if (intent === "history") return navigate("/history");
      if (intent === "settings") return navigate("/settings");
      if (intent === "back")
        return actions.back ? actions.back() : navigate("/");
      if (intent === "home")
        return actions.home ? actions.home() : navigate("/");
      return undefined;
    },
    [navigate, setWalkInitialLocation],
  );

  useEffect(() => {
    if (
      location.pathname === "/camera/assist" ||
      location.pathname === "/walk-assist"
    ) {
      return undefined;
    }
    cancelConversation();
    const version = versionRef.current;
    if (!voiceAssistantActive || !voiceEnabled || document.hidden)
      return undefined;

    const runHome = async () => {
      let prompt = firstActivationRef.current ? ACTIVATED : READY;
      firstActivationRef.current = false;
      while (versionRef.current === version) {
        const heard = await ask(prompt, version, { preferCommands: true });
        prompt = "";
        if (!heard) return;
        const intent = parseVoiceIntent(heard);
        if (intent.type === "help") {
          await speakAndWait(GUIDE.home);
          if (versionRef.current !== version || interruptedRef.current) {
            prompt = READY;
            continue;
          }
          await speakAndWait(
            "Say Back or Home to return, Repeat to hear something again, Stop to interrupt my speech, Continue to continue, or Guide for help.",
          );
          prompt = READY;
        } else if (intent.type === "repeat" || intent.type === "resume") {
          prompt = lastPromptRef.current || READY;
        } else if (
          [
            "describe",
            "read",
            "walk",
            "guide",
            "emergency",
            "history",
            "settings",
          ].includes(intent.type)
        ) {
          return performDirect(intent.type);
        } else if (intent.type === "home" || intent.type === "back") {
          prompt = READY;
        } else {
          prompt =
            "I didn't understand. Say Describe, Read Text, Walk Assist, Guide, or Emergency.";
        }
      }
    };

    const runCamera = async (mode) => {
      const actions = actionsRef.current;
      if (actions.cameraError) {
        await speakAndWait(
          "I can't access the camera. Allow camera permission and try again, or say Home.",
        );
        return;
      }
      if (!actions.cameraReady || actions.pending) return;
      let prompt =
        mode === "read"
          ? "Read Text is ready. Point the camera toward the text. Would you like me to read it?"
          : "Describe mode is ready. Point the camera toward your surroundings. Would you like me to describe what is ahead?";
      let confirmingHome = false;
      while (versionRef.current === version) {
        const heard = await ask(prompt, version, { preferCommands: true });
        prompt = "";
        if (!heard) return;
        const intent = parseVoiceIntent(heard, { expectsConfirmation: true });
        if (intent.type === "yes" && confirmingHome)
          return performDirect("home");
        if (
          intent.type === "yes" ||
          intent.type === mode ||
          intent.type === "scan_again"
        )
          return actions.analyze?.();
        if (intent.type === "home" || intent.type === "back")
          return performDirect(intent.type);
        if (intent.type === "help") {
          await speakAndWait(GUIDE[mode]);
          prompt = READY;
        } else if (intent.type === "repeat" || intent.type === "resume")
          prompt = lastPromptRef.current || READY;
        else if (["describe", "read", "walk"].includes(intent.type))
          return performDirect(intent.type);
        else if (intent.type === "no" && !confirmingHome) {
          confirmingHome = true;
          prompt =
            "Would you like to return Home? You can also say Describe, Read Text, or Guide.";
        } else if (intent.type === "no") {
          confirmingHome = false;
          prompt = READY;
        } else prompt = READY;
      }
    };

    const runResult = async () => {
      const resultObj = useNetraStore.getState().currentResult;
      const resultMode = resultObj?.mode || "describe";
      const spokenResponse = resultObj?.result?.spokenResponse;

      if (firstActivationRef.current) {
        firstActivationRef.current = false;
        await speakAndWait(ACTIVATED);
      } else if (spokenResponse && autoSpeak) {
        await speakAndWait(spokenResponse);
      }

      let prompt =
        "Would you like to repeat the result, scan again, or say Stop to exit? You can also say Describe, Read Text, Walk Assist, or Home.";

      while (versionRef.current === version) {
        const heard = await ask(prompt, version, { preferCommands: true });
        prompt = "";
        if (!heard) return;

        const intent = parseVoiceIntent(heard);
        if (intent.type === "repeat" || intent.type === "resume") {
          if (spokenResponse) {
            await speakAndWait(spokenResponse);
          }
          prompt =
            "Would you like to repeat the result, scan again, or say Stop to exit?";
        } else if (intent.type === "scan_again") {
          return actionsRef.current.scanAgain
            ? actionsRef.current.scanAgain()
            : navigate(`/camera/${resultMode}`);
        } else if (
          [
            "describe",
            "read",
            "walk",
            "guide",
            "emergency",
            "history",
            "settings",
          ].includes(intent.type)
        ) {
          return performDirect(intent.type);
        } else if (intent.type === "home" || intent.type === "back") {
          return performDirect(intent.type);
        } else if (intent.type === "help") {
          await speakAndWait(GUIDE.result);
          prompt = READY;
        } else {
          prompt =
            "I didn't understand. Say Repeat, Scan Again, Describe, Read Text, Walk Assist, or Stop.";
        }
      }
    };

    const runGuide = async () => {
      let prompt = firstActivationRef.current
        ? ACTIVATED
        : "You are on the User Guide screen. Say Describe, Read Text, Walk Assist, Emergency, or Home.";
      firstActivationRef.current = false;

      while (versionRef.current === version) {
        const heard = await ask(prompt, version, { preferCommands: true });
        prompt = "";
        if (!heard) return;

        const intent = parseVoiceIntent(heard);
        if (intent.type === "help") {
          await speakAndWait(GUIDE.home);
          prompt = READY;
        } else if (intent.type === "repeat" || intent.type === "resume") {
          prompt = lastPromptRef.current || READY;
        } else if (
          [
            "describe",
            "read",
            "walk",
            "guide",
            "emergency",
            "history",
            "settings",
          ].includes(intent.type)
        ) {
          return performDirect(intent.type);
        } else if (intent.type === "home" || intent.type === "back") {
          return performDirect(intent.type);
        } else {
          prompt =
            "I didn't understand. Say Describe, Read Text, Walk Assist, Guide, or Emergency.";
        }
      }
    };

    const runWalkSetup = async () => {
      let prompt = firstActivationRef.current
        ? ACTIVATED
        : "Walk Assist setup. Tell me a destination, or say Describe, Read Text, or Home.";
      firstActivationRef.current = false;

      while (versionRef.current === version) {
        const heard = await ask(prompt, version);
        prompt = "";
        if (!heard) return;

        const intent = parseVoiceIntent(heard);
        if (
          [
            "describe",
            "read",
            "walk",
            "guide",
            "emergency",
            "history",
            "settings",
          ].includes(intent.type)
        ) {
          return performDirect(intent.type);
        } else if (intent.type === "home" || intent.type === "back") {
          return performDirect(intent.type);
        } else if (actionsRef.current.searchDestination) {
          return actionsRef.current.searchDestination(heard);
        } else {
          prompt = "Tell me a destination to search, or say Back.";
        }
      }
    };

    const runFindSetup = async () => {
      let prompt = firstActivationRef.current
        ? ACTIVATED
        : "Find object mode. Tell me what object you want to find, or say Describe, Read Text, or Home.";
      firstActivationRef.current = false;

      while (versionRef.current === version) {
        const heard = await ask(prompt, version);
        prompt = "";
        if (!heard) return;

        const intent = parseVoiceIntent(heard);
        if (
          [
            "describe",
            "read",
            "walk",
            "guide",
            "emergency",
            "history",
            "settings",
          ].includes(intent.type)
        ) {
          return performDirect(intent.type);
        } else if (intent.type === "home" || intent.type === "back") {
          return performDirect(intent.type);
        } else if (heard.trim()) {
          const setFindQuery = useNetraStore.getState().setFindQuery;
          setFindQuery(heard.trim());
          return navigate("/camera/find");
        } else {
          prompt =
            "Say the name of an object, or say Describe, Read Text, or Home.";
        }
      }
    };

    const runHistory = async () => {
      let prompt = firstActivationRef.current
        ? ACTIVATED
        : "History screen. Say Describe, Read Text, Walk Assist, Back, or Home.";
      firstActivationRef.current = false;

      while (versionRef.current === version) {
        const heard = await ask(prompt, version, { preferCommands: true });
        prompt = "";
        if (!heard) return;

        const intent = parseVoiceIntent(heard);
        if (
          [
            "describe",
            "read",
            "walk",
            "guide",
            "emergency",
            "history",
            "settings",
          ].includes(intent.type)
        ) {
          return performDirect(intent.type);
        } else if (intent.type === "home" || intent.type === "back") {
          return performDirect(intent.type);
        } else {
          prompt = "Say Describe, Read Text, Walk Assist, Back, or Home.";
        }
      }
    };

    const runSettings = async () => {
      let prompt = firstActivationRef.current
        ? ACTIVATED
        : "Settings screen. Say Back or Home to return.";
      firstActivationRef.current = false;

      while (versionRef.current === version) {
        const heard = await ask(prompt, version, { preferCommands: true });
        prompt = "";
        if (!heard) return;

        const intent = parseVoiceIntent(heard);
        if (
          [
            "describe",
            "read",
            "walk",
            "guide",
            "emergency",
            "history",
          ].includes(intent.type)
        ) {
          return performDirect(intent.type);
        } else if (intent.type === "home" || intent.type === "back") {
          return performDirect(intent.type);
        } else {
          prompt = "Say Back or Home to return.";
        }
      }
    };

    const runEmergency = async () => {
      let prompt = firstActivationRef.current
        ? ACTIVATED
        : "Emergency screen. Say Call Emergency, or say Back or Home.";
      firstActivationRef.current = false;

      while (versionRef.current === version) {
        const heard = await ask(prompt, version, { preferCommands: true });
        prompt = "";
        if (!heard) return;

        const intent = parseVoiceIntent(heard);
        if (intent.type === "emergency" || intent.type === "yes") {
          return (
            actionsRef.current.callEmergency?.() || performDirect("emergency")
          );
        } else if (intent.type === "home" || intent.type === "back") {
          return performDirect(intent.type);
        } else {
          prompt = "Say Call Emergency, or say Back or Home.";
        }
      }
    };

    const runGeneric = async () => {
      let prompt = firstActivationRef.current ? ACTIVATED : READY;
      firstActivationRef.current = false;

      while (versionRef.current === version) {
        const heard = await ask(prompt, version, { preferCommands: true });
        prompt = "";
        if (!heard) return;

        const intent = parseVoiceIntent(heard);
        if (
          [
            "describe",
            "read",
            "walk",
            "guide",
            "emergency",
            "history",
            "settings",
          ].includes(intent.type)
        ) {
          return performDirect(intent.type);
        } else if (intent.type === "home" || intent.type === "back") {
          return performDirect(intent.type);
        } else {
          prompt = "Say Describe, Read Text, Walk Assist, Guide, or Emergency.";
        }
      }
    };

    if (location.pathname === "/") runHome();
    else if (location.pathname === "/camera/describe") runCamera("describe");
    else if (location.pathname === "/camera/read") runCamera("read");
    else if (location.pathname === "/result") runResult();
    else if (location.pathname === "/guide") runGuide();
    else if (location.pathname === "/walk-assist") runWalkSetup();
    else if (location.pathname === "/find") runFindSetup();
    else if (location.pathname === "/history") runHistory();
    else if (location.pathname === "/settings") runSettings();
    else if (location.pathname === "/emergency-call") runEmergency();
    else runGeneric();

    return cancelConversation;
  }, [
    actionsVersion,
    ask,
    autoSpeak,
    cancelConversation,
    location.pathname,
    navigate,
    performDirect,
    speakAndWait,
    voiceAssistantActive,
    voiceEnabled,
  ]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) recognition.abortListening();
      else if (voiceAssistantActive && voiceEnabled)
        setActionsVersion((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [recognition.abortListening, voiceAssistantActive, voiceEnabled]);

  // Only the provider's recognizer is used. Barge-in accepts exact stop phrases,
  // never ordinary commands, and is disabled when that phrase is in Netra's own speech.
  useEffect(() => {
    if (
      location.pathname === "/camera/assist" ||
      location.pathname === "/walk-assist"
    ) {
      return undefined;
    }
    let bargeTimer = null;
    const onStart = (event) => {
      if (!voiceAssistantActive || !voiceEnabled || document.hidden) return;
      recognition.abortListening();
      const spoken = normalizeVoiceText(event.detail?.text || "");
      currentSpeechRef.current = spoken;
      if (
        [
          "stop",
          "stop talking",
          "be quiet",
          "quiet",
          "shush",
          "that's enough",
          "exit",
          "cancel",
          "hush",
        ].some((word) => spoken.includes(word))
      )
        return;
      const session = ++bargeRef.current;
      window.clearTimeout(bargeTimer);
      const listenForStop = (attempt) => {
        if (bargeRef.current !== session || !window.speechSynthesis?.speaking)
          return;
        recognition
          .listenWithTimeout(10000)
          .then((heard) => {
            if (bargeRef.current !== session) return;
            const intent = parseVoiceIntent(heard);
            if (
              intent.type === "stop_talking" ||
              intent.type === "stop_voice"
            ) {
              stopCurrentSpeech();
              deactivateVoiceAssistant(true);
            } else if (attempt < 2) {
              bargeTimer = window.setTimeout(
                () => listenForStop(attempt + 1),
                650,
              );
            }
          })
          .catch(() => {
            if (
              attempt < 2 &&
              bargeRef.current === session &&
              window.speechSynthesis?.speaking
            ) {
              bargeTimer = window.setTimeout(
                () => listenForStop(attempt + 1),
                650,
              );
            }
          });
      };
      bargeTimer = window.setTimeout(() => listenForStop(1), 180);
    };
    const onEnd = () => {
      if (!currentSpeechRef.current) return;
      currentSpeechRef.current = "";
      bargeRef.current += 1;
      window.clearTimeout(bargeTimer);
      recognition.abortListening();
    };
    window.addEventListener("netra-speech-start", onStart);
    window.addEventListener("netra-speech-end", onEnd);
    return () => {
      window.clearTimeout(bargeTimer);
      window.removeEventListener("netra-speech-start", onStart);
      window.removeEventListener("netra-speech-end", onEnd);
    };
  }, [
    recognition.abortListening,
    recognition.listenWithTimeout,
    location.pathname,
    stopCurrentSpeech,
    voiceAssistantActive,
    voiceEnabled,
  ]);

  // Global gesture shortcuts: double-click / double-tap anywhere on ANY page to activate voice assistant
  // and triple tap anywhere on ANY page to trigger emergency call
  const lastTapRef = useRef(0);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  useEffect(() => {
    const handlePointerUp = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;

      // 3-tap Emergency
      tapCountRef.current += 1;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (tapCountRef.current >= 3) {
        tapCountRef.current = 0;
        if (location.pathname !== "/emergency-call") {
          navigate("/emergency-call");
        }
        return;
      }
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 550);

      // Double-tap to activate / reactivate voice assistant
      const now = Date.now();
      const elapsed = now - lastTapRef.current;
      if (elapsed > 0 && elapsed <= 450) {
        lastTapRef.current = 0;
        activateVoiceAssistant();
        return;
      }
      lastTapRef.current = now;
    };

    const handleDblClick = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      activateVoiceAssistant();
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("dblclick", handleDblClick);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("dblclick", handleDblClick);
    };
  }, [activateVoiceAssistant, location.pathname, navigate]);

  const value = useMemo(
    () => ({
      ...recognition,
      speak,
      speakAndWait,
      ask,
      listenWithTimeout,
      registerActions,
      cancelConversation,
      stopSpeech: speech.stop,
      stopCurrentSpeech,
      voiceAssistantActive,
      voiceEnabled,
      isActivatingVoice,
      activateVoiceAssistant,
      deactivateVoiceAssistant,
      fallbackMessage,
    }),
    [
      recognition,
      speak,
      speakAndWait,
      ask,
      listenWithTimeout,
      registerActions,
      cancelConversation,
      speech.stop,
      stopCurrentSpeech,
      voiceAssistantActive,
      voiceEnabled,
      isActivatingVoice,
      activateVoiceAssistant,
      deactivateVoiceAssistant,
      fallbackMessage,
    ],
  );

  return (
    <NetraVoiceContext.Provider value={value}>
      {children}
      {fallbackMessage && (
        <p
          className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md rounded-xl bg-white p-3 text-sm text-slate-800 shadow-lg"
          role="status"
        >
          {fallbackMessage}
        </p>
      )}
    </NetraVoiceContext.Provider>
  );
}
