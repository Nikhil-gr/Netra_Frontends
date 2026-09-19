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

import { useNavigate, useParams } from "react-router-dom";

import CameraView from "../components/camera/CameraView.jsx";
import DetectionPanel from "../components/camera/DirectionPanel.jsx";
import ProcessingState from "../components/common/ProcessingState.jsx";
import WalkAssistStatusPanel from "../components/walk/WalkAssistStatusPanel.jsx";

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

  const videoRef = useRef(null);

  const entryTimerRef = useRef(null);

  const lastAnnouncedModeRef = useRef(null);

  const analysisLockRef = useRef(false);

  const [liveAnnouncementsReady, setLiveAnnouncementsReady] = useState(false);

  const [analysisError, setAnalysisError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [walkGuidanceMuted, setWalkGuidanceMuted] = useState(false);
  const {
    registerActions,
    listenWithTimeout,
    abortListening,
    speakAndWait: voiceSpeakAndWait,
    voiceAssistantActive,
    voiceEnabled,
    deactivateVoiceAssistant,
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

  const { stream, error, isStarting, startCamera, stopCamera } = useCamera();

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
    (mode === "find" || (mode === "assist" && !walkAssistPaused));

  const { detections, isModelLoading, isDetecting, detectionError } =
    useObjectDetection({
      videoRef,

      enabled: localDetectionEnabled,

      minScore: mode === "find" ? 0.5 : 0.45,

      interval: mode === "assist" ? 500 : 700,

      maxDetections: mode === "assist" ? 20 : 10,
    });

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
    enabled: mode === "assist" && isValidMode && !missingWalkRoute,
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
      liveAnnouncementsReady &&
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
    if (mode !== "assist" || !voiceAssistantActive || !voiceEnabled) return undefined;
    let timer = null;
    const onStop = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => voiceSpeakAndWait("What can I help you with?"), 150);
    };
    window.addEventListener("netra-stop-speech", onStop);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("netra-stop-speech", onStop);
    };
  }, [mode, voiceAssistantActive, voiceEnabled, voiceSpeakAndWait]);

  useEffect(() => {
    if (
      mode !== "assist" ||
      missingWalkRoute ||
      isEntrySpeaking ||
      isWalkSpeaking ||
      !voiceAssistantActive ||
      !voiceEnabled
    ) {
      abortListening();
      return undefined;
    }
    let cancelled = false;
    const listenForWalkCommands = async () => {
      while (!cancelled) {
        try {
          if (window.speechSynthesis?.speaking) {
            await new Promise((resolve) => window.setTimeout(resolve, 450));
            continue;
          }
          const heard = await listenWithTimeout(30000);
          if (cancelled) return;
          const intent = parseVoiceIntent(heard, {
            expectsConfirmation: false,
          });
          if (intent.type === "stop_voice") {
            deactivateVoiceAssistant();
            return;
          }
          if (intent.type === "stop_talking") {
            await voiceSpeakAndWait("What can I help you with?");
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
            try {
              const answer = parseVoiceIntent(await listenWithTimeout(9000), {
                expectsConfirmation: true,
              });
              if (answer.type === "yes") {
                handleEndWalk();
                return;
              }
              await voiceSpeakAndWait("Okay. Continuing Walk Assist.");
            } catch {}
          }
        } catch {
          // Silence is normal during active walking; re-arm without prompting.
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
    isEntrySpeaking,
    isWalkSpeaking,
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
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5">
        <h1 className="text-2xl font-semibold text-slate-950">
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
              ? "bg-emerald-800 text-white ring-4 ring-emerald-100"
              : "bg-emerald-700 text-white"
          }`}
        >
          Return home
        </button>
      </main>
    );
  }

  if (missingFindQuery) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5">
        <h1 className="text-2xl font-semibold text-slate-950">
          Choose an object first
        </h1>

        <p className="mt-2 text-slate-600">
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
              ? "bg-emerald-800 ring-4 ring-emerald-100"
              : "bg-emerald-700"
          }`}
        >
          Choose object
        </button>
      </main>
    );
  }

  if (missingWalkRoute) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5">
        <h1 className="text-2xl font-semibold text-slate-950">
          Choose a destination first
        </h1>

        <p className="mt-2 leading-7 text-slate-600">
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
              ? "bg-emerald-800 ring-4 ring-emerald-100"
              : "bg-emerald-700"
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
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6">
      <header className="flex items-center justify-between gap-4">
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
              ? "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <ModeIcon size={15} />

          {content.title}
        </div>
      </header>

      <section className="mt-7">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {content.title}
        </h1>

        <p className="mt-2 max-w-2xl leading-7 text-slate-600">
          {content.description}
        </p>

        {mode === "find" && (
          <div className="mt-4 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
            Looking for: {findQuery}
          </div>
        )}

        {mode === "assist" && walkDestination && (
          <div className="mt-4 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
            Destination: {walkDestination.label || walkDestination.name}
          </div>
        )}
      </section>

      <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <CameraView
            videoRef={videoRef}
            stream={stream}
            error={error}
            isStarting={isStarting}
          />

          {mode === "describe" && (
            <div className="mt-5">
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
                  className={`inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isArmed("describe-scene")
                      ? "bg-emerald-800 ring-4 ring-emerald-100"
                      : "bg-emerald-700 hover:bg-emerald-800"
                  }`}
                >
                  <Sparkles size={23} />
                  Describe scene
                </button>
              )}

              {analysisError && (
                <div
                  className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                  role="alert"
                >
                  {analysisError}
                </div>
              )}
            </div>
          )}

          {mode === "read" && (
            <div className="mt-5">
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
                  className={`inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isArmed("read-text")
                      ? "bg-emerald-800 ring-4 ring-emerald-100"
                      : "bg-emerald-700 hover:bg-emerald-800"
                  }`}
                >
                  <FileText size={23} />
                  Read text
                </button>
              )}

              {analysisError && (
                <div
                  className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                  role="alert"
                >
                  {analysisError}
                </div>
              )}
            </div>
          )}

          {mode === "assist" && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                {autoSpeak ? (
                  <Volume2 size={19} className="text-emerald-700" />
                ) : (
                  <VolumeX size={19} className="text-slate-500" />
                )}

                <p className="text-sm font-medium text-slate-800">
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

        {mode === "describe" && (
          <aside className="rounded-2xl border border-slate-200 bg-white p-5">
            <Eye size={22} className="text-emerald-700" />

            <h2 className="mt-4 font-semibold text-slate-950">Describe mode</h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Point the camera at the scene you want Netra to understand.
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Press Describe scene once to hear the button. Press it again to
              analyze.
            </p>
          </aside>
        )}

        {mode === "read" && (
          <aside className="rounded-2xl border border-slate-200 bg-white p-5">
            <FileText size={22} className="text-emerald-700" />

            <h2 className="mt-4 font-semibold text-slate-950">Read mode</h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Point the camera directly at the text. Keep the phone steady and
              try to fill the frame with the sign, label, menu, or document.
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Press Read text once to hear the button. Press it again to capture
              one frame and read the visible text.
            </p>
          </aside>
        )}

        {mode === "find" && (
          <div className="space-y-4">
            <DetectionPanel
              detections={visibleDetections}
              isModelLoading={isModelLoading}
              isDetecting={isDetecting}
              error={detectionError}
            />

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                {autoSpeak ? (
                  <Volume2 size={20} className="text-emerald-700" />
                ) : (
                  <VolumeX size={20} className="text-slate-500" />
                )}

                <h2 className="font-semibold text-slate-950">Voice feedback</h2>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
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
      </section>
    </main>
  );
}
