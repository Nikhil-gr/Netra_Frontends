import { useEffect, useRef, useState } from "react";

import { useSpeechSynthesis } from "../speech/useSpeechSynthesis.js";
import { useVibration } from "../device/useVibration.js";

const REQUIRED_STREAK = 2;
const ENVIRONMENT_COOLDOWN_MS = 10000;
const GLOBAL_GAP_MS = 1600;

const getDetectionKey = (detection) =>
  `${detection.label}:${detection.position}`;

const getAreaRatio = (detection) =>
  Number.isFinite(detection?.areaRatio) ? detection.areaRatio : 0;

const getEnvironmentalPriority = (detection) => {
  const areaRatio = getAreaRatio(detection);

  if (detection.position === "center") {
    if (areaRatio >= 0.12) {
      return 105;
    }

    if (areaRatio >= 0.05) {
      return 92;
    }
  }

  if (
    (detection.position === "left" || detection.position === "right") &&
    areaRatio >= 0.14
  ) {
    return 55;
  }

  return 0;
};

const getPositionPhrase = (position) => {
  switch (position) {
    case "center":
      return "ahead";

    case "left":
      return "on your left";

    case "right":
      return "on your right";

    default:
      return "nearby";
  }
};

const formatLabel = (label = "Object") =>
  label.charAt(0).toUpperCase() + label.slice(1);

const buildEnvironmentalCue = (detection) => ({
  id: `environment-${getDetectionKey(detection)}-${Date.now()}`,
  type: "environment",
  priority: getEnvironmentalPriority(detection),
  message: `${formatLabel(detection.label)} ${getPositionPhrase(
    detection.position,
  )}.`,
  detection,
});

export function useWalkAssistAudio({
  detections = [],
  routeCue,
  enabled = true,
  speechRate = 1,
  language = "en-US",
  vibrationEnabled = true,
  onCue,
}) {
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis();
  const { vibrate } = useVibration();

  const streaksRef = useRef(new Map());
  const lastEnvironmentSpokenRef = useRef(new Map());
  const pendingRouteCueRef = useRef(null);
  const lastHandledRouteCueRef = useRef(null);
  const lastSpeechTimeRef = useRef(0);

  const [lastCue, setLastCue] = useState(null);

  useEffect(() => {
    if (!routeCue?.id || routeCue.id === lastHandledRouteCueRef.current) {
      return;
    }

    pendingRouteCueRef.current = routeCue;
  }, [routeCue]);

  useEffect(() => {
    if (!enabled) {
      streaksRef.current.clear();
      return;
    }

    const now = Date.now();
    const previousStreaks = streaksRef.current;
    const nextStreaks = new Map();

    detections.forEach((detection) => {
      const priority = getEnvironmentalPriority(detection);

      if (priority <= 0) {
        return;
      }

      const key = getDetectionKey(detection);
      nextStreaks.set(key, (previousStreaks.get(key) ?? 0) + 1);
    });

    streaksRef.current = nextStreaks;

    if (isSpeaking || now - lastSpeechTimeRef.current < GLOBAL_GAP_MS) {
      return;
    }

    const environmentalCue = detections
      .filter((detection) => {
        const priority = getEnvironmentalPriority(detection);

        if (priority <= 0) {
          return false;
        }

        const key = getDetectionKey(detection);
        const streak = nextStreaks.get(key) ?? 0;
        const lastSpoken = lastEnvironmentSpokenRef.current.get(key) ?? 0;

        return (
          streak >= REQUIRED_STREAK &&
          now - lastSpoken >= ENVIRONMENT_COOLDOWN_MS
        );
      })
      .sort((a, b) => {
        const priorityDifference =
          getEnvironmentalPriority(b) - getEnvironmentalPriority(a);

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        const areaDifference = getAreaRatio(b) - getAreaRatio(a);

        if (areaDifference !== 0) {
          return areaDifference;
        }

        return b.confidence - a.confidence;
      })
      .map(buildEnvironmentalCue)[0];

    const pendingRouteCue = pendingRouteCueRef.current;

    let selectedCue = null;

    if (
      environmentalCue &&
      (!pendingRouteCue ||
        environmentalCue.priority >= pendingRouteCue.priority)
    ) {
      selectedCue = environmentalCue;
    } else if (pendingRouteCue) {
      selectedCue = pendingRouteCue;
    }

    if (!selectedCue?.message) {
      return;
    }

    const didSpeak = speak(selectedCue.message, {
      language,
      rate: speechRate,
    });

    if (!didSpeak) {
      return;
    }

    lastSpeechTimeRef.current = now;
    setLastCue(selectedCue);
    onCue?.(selectedCue);

    if (selectedCue.type === "environment") {
      const key = getDetectionKey(selectedCue.detection);
      lastEnvironmentSpokenRef.current.set(key, now);

      if (vibrationEnabled) {
        vibrate([120, 70, 120]);
      }
    } else {
      lastHandledRouteCueRef.current = selectedCue.id;
      pendingRouteCueRef.current = null;

      if (vibrationEnabled) {
        vibrate(
          selectedCue.type === "arrival"
            ? [150, 80, 150, 80, 250]
            : [80, 60, 80],
        );
      }
    }

    lastEnvironmentSpokenRef.current.forEach((timestamp, key) => {
      if (now - timestamp > 30000) {
        lastEnvironmentSpokenRef.current.delete(key);
      }
    });
  }, [
    detections,
    enabled,
    isSpeaking,
    language,
    onCue,
    routeCue,
    speak,
    speechRate,
    vibrate,
    vibrationEnabled,
  ]);

  useEffect(() => {
    return () => {
      stop();
      streaksRef.current.clear();
      lastEnvironmentSpokenRef.current.clear();
      pendingRouteCueRef.current = null;
    };
  }, [stop]);

  return {
    lastCue,
    isSpeaking,
    speechSupported: isSupported,
  };
}
