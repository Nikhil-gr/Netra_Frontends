import { useEffect, useRef, useState } from "react";

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

import { useCamera } from "../hooks/camera/useCamera.js";

import { useObjectDetection } from "../hooks/vision/useObjectDetection.js";

import { useSpeechSynthesis } from "../hooks/speech/useSpeechSynthesis.js";

import { useDetectionAnnouncements } from "../hooks/speech/useDetectionAnnouncement.js";

import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";

import { useAnalyzeImage } from "../queries/analysis/useAnalyzeImage.js";

import { useNetraStore } from "../store/useNetraStore.js";

import { captureFrame } from "../utils/image/captureFrame.js";

import { compressImage } from "../utils/image/compressImage.js";

import { MODES } from "../utils/constants.js";

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
    title: "Walk assist",

    description:
      "Netra watches the area ahead and announces useful environmental information.",

    icon: ShieldAlert,
  },
};

const getEntryAnnouncement = (mode, findQuery) => {
  switch (mode) {
    case "describe":
      return "Describe mode. Point your camera at your surroundings. Press describe scene when ready.";

    case "read":
      return "Read text mode. Point your camera at the text you want to read. Press read text when ready.";

    case "find":
      return `Looking for ${findQuery}. Move the camera slowly around your surroundings.`;

    case "assist":
      return "Walk assist active. Camera starting.";

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

  const findQuery = useNetraStore((state) => state.findQuery);

  const autoSpeak = useNetraStore((state) => state.autoSpeak);

  const speechRate = useNetraStore((state) => state.speechRate);

  const language = useNetraStore((state) => state.language);

  const setCurrentResult = useNetraStore((state) => state.setCurrentResult);

  const speechLanguage = language === "en-US";

  const { speak, isSpeaking: isEntrySpeaking } = useSpeechSynthesis();

  const { trigger, isArmed } = useSpokenAction();

  const { stream, error, isStarting, startCamera, stopCamera } = useCamera();

  const analyzeMutation = useAnalyzeImage();

  const isValidMode = MODES.includes(mode);

  const missingFindQuery = mode === "find" && !findQuery.trim();

  const localDetectionEnabled =
    Boolean(stream) && (mode === "find" || mode === "assist");

  const { detections, isModelLoading, isDetecting, detectionError } =
    useObjectDetection({
      videoRef,

      enabled: localDetectionEnabled,

      minScore: 0.6,

      interval: 700,
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

  const liveSpeechEnabled = Boolean(
    autoSpeak &&
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

    enabled: liveSpeechEnabled,

    speechRate,

    language: speechLanguage,
  });

  useEffect(() => {
    if (!isValidMode || missingFindQuery) {
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isValidMode, missingFindQuery, startCamera, stopCamera]);

  useEffect(() => {
    if (
      !isValidMode ||
      missingFindQuery ||
      lastAnnouncedModeRef.current === mode
    ) {
      return;
    }

    setLiveAnnouncementsReady(false);

    entryTimerRef.current = window.setTimeout(() => {
      lastAnnouncedModeRef.current = mode;

      const message = getEntryAnnouncement(mode, findQuery);

      if (!message) {
        setLiveAnnouncementsReady(true);

        return;
      }

      const spoken = speak(message, {
        language: speechLanguage,

        rate: speechRate,

        onEnd: () => {
          setLiveAnnouncementsReady(true);
        },

        onError: () => {
          setLiveAnnouncementsReady(true);
        },
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
    mode,
    speak,
    speechLanguage,
    speechRate,
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
    navigate("/");
  };

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

              action: handleBack,
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

  const content = MODE_CONTENT[mode];

  const ModeIcon = content.icon;

  const isSpeaking = isEntrySpeaking || isDetectionSpeaking;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() =>
            trigger({
              id: "camera-back",

              announcement: "Back button clicked. Press again to return home.",

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
      </section>

      <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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

        {(mode === "find" || mode === "assist") && (
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
      </section>
    </main>
  );
}
