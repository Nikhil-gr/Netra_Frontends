import { useEffect, useRef, useState } from "react";

import { useSpeechSynthesis } from "../speech/useSpeechSynthesis.js";

import { useVibration } from "../device/useVibration.js";

const REQUIRED_STREAK = 2;

const ENVIRONMENT_COOLDOWN_MS = 7000;

const GLOBAL_GAP_MS = 1300;

const getStabilityKey = (detection) => detection.label;

const getCooldownKey = (detection) =>
  `${detection.label}:${detection.position}`;

const getAreaRatio = (detection) =>
  Number.isFinite(detection?.areaRatio) ? detection.areaRatio : 0;

const getBottomRatio = (detection) =>
  Number.isFinite(detection?.bottomRatio) ? detection.bottomRatio : 0;

const getCenterOverlapRatio = (detection) =>
  Number.isFinite(detection?.centerOverlapRatio)
    ? detection.centerOverlapRatio
    : detection?.position === "center"
      ? 1
      : 0;

const getConfidence = (detection) =>
  Number.isFinite(detection?.confidence) ? detection.confidence : 0;

const getEnvironmentalPriority = (detection) => {
  const areaRatio = getAreaRatio(detection);

  const bottomRatio = getBottomRatio(detection);

  const centerOverlapRatio = getCenterOverlapRatio(detection);

  const confidence = getConfidence(detection);

  const isForwardRelevant =
    detection.position === "center" || centerOverlapRatio >= 0.2;

  if (isForwardRelevant) {
    if (areaRatio >= 0.06) {
      return 112;
    }

    if (areaRatio >= 0.025) {
      return 106;
    }

    if (bottomRatio >= 0.78 && areaRatio >= 0.01) {
      return 102;
    }

    if (areaRatio >= 0.012) {
      return 94;
    }

    if (bottomRatio >= 0.72 && areaRatio >= 0.006 && confidence >= 0.6) {
      return 88;
    }
  }

  if (
    (detection.position === "left" || detection.position === "right") &&
    bottomRatio >= 0.82 &&
    areaRatio >= 0.025
  ) {
    return 66;
  }

  if (
    (detection.position === "left" || detection.position === "right") &&
    areaRatio >= 0.05
  ) {
    return 58;
  }

  return 0;
};

const getPositionPhrase = (position) => {
  switch (position) {
    case "center":
      return "directly ahead";

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
  id: `environment-${getCooldownKey(detection)}-${Date.now()}`,

  type: "environment",

  priority: getEnvironmentalPriority(detection),

  message: `${formatLabel(detection.label)} ${getPositionPhrase(
    detection.position,
  )}.`,

  detection,
});

const pickBestDetectionPerLabel = (detections) => {
  const bestByLabel = new Map();

  detections.forEach((detection) => {
    const priority = getEnvironmentalPriority(detection);

    if (priority <= 0) {
      return;
    }

    const key = getStabilityKey(detection);

    const existing = bestByLabel.get(key);

    if (!existing) {
      bestByLabel.set(key, detection);

      return;
    }

    const existingPriority = getEnvironmentalPriority(existing);

    if (priority > existingPriority) {
      bestByLabel.set(key, detection);

      return;
    }

    if (
      priority === existingPriority &&
      getAreaRatio(detection) > getAreaRatio(existing)
    ) {
      bestByLabel.set(key, detection);
    }
  });

  return Array.from(bestByLabel.values());
};

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

      pendingRouteCueRef.current = null;

      return;
    }

    const now = Date.now();

    const qualifyingDetections = pickBestDetectionPerLabel(detections);

    const previousStreaks = streaksRef.current;

    const nextStreaks = new Map();

    qualifyingDetections.forEach((detection) => {
      const key = getStabilityKey(detection);

      nextStreaks.set(key, (previousStreaks.get(key) ?? 0) + 1);
    });

    streaksRef.current = nextStreaks;

    if (isSpeaking || now - lastSpeechTimeRef.current < GLOBAL_GAP_MS) {
      return;
    }

    const environmentalCue = qualifyingDetections
      .filter((detection) => {
        const stabilityKey = getStabilityKey(detection);

        const cooldownKey = getCooldownKey(detection);

        const streak = nextStreaks.get(stabilityKey) ?? 0;

        const lastSpoken =
          lastEnvironmentSpokenRef.current.get(cooldownKey) ?? 0;

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

        return getConfidence(b) - getConfidence(a);
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
      const cooldownKey = getCooldownKey(selectedCue.detection);

      lastEnvironmentSpokenRef.current.set(cooldownKey, now);

      if (vibrationEnabled) {
        const isForward = selectedCue.detection.position === "center";

        vibrate(isForward ? [140, 70, 140] : [90, 60, 90]);
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
