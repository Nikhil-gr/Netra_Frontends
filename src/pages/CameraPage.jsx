import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  ChevronLeft,
  CircleHelp,
  Eye,
  FileText,
  LoaderCircle,
  Search,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import CameraView from "../components/camera/CameraView.jsx";
import DetectionPanel from "../components/camera/DirectionPanel.jsx";
import ProcessingState from "../components/common/ProcessingState.jsx";
import WalkAssistStatusPanel from "../components/walk/WalkAssistStatusPanel.jsx";
import {
  DesktopHeader,
  MobileBottomNav,
} from "../components/layout/NetraNavigation.jsx";

import { useCamera } from "../hooks/camera/useCamera.js";

import { useObjectDetection } from "../hooks/vision/useObjectDetection.js";

import { useSpeechSynthesis } from "../hooks/speech/useSpeechSynthesis.js";

import { useDetectionAnnouncements } from "../hooks/speech/useDetectionAnnouncement.js";

import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";

import { useGeolocation } from "../hooks/location/useGeolocation.js";

import { useWalkAssistAudio } from "../hooks/assist/useWalkAssitAudio.js";

import { useAnalyzeImage } from "../queries/analysis/useAnalyzeImage.js";

import { useNetraStore } from "../store/useNetraStore.js";
import { useNetraVoice } from "../voice/useNetraVoice.js";
import { parseVoiceIntent } from "../voice/voiceIntents.js";

import { captureFrame } from "../utils/image/captureFrame.js";

import { compressImage } from "../utils/image/compressImage.js";

import { MODES } from "../utils/constants.js";

import {
  getSafeRouteInstruction,
  useRouteGuidance,
} from "../utils/navigation/useRouteGuidance.js";

const MODE_CONTENT = {
  describe: {
    title: "Describe surroundings",

    description: "Point the camera at the scene you want Netra to understand.",

    icon: Eye,
  },

  read: {
    title: "Read visible text",

    description:
      "Point the camera toward a sign, label, menu, document, or other text you want Netra to read.",

    icon: FileText,
  },

  find: {
    title: "Find an object",

    description:
      "Move the camera slowly while Netra searches for your selected object.",

    icon: Search,
  },

  assist: {
    title: "Walk Assist",

    description:
      "Netra combines walking directions with live awareness from the camera.",

    icon: ShieldAlert,
  },
};

const getEntryAnnouncement = ({ mode, findQuery, walkDestination }) => {
  switch (mode) {
    case "describe":
      return "";

    case "read":
      return "";

    case "find":
      return `Looking for ${findQuery}. Move the camera slowly around your surroundings.`;

    case "assist":
      return `Walk Assist active${
        walkDestination?.name || walkDestination?.label
          ? ` for ${walkDestination.name || walkDestination.label}`
          : ""
      }. Point the camera forward. Netra will announce route directions and useful nearby objects.`;

    default:
      return "";
  }
};

const getAnalysisErrorMessage = (error, mode) => {
  if (error?.code === "CLIENT_COOLDOWN") {
    return error.message;
  }

  if (error?.code === "ANALYSIS_IN_PROGRESS") {
    return error.message;
  }

  const backendError = error?.response?.data?.error;

  const code = backendError?.code;

  const message = backendError?.message;

  if (
    code === "AI_RATE_LIMITED" ||
    code === "RATE_LIMITED" ||
    error?.response?.status === 429
  ) {
    return "The AI limit is temporarily busy. Please wait before trying again.";
  }

  if (code === "AI_TIMEOUT") {
    return "Analysis took too long. Please try again.";
  }

  if (code === "IMAGE_NOT_ANALYZED") {
    return mode === "read"
      ? "The text in this view could not be analyzed. Point the camera at the text and try again."
      : "This view could not be analyzed. Point the camera somewhere else and try again.";
  }

  return (
    message ||
    error?.message ||
    (mode === "read"
      ? "Unable to read the text right now."
      : "Unable to analyze the scene.")
  );
};

export default function CameraPage() {
  const { mode } = useParams();

  const navigate = useNavigate();
  const locationRoute = useLocation();

  const videoRef = useRef(null);

  const entryTimerRef = useRef(null);

  const lastAnnouncedModeRef = useRef(null);

  const analysisLockRef = useRef(false);
  const walkSpeechRef = useRef("");

  const [liveAnnouncementsReady, setLiveAnnouncementsReady] = useState(false);

  const [analysisError, setAnalysisError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [walkDetectionReady, setWalkDetectionReady] = useState(false);
  const [walkVoiceReady, setWalkVoiceReady] = useState(false);
  const [walkGuidanceMuted, setWalkGuidanceMuted] = useState(false);
  const {
    registerActions,
    listenWithTimeout,
    abortListening,
    speakAndWait: voiceSpeakAndWait,
    voiceAssistantActive,
    voiceEnabled,
    deactivateVoiceAssistant,
    stopCurrentSpeech,
  } = useNetraVoice();

  const findQuery = useNetraStore((state) => state.findQuery);

  const autoSpeak = useNetraStore((state) => state.autoSpeak);

  const speechRate = useNetraStore((state) => state.speechRate);

  const vibrationEnabled = useNetraStore((state) => state.vibrationEnabled);

  const setCurrentResult = useNetraStore((state) => state.setCurrentResult);

  const walkDestination = useNetraStore((state) => state.walkDestination);

  const walkRoute = useNetraStore((state) => state.walkRoute);

  const walkStepIndex = useNetraStore((state) => state.walkStepIndex);

  const walkAssistActive = useNetraStore((state) => state.walkAssistActive);

  const walkAssistPaused = useNetraStore((state) => state.walkAssistPaused);

  const walkLastCue = useNetraStore((state) => state.walkLastCue);

  const setWalkStepIndex = useNetraStore((state) => state.setWalkStepIndex);

  const setWalkAssistPaused = useNetraStore(
    (state) => state.setWalkAssistPaused,
  );

  const setWalkLastCue = useNetraStore((state) => state.setWalkLastCue);

  const clearWalkAssist = useNetraStore((state) => state.clearWalkAssist);

  const speechLanguage = "en-US";

  const {
    speak,

    isSpeaking: isEntrySpeaking,
  } = useSpeechSynthesis();

  const { trigger, isArmed } = useSpokenAction();

  const { stream, error, isStarting, startCamera, stopCamera } = useCamera({
    walkAssist: mode === "assist",
  });

  const analyzeMutation = useAnalyzeImage();

  const [zoom, setZoom] = useState("1x");
  const [torch, setTorch] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  const handleToggleTorch = useCallback(async () => {
    if (!stream) {
      setTorch((prev) => !prev);
      return;
    }
    const track = stream.getVideoTracks()[0];
    if (!track) {
      setTorch((prev) => !prev);
      return;
    }
    try {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torch }],
        });
      }
      setTorch((prev) => !prev);
    } catch {
      setTorch((prev) => !prev);
    }
  }, [stream, torch]);

  const handleToggleZoom = useCallback(() => {
    setZoom((prev) => (prev === "1x" ? "2x" : "1x"));
  }, []);

  const handleHelp = useCallback(() => {
    setTipsOpen((prev) => !prev);
    speak(
      mode === "read"
        ? "Hold the text steadily in front of the camera with good lighting. Tap Read Aloud to listen."
        : "Point your camera around you. Keep your phone steady. Tap Describe to hear what Netra sees.",
    );
  }, [mode, speak]);

  const handleImageUpload = useCallback(
    async (file) => {
      if (!file) return;
      try {
        setAnalysisError("");
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const response = await analyzeMutation.mutateAsync({
          image: base64,
          mode: mode === "read" ? "read" : "describe",
        });
        setCurrentResult({
          mode,
          result: response,
          timestamp: Date.now(),
        });
        navigate("/result");
      } catch (err) {
        setAnalysisError(getAnalysisErrorMessage(err, mode));
      }
    },
    [analyzeMutation, mode, navigate, setCurrentResult],
  );

  const isValidMode = MODES.includes(mode);

  const missingFindQuery = mode === "find" && !findQuery.trim();

  const missingWalkRoute =
    mode === "assist" &&
    (!walkAssistActive ||
      !Array.isArray(walkRoute?.steps) ||
      walkRoute.steps.length === 0);

  const localDetectionEnabled =
    Boolean(stream) &&
    (mode === "find" ||
      (mode === "assist" &&
        cameraReady &&
        walkDetectionReady &&
        !walkAssistPaused));

  const { detections, isModelLoading, isDetecting, detectionError } =
    useObjectDetection({
      videoRef,

      enabled: localDetectionEnabled,

      minScore: mode === "find" ? 0.5 : 0.55,

      interval: mode === "assist" ? 1500 : 700,

      maxDetections: mode === "assist" ? 6 : 10,
    });

  useEffect(() => {
    setWalkDetectionReady(false);
    setWalkVoiceReady(false);
    if (mode !== "assist" || !cameraReady || missingWalkRoute) return undefined;
    const timer = window.setTimeout(() => setWalkDetectionReady(true), 1800);
    return () => window.clearTimeout(timer);
  }, [mode, cameraReady, missingWalkRoute]);

  useEffect(() => {
    if (!walkDetectionReady || isModelLoading || !liveAnnouncementsReady)
      return undefined;
    const timer = window.setTimeout(() => setWalkVoiceReady(true), 400);
    return () => window.clearTimeout(timer);
  }, [walkDetectionReady, isModelLoading, liveAnnouncementsReady]);

  const visibleDetections =
    mode === "find"
      ? detections.filter((detection) => {
          const label = detection.label.trim().toLowerCase();

          const query = findQuery.trim().toLowerCase();

          return (
            label === query || label.includes(query) || query.includes(label)
          );
        })
      : detections;

  const {
    location,

    error: locationError,

    isTracking,
  } = useGeolocation({
    enabled:
      mode === "assist" && cameraReady && isValidMode && !missingWalkRoute,
  });

  const {
    cue: routeCue,

    currentStep,

    distanceToStep,
  } = useRouteGuidance({
    route: walkRoute,

    currentLocation: location,

    currentStepIndex: walkStepIndex,

    setCurrentStepIndex: setWalkStepIndex,

    enabled:
      mode === "assist" &&
      !missingWalkRoute &&
      cameraReady &&
      !walkAssistPaused,
  });

  const findSpeechEnabled = Boolean(
    autoSpeak &&
    mode === "find" &&
    liveAnnouncementsReady &&
    localDetectionEnabled &&
    !isModelLoading &&
    !detectionError &&
    !isEntrySpeaking &&
    !analyzeMutation.isPending,
  );

  const { isSpeaking: isDetectionSpeaking } = useDetectionAnnouncements({
    detections: visibleDetections,

    mode,

    findQuery,

    enabled: findSpeechEnabled,

    speechRate,

    language: speechLanguage,
  });

  const handleWalkCue = useCallback(
    (cue) => {
      if (cue?.message) {
        setWalkLastCue(cue.message);
      }
    },
    [setWalkLastCue],
  );

  const walkAudioEnabled = Boolean(
    autoSpeak &&
    mode === "assist" &&
    !missingWalkRoute &&
    liveAnnouncementsReady &&
    !walkAssistPaused &&
    !walkGuidanceMuted &&
    !isEntrySpeaking,
  );

  const { isSpeaking: isWalkSpeaking } = useWalkAssistAudio({
    detections: mode === "assist" ? detections : [],

    routeCue: mode === "assist" ? routeCue : null,

    enabled: walkAudioEnabled,

    speechRate,

    language: speechLanguage,

    vibrationEnabled,

    onCue: handleWalkCue,
  });

  useEffect(() => {
    if (!isValidMode || missingFindQuery || missingWalkRoute) {
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [
    isValidMode,
    missingFindQuery,
    missingWalkRoute,
    startCamera,
    stopCamera,
  ]);

  useEffect(() => {
    if (
      !isValidMode ||
      missingFindQuery ||
      missingWalkRoute ||
      (mode === "assist" && !cameraReady) ||
      lastAnnouncedModeRef.current === mode
    ) {
      return;
    }

    if (voiceAssistantActive && (mode === "describe" || mode === "read")) {
      setLiveAnnouncementsReady(true);
      return;
    }

    setLiveAnnouncementsReady(false);

    entryTimerRef.current = window.setTimeout(() => {
      lastAnnouncedModeRef.current = mode;

      const message = getEntryAnnouncement({
        mode,

        findQuery,

        walkDestination,
      });

      if (!message) {
        setLiveAnnouncementsReady(true);

        return;
      }

      const spoken = speak(message, {
        language: speechLanguage,

        rate: speechRate,

        onEnd: () => setLiveAnnouncementsReady(true),

        onError: () => setLiveAnnouncementsReady(true),
      });

      if (!spoken) {
        setLiveAnnouncementsReady(true);
      }
    }, 200);

    return () => {
      if (entryTimerRef.current) {
        window.clearTimeout(entryTimerRef.current);
      }
    };
  }, [
    cameraReady,
    findQuery,
    isValidMode,
    missingFindQuery,
    missingWalkRoute,
    mode,
    speak,
    speechLanguage,
    speechRate,
    walkDestination,
    voiceAssistantActive,
  ]);

  const handleImageAnalysis = async (analysisMode) => {
    if (analysisLockRef.current || analyzeMutation.isPending) {
      return;
    }

    analysisLockRef.current = true;

    setAnalysisError(null);

    try {
      const capturedImage = await captureFrame(videoRef.current);

      const compressedImage = await compressImage(capturedImage, {
        maxDimension: 1024,

        quality: 0.72,
      });

      const analysis = await analyzeMutation.mutateAsync({
        image: compressedImage,

        mode: analysisMode,

        language: "en",

        saveHistory: false,
      });

      setCurrentResult(analysis);

      stopCamera();

      navigate("/result");
    } catch (analysisException) {
      console.error(`${analysisMode} analysis failed:`, analysisException);

      const message = getAnalysisErrorMessage(analysisException, analysisMode);

      setAnalysisError(message);

      speak(message, {
        language: speechLanguage,

        rate: speechRate,
      });
    } finally {
      analysisLockRef.current = false;
    }
  };

  const handleDescribe = () => handleImageAnalysis("describe");

  const handleRead = () => handleImageAnalysis("read");

  const handleBack = () => {
    if (mode === "assist") {
      stopCamera();

      clearWalkAssist();

      navigate("/walk-assist");

      return;
    }

    navigate("/");
  };

  const handlePauseToggle = () => {
    const nextPaused = !walkAssistPaused;

    setWalkAssistPaused(nextPaused);

    const message = nextPaused ? "Walk Assist paused." : "Walk Assist resumed.";

    setWalkLastCue(message);

    speak(message, {
      language: speechLanguage,

      rate: speechRate,
    });
  };

  const handleRepeatDirection = () => {
    const message = getSafeRouteInstruction(currentStep);

    setWalkLastCue(message);

    speak(message, {
      language: speechLanguage,

      rate: speechRate,
    });
  };

  const handleEndWalk = () => {
    stopCamera();

    clearWalkAssist();

    navigate("/");
  };

  useEffect(() => {
    setCameraReady(false);
    const video = videoRef.current;
    if (!stream || !video) return undefined;
    const markReady = () => {
      if (
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        setCameraReady(true);
      }
    };
    markReady();
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    return () => {
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
    };
  }, [stream]);

  useEffect(
    () =>
      registerActions({
        cameraReady,
        cameraError: error,
        pending: analyzeMutation.isPending || analysisLockRef.current,
        analyze: mode === "read" ? handleRead : handleDescribe,
        home: () => {
          stopCamera();
          navigate("/");
        },
        back: handleBack,
      }),
    [
      cameraReady,
      error,
      analyzeMutation.isPending,
      mode,
      navigate,
      registerActions,
      stopCamera,
    ],
  );

  useEffect(() => {
    if (mode !== "assist" || !voiceAssistantActive || !voiceEnabled)
      return undefined;
    let timer = null;
    const onStop = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => voiceSpeakAndWait("What can I help you with?"),
        150,
      );
    };
    const onSpeechStart = (event) => {
      walkSpeechRef.current = event.detail?.text || "";
    };
    const onSpeechEnd = () => {
      walkSpeechRef.current = "";
    };
    window.addEventListener("netra-speech-start", onSpeechStart);
    window.addEventListener("netra-speech-end", onSpeechEnd);
    window.addEventListener("netra-stop-speech", onStop);
    return () => {
      window.clearTimeout(timer);
      walkSpeechRef.current = "";
      window.removeEventListener("netra-speech-start", onSpeechStart);
      window.removeEventListener("netra-speech-end", onSpeechEnd);
      window.removeEventListener("netra-stop-speech", onStop);
    };
  }, [mode, voiceAssistantActive, voiceEnabled, voiceSpeakAndWait]);

  useEffect(() => {
    if (
      mode !== "assist" ||
      missingWalkRoute ||
      !walkVoiceReady ||
      !voiceAssistantActive ||
      !voiceEnabled
    ) {
      return undefined;
    }
    let cancelled = false;
    const listenForWalkCommands = async () => {
      while (!cancelled) {
        try {
          if (document.hidden) {
            await new Promise((resolve) => window.setTimeout(resolve, 800));
            continue;
          }
          const speechAtStart = walkSpeechRef.current;
          const heard = await listenWithTimeout(30000);
          if (cancelled) return;
          const intent = parseVoiceIntent(heard, {
            expectsConfirmation: false,
          });
          // During guidance, accept only Stop and ignore commands in our own speech.
          const spokenText = `${speechAtStart} ${walkSpeechRef.current}`;
          if (
            spokenText.trim() &&
            (intent.type !== "stop_talking" ||
              /\b(stop|stop talking|be quiet|quiet|shush|that's enough)\b/i.test(
                spokenText,
              ))
          ) {
            await new Promise((resolve) => window.setTimeout(resolve, 400));
            continue;
          }
          if (intent.type === "stop_voice") {
            deactivateVoiceAssistant();
            return;
          }
          if (intent.type === "stop_talking") {
            stopCurrentSpeech();
            await new Promise((resolve) => window.setTimeout(resolve, 400));
            continue;
          }
          if (intent.type === "pause" && !walkAssistPaused) handlePauseToggle();
          else if (intent.type === "resume" && walkAssistPaused)
            handlePauseToggle();
          else if (
            intent.type === "resume" &&
            !walkAssistPaused &&
            !walkGuidanceMuted
          )
            handleRepeatDirection();
          else if (
            intent.type === "repeat" ||
            intent.type === "repeat_direction"
          )
            handleRepeatDirection();
          else if (intent.type === "mute_guidance") {
            setWalkGuidanceMuted(true);
            await voiceSpeakAndWait(
              "Walk Assist guidance muted. Say Unmute Guidance to restore automatic speech.",
            );
          } else if (intent.type === "unmute_guidance") {
            setWalkGuidanceMuted(false);
            await voiceSpeakAndWait("Walk Assist guidance unmuted.");
          } else if (intent.type === "destination") {
            const name =
              walkDestination?.name ||
              walkDestination?.label ||
              "your selected destination";
            await voiceSpeakAndWait(`You are going to ${name}.`);
          } else if (intent.type === "help") {
            await voiceSpeakAndWait(
              "Say Pause, Resume or Continue, Repeat Direction, Destination, Mute Guidance, Unmute Guidance, End Walk, Back, Home, Stop, or Guide.",
            );
          } else if (["end_walk", "back", "home"].includes(intent.type)) {
            await voiceSpeakAndWait(
              "Do you want to end Walk Assist and return Home?",
            );
            if (cancelled) return;
            const answer = parseVoiceIntent(await listenWithTimeout(9000), {
              expectsConfirmation: true,
            });
            if (cancelled) return;
            if (answer.type === "yes") {
              handleEndWalk();
              return;
            }
            await voiceSpeakAndWait("Okay. Continuing Walk Assist.");
          }
          await new Promise((resolve) => window.setTimeout(resolve, 400));
        } catch (error) {
          if (cancelled) return;
          if (
            /denied|not.allowed|network|microphone|audio-capture/i.test(
              error?.message || "",
            )
          ) {
            deactivateVoiceAssistant();
            return;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 900));
        }
      }
    };
    listenForWalkCommands();
    return () => {
      cancelled = true;
      abortListening();
    };
  }, [
    abortListening,
    deactivateVoiceAssistant,
    walkVoiceReady,
    stopCurrentSpeech,
    listenWithTimeout,
    missingWalkRoute,
    mode,
    speechRate,
    voiceAssistantActive,
    voiceEnabled,
    voiceSpeakAndWait,
    walkAssistPaused,
    walkDestination,
    walkGuidanceMuted,
  ]);

  if (!isValidMode) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center bg-[#030a12] px-5 text-white">
        <h1 className="text-2xl font-semibold text-white">
          Invalid camera mode
        </h1>

        <button
          type="button"
          onClick={() =>
            trigger({
              id: "invalid-home",

              announcement:
                "Return home button clicked. Press again to return home.",

              action: () => navigate("/"),
            })
          }
          className={`mt-6 inline-flex min-h-12 w-fit items-center justify-center rounded-xl px-5 font-medium ${
            isArmed("invalid-home")
              ? "bg-blue-700 text-white ring-4 ring-blue-400/20"
              : "bg-blue-600 text-white"
          }`}
        >
          Return home
        </button>
      </main>
    );
  }

  if (missingFindQuery) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center bg-[#030a12] px-5 text-white">
        <h1 className="text-2xl font-semibold text-white">
          Choose an object first
        </h1>

        <p className="mt-2 text-slate-400">
          Tell Netra what you want to find first.
        </p>

        <button
          type="button"
          onClick={() =>
            trigger({
              id: "choose-object",

              announcement:
                "Choose object button clicked. Press again to choose an object.",

              action: () => navigate("/find"),
            })
          }
          className={`mt-6 inline-flex min-h-12 w-fit items-center justify-center rounded-xl px-5 font-medium text-white ${
            isArmed("choose-object")
              ? "bg-blue-700 ring-4 ring-blue-400/20"
              : "bg-blue-600"
          }`}
        >
          Choose object
        </button>
      </main>
    );
  }

  if (missingWalkRoute) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center bg-[#030a12] px-5 text-white">
        <h1 className="text-2xl font-semibold text-white">
          Choose a destination first
        </h1>

        <p className="mt-2 leading-7 text-slate-400">
          Walk Assist needs a walking route before live guidance can begin.
        </p>

        <button
          type="button"
          onClick={() =>
            trigger({
              id: "choose-destination",

              announcement:
                "Choose destination button clicked. Press again to choose a destination.",

              action: () => navigate("/walk-assist"),
            })
          }
          className={`mt-6 inline-flex min-h-12 w-fit items-center justify-center rounded-xl px-5 font-medium text-white ${
            isArmed("choose-destination")
              ? "bg-blue-700 ring-4 ring-blue-400/20"
              : "bg-blue-600"
          }`}
        >
          Choose destination
        </button>
      </main>
    );
  }

  const content = MODE_CONTENT[mode];

  const ModeIcon = content.icon;

  const isSpeaking = isEntrySpeaking || isDetectionSpeaking || isWalkSpeaking;

  return (
    <main className="min-h-screen bg-[#080c14] pb-24 text-slate-100 outline-none md:pb-8">
      <DesktopHeader compact />

      <div className="mx-auto w-full max-w-xl px-4 pt-3 sm:px-6 md:max-w-4xl md:pt-6">
        {/* Minimal Header */}
        <header className="flex h-12 items-center justify-between px-1 mb-3">
          <button
            type="button"
            onClick={() =>
              trigger({
                id: "camera-back",
                announcement:
                  mode === "assist"
                    ? "Back button clicked. Press again to end this walk and return to destination setup."
                    : "Back button clicked. Press again to return home.",
                action: handleBack,
              })
            }
            className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition active:scale-95"
            aria-label="Back to home"
          >
            <ChevronLeft size={19} />
            <span>Back</span>
          </button>

          <h1 className="text-sm font-semibold tracking-wide text-white">
            {mode === "describe"
              ? "Describe Surroundings"
              : mode === "read"
                ? "Read Text"
                : content.title}
          </h1>

          <button
            type="button"
            onClick={handleHelp}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95 ${
              tipsOpen
                ? "bg-blue-600/20 text-blue-400"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
            }`}
            aria-label="Tips and help"
            title="Help & Tips"
          >
            <CircleHelp size={19} />
          </button>
        </header>

        {/* Tips Dropdown Banner */}
        {tipsOpen && (
          <div className="mb-3 rounded-2xl border border-blue-500/20 bg-[#0d1624] p-3.5 text-xs text-slate-300">
            <p className="font-semibold text-blue-300">Tips for clearer results:</p>
            <ul className="mt-1.5 space-y-1 list-disc list-inside text-slate-400">
              <li>Keep phone steady while analyzing</li>
              <li>Good natural lighting improves description detail</li>
              <li>You can also tap the gallery button to upload an existing photo</li>
            </ul>
          </div>
        )}

        {/* Camera View and Actions Grid */}
        <div className="grid gap-3.5 md:grid-cols-[minmax(0,1fr)_340px] md:gap-5 md:items-start">
          <div className="min-w-0">
            <CameraView
              videoRef={videoRef}
              stream={stream}
              error={error}
              isStarting={isStarting}
              helperText={
                mode === "describe"
                  ? "Point camera at your surroundings"
                  : mode === "read"
                    ? "Point camera at visible text"
                    : mode === "find"
                      ? `Searching for: ${findQuery}`
                      : walkDestination
                        ? `Route to ${walkDestination.label || walkDestination.name}`
                        : undefined
              }
              zoom={zoom}
              onZoomToggle={handleToggleZoom}
              torch={torch}
              onTorchToggle={handleToggleTorch}
              onImageFile={handleImageUpload}
            />

            {analysisError && (
              <div
                className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-200"
                role="alert"
              >
                {analysisError}
              </div>
            )}
          </div>

          {/* Action Card Section */}
          <aside className="min-w-0">
            {(mode === "describe" || mode === "read") && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d131f] p-4 sm:p-5 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      mode === "describe"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    }`}
                  >
                    {mode === "describe" ? (
                      <Eye size={20} />
                    ) : (
                      <FileText size={20} />
                    )}
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {mode === "describe" ? "Describe Surroundings" : "Read Visible Text"}
                    </h2>
                    <p className="mt-1 text-xs leading-normal text-slate-400">
                      {mode === "describe"
                        ? "Netra will analyze this camera view and speak what is in front of you."
                        : "Netra will scan and read aloud visible text, documents, menus, and signs."}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    disabled={analyzeMutation.isPending || (!stream && !isStarting)}
                    onClick={() =>
                      trigger({
                        id: mode === "describe" ? "describe-scene" : "read-text",
                        announcement:
                          mode === "describe"
                            ? "Describe button clicked. Press again to analyze."
                            : "Read text button clicked. Press again to capture and read.",
                        action: mode === "describe" ? handleDescribe : handleRead,
                      })
                    }
                    className={`flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                      isArmed("describe-scene") || isArmed("read-text")
                        ? "ring-4 ring-blue-400/30"
                        : ""
                    }`}
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <LoaderCircle size={18} className="animate-spin" />
                        <span>Analyzing with Netra...</span>
                      </>
                    ) : mode === "describe" ? (
                      <>
                        <Eye size={18} />
                        <span>Describe Surroundings</span>
                      </>
                    ) : (
                      <>
                        <Volume2 size={18} />
                        <span>Read Aloud</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-3 text-[11px] text-center text-slate-500">
                  Tip: Hold phone steady with good lighting
                </p>
              </div>
            )}

            {mode === "find" && (
              <div className="space-y-3">
                <DetectionPanel
                  detections={visibleDetections}
                  isModelLoading={isModelLoading}
                  isDetecting={isDetecting}
                  error={detectionError}
                />
                <section className="rounded-2xl border border-white/[0.08] bg-[#0d131f] p-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Volume2 size={18} className="text-blue-400" />
                    <h2 className="text-sm font-semibold">Voice Feedback</h2>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {!liveAnnouncementsReady
                      ? "Starting voice guidance..."
                      : isSpeaking
                        ? "Netra is speaking."
                        : "Netra is scanning surroundings for " + findQuery}
                  </p>
                </section>
              </div>
            )}

            {mode === "assist" && (
              <WalkAssistStatusPanel
                destination={walkDestination}
                currentDirection={getSafeRouteInstruction(currentStep)}
                distanceToStep={distanceToStep}
                lastCue={walkLastCue}
                location={location}
                locationError={locationError}
                isTracking={isTracking}
                isModelLoading={isModelLoading}
                detectionError={detectionError}
                detections={detections}
                isSpeaking={isSpeaking}
                paused={walkAssistPaused}
                onRepeatDirection={() =>
                  trigger({
                    id: "repeat-direction",
                    announcement:
                      "Repeat direction button clicked. Press again to hear the route direction.",
                    action: handleRepeatDirection,
                  })
                }
                repeatSelected={isArmed("repeat-direction")}
                onPauseToggle={() =>
                  trigger({
                    id: "pause-walk-assist",
                    announcement: walkAssistPaused
                      ? "Resume Walk Assist button clicked. Press again to resume."
                      : "Pause Walk Assist button clicked. Press again to pause.",
                    action: handlePauseToggle,
                  })
                }
                pauseSelected={isArmed("pause-walk-assist")}
                onEndWalk={() =>
                  trigger({
                    id: "end-walk-assist",
                    announcement:
                      "End Walk Assist button clicked. Press again to end navigation.",
                    action: handleEndWalk,
                  })
                }
                endSelected={isArmed("end-walk-assist")}
              />
            )}
          </aside>
        </div>
      </div>

      <MobileBottomNav pathname={locationRoute.pathname} />
    </main>
  );
}
