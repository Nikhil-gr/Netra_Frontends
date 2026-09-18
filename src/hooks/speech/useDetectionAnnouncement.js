import { useEffect, useRef } from "react";

import { useSpeechSynthesis } from "./useSpeechSynthesis.js";

const REQUIRED_STREAK = 2;

// Same object in same position
// should not annoy the user repeatedly.
const REPEAT_COOLDOWN_MS = 10000;

// Minimum gap between different spoken alerts.
const GLOBAL_SPEECH_GAP_MS = 1800;

const POSITION_PRIORITY = {
  center: 4,
  left: 2,
  right: 2,
  unclear: 1,
};

const getDetectionKey = (detection) => {
  return `${detection.label}:${detection.position}`;
};

const getPositionPhrase = (position) => {
  switch (position) {
    case "left":
      return "on your left";

    case "right":
      return "on your right";

    case "center":
      return "ahead";

    default:
      return "nearby";
  }
};

const formatObjectName = (name) => {
  if (!name) {
    return "Object";
  }

  return name.charAt(0).toUpperCase() + name.slice(1);
};

const buildAnnouncement = ({ detection, mode, findQuery }) => {
  const rawName =
    mode === "find" && findQuery?.trim() ? findQuery.trim() : detection.label;

  const objectName = formatObjectName(rawName);

  const position = getPositionPhrase(detection.position);

  if (mode === "find") {
    return `${objectName} found ${position}.`;
  }

  return `${objectName} ${position}.`;
};

const sortDetections = (detections) => {
  return [...detections].sort((a, b) => {
    const positionDifference =
      (POSITION_PRIORITY[b.position] ?? 0) -
      (POSITION_PRIORITY[a.position] ?? 0);

    if (positionDifference !== 0) {
      return positionDifference;
    }

    return b.confidence - a.confidence;
  });
};

export function useDetectionAnnouncements({
  detections = [],
  mode,
  findQuery = "",
  enabled = true,
  speechRate = 1,
  language = "en-US",
}) {
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis();

  const streaksRef = useRef(new Map());

  const spokenRef = useRef(new Map());

  const lastSpeechTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      streaksRef.current.clear();
      return;
    }

    const now = Date.now();

    const previousStreaks = streaksRef.current;

    const nextStreaks = new Map();

    detections.forEach((detection) => {
      const key = getDetectionKey(detection);

      const previousCount = previousStreaks.get(key) ?? 0;

      nextStreaks.set(key, previousCount + 1);
    });

    streaksRef.current = nextStreaks;

    if (isSpeaking) {
      return;
    }

    if (now - lastSpeechTimeRef.current < GLOBAL_SPEECH_GAP_MS) {
      return;
    }

    const stableDetections = detections.filter((detection) => {
      const key = getDetectionKey(detection);

      const streak = nextStreaks.get(key) ?? 0;

      return streak >= REQUIRED_STREAK;
    });

    if (stableDetections.length === 0) {
      return;
    }

    const sortedDetections = sortDetections(stableDetections);

    const candidate = sortedDetections.find((detection) => {
      const key = getDetectionKey(detection);

      const lastSpoken = spokenRef.current.get(key) ?? 0;

      return now - lastSpoken >= REPEAT_COOLDOWN_MS;
    });

    if (!candidate) {
      return;
    }

    const message = buildAnnouncement({
      detection: candidate,
      mode,
      findQuery,
    });

    const didSpeak = speak(message, {
      language,
      rate: speechRate,
    });

    if (!didSpeak) {
      return;
    }

    const key = getDetectionKey(candidate);

    spokenRef.current.set(key, now);

    lastSpeechTimeRef.current = now;

    spokenRef.current.forEach((timestamp, storedKey) => {
      if (now - timestamp > 30000) {
        spokenRef.current.delete(storedKey);
      }
    });
  }, [
    detections,
    enabled,
    findQuery,
    isSpeaking,
    language,
    mode,
    speak,
    speechRate,
  ]);

  useEffect(() => {
    return () => {
      stop();

      streaksRef.current.clear();
      spokenRef.current.clear();
    };
  }, [stop]);

  return {
    speechSupported: isSupported,

    isSpeaking,
  };
}
