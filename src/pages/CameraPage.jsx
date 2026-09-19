import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Eye,
  FileText,
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
    <main className="min-h-screen bg-[#030a12] pb-24 text-white md:pb-0">
      <DesktopHeader compact />

      <div className="mx-auto w-full max-w-[1500px] px-3 py-3 sm:px-5 md:px-6 md:py-6 lg:px-8">
        <header className="mb-3 flex min-h-14 items-center justify-between rounded-2xl border border-white/10 bg-[#07111c] px-3 md:mb-5 md:px-5">
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
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
              isArmed("camera-back")
                ? "bg-blue-500/20 text-blue-300 ring-2 ring-blue-400/30"
                : "text-slate-300 hover:bg-[#07111c]/5 hover:text-white"
            }`}
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ModeIcon size={18} className="text-blue-400" />
            <span>
              {mode === "describe"
                ? "Describe"
                : mode === "read"
                  ? "Read Text"
                  : content.title}
            </span>
          </div>

          <div className="w-11" aria-hidden="true" />
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)] lg:gap-5">
          <div className="min-w-0">
            <div className="relative">
              <CameraView
                videoRef={videoRef}
                stream={stream}
                error={error}
                isStarting={isStarting}
                placeholderSrc={
                  mode === "read"
                    ? "/netra_WPA/04_read_text_scene.webp"
                    : "/netra_WPA/03_describe_scene.webp"
                }
              />

              {(mode === "describe" || mode === "read") && (
                <div className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs font-medium text-white backdrop-blur-md sm:text-sm">
                  {mode === "describe"
                    ? "Point your camera at something"
                    : "Point your camera at visible text"}
                </div>
              )}

              {mode === "find" && (
                <div className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs font-medium text-white backdrop-blur-md">
                  Looking for: {findQuery}
                </div>
              )}

              {mode === "assist" && walkDestination && (
                <div className="pointer-events-none absolute left-4 right-4 top-5 z-10 rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-sm text-white backdrop-blur-md">
                  <span className="text-slate-300">Walking to </span>
                  <span className="font-semibold">
                    {walkDestination.label || walkDestination.name}
                  </span>
                </div>
              )}
            </div>

            {analysisError && (mode === "describe" || mode === "read") && (
              <div
                className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
                role="alert"
              >
                {analysisError}
              </div>
            )}

            {mode === "assist" && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#07111c]/[0.035] p-4 lg:hidden">
                <div className="flex items-center gap-2">
                  {autoSpeak ? (
                    <Volume2 size={19} className="text-blue-400" />
                  ) : (
                    <VolumeX size={19} className="text-slate-500" />
                  )}
                  <p className="text-sm font-medium text-slate-200">
                    {walkAssistPaused
                      ? "Walk Assist paused"
                      : autoSpeak
                        ? "Audio guidance active"
                        : "Automatic speech is disabled in Settings"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="min-w-0">
            {mode === "describe" && (
              <div className="rounded-3xl border border-white/10 bg-[#07111c] p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-500/15">
                    <img
                      src="/netra_WPA/07_describe_icon.png"
                      alt=""
                      className="h-11 w-11 object-contain"
                    />
                  </span>
                  <div>
                    <h1 className="text-xl font-semibold">Describe</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Get a clear, detailed description of objects, people,
                      places and more around you.
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  {analyzeMutation.isPending ? (
                    <ProcessingState message="Understanding your surroundings..." />
                  ) : (
                    <button
                      type="button"
                      disabled={!stream || isStarting}
                      onClick={() =>
                        trigger({
                          id: "describe-scene",
                          announcement:
                            "Describe scene button clicked. Press again to analyze the scene.",
                          action: handleDescribe,
                        })
                      }
                      className={`inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${isArmed("describe-scene") ? "ring-4 ring-blue-400/30" : ""}`}
                    >
                      <Sparkles size={21} />
                      Describe
                    </button>
                  )}
                </div>
                <div className="mt-5 border-t border-white/10 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Tips
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                    <li>Point your camera at the scene.</li>
                    <li>Keep the phone steady.</li>
                    <li>Good lighting gives clearer results.</li>
                  </ul>
                </div>
              </div>
            )}

            {mode === "read" && (
              <div className="rounded-3xl border border-white/10 bg-[#07111c] p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-500/15">
                    <img
                      src="/netra_WPA/09_read_text_icon.png"
                      alt=""
                      className="h-11 w-11 object-contain"
                    />
                  </span>
                  <div>
                    <h1 className="text-xl font-semibold">Read Text</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Scan and listen to visible text aloud. Supports documents,
                      signs, labels and more.
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  {analyzeMutation.isPending ? (
                    <ProcessingState message="Reading visible text..." />
                  ) : (
                    <button
                      type="button"
                      disabled={!stream || isStarting}
                      onClick={() =>
                        trigger({
                          id: "read-text",
                          announcement:
                            "Read text button clicked. Press again to capture and read the visible text.",
                          action: handleRead,
                        })
                      }
                      className={`inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${isArmed("read-text") ? "ring-4 ring-blue-400/30" : ""}`}
                    >
                      <Volume2 size={21} />
                      Read Aloud
                    </button>
                  )}
                </div>
                <div className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-slate-400">
                  Keep the text centered, steady and well lit for the clearest
                  reading.
                </div>
              </div>
            )}

            {mode === "find" && (
              <div className="space-y-4">
                <DetectionPanel
                  detections={visibleDetections}
                  isModelLoading={isModelLoading}
                  isDetecting={isDetecting}
                  error={detectionError}
                />
                <section className="rounded-3xl border border-white/10 bg-[#07111c] p-5">
                  <div className="flex items-center gap-2">
                    {autoSpeak ? (
                      <Volume2 size={20} className="text-blue-400" />
                    ) : (
                      <VolumeX size={20} className="text-slate-500" />
                    )}
                    <h2 className="font-semibold">Voice feedback</h2>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {!liveAnnouncementsReady
                      ? "Starting voice guidance..."
                      : isSpeaking
                        ? "Netra is speaking."
                        : "Netra is monitoring your surroundings."}
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
                      "Repeat direction button clicked. Press again to hear the current route direction.",
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
                      "End Walk Assist button clicked. Press again to end navigation and return home.",
                    action: handleEndWalk,
                  })
                }
                endSelected={isArmed("end-walk-assist")}
              />
            )}
          </aside>
        </section>
      </div>

      <MobileBottomNav pathname={locationRoute.pathname} />
    </main>
  );
}
