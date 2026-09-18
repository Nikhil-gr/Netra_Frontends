import { useCallback, useRef, useState } from "react";

import { useSpeechSynthesis } from "../speech/useSpeechSynthesis.js";

import { useNetraStore } from "../../store/useNetraStore.js";

export function useSpokenAction() {
  const [armedId, setArmedId] = useState(null);

  const [readyId, setReadyId] = useState(null);

  const armedIdRef = useRef(null);

  const readyIdRef = useRef(null);

  const speechRate = useNetraStore((state) => state.speechRate);

  const language = useNetraStore((state) => state.language);

  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis();

  const speechLanguage = language === "ne" ? "ne-NP" : "en-US";

  const clearSelection = useCallback(() => {
    armedIdRef.current = null;
    readyIdRef.current = null;

    setArmedId(null);
    setReadyId(null);
  }, []);

  const trigger = useCallback(
    ({ id, announcement, action }) => {
      if (!id) {
        return;
      }

      const isSameButton = armedIdRef.current === id;

      const isReady = readyIdRef.current === id;

      // SECOND CLICK
      // Only execute if the first
      // announcement has finished.
      if (isSameButton && isReady) {
        stop();

        clearSelection();

        action?.();

        return;
      }

      // If this button is already
      // speaking, do nothing.
      if (isSameButton && isSpeaking) {
        return;
      }

      // FIRST CLICK
      // Never navigate here.
      stop();

      armedIdRef.current = id;
      readyIdRef.current = null;

      setArmedId(id);
      setReadyId(null);

      const markReady = () => {
        // Make sure the user has not
        // selected another button.
        if (armedIdRef.current !== id) {
          return;
        }

        readyIdRef.current = id;

        setReadyId(id);
      };

      // If speech is unavailable,
      // still require two clicks.
      if (!isSupported) {
        markReady();

        return;
      }

      speak(announcement, {
        language: speechLanguage,

        rate: speechRate,

        // IMPORTANT:
        // We only arm the second click.
        // We DO NOT execute action here.
        onEnd: markReady,

        onError: markReady,
      });
    },
    [
      clearSelection,
      isSpeaking,
      isSupported,
      speak,
      speechLanguage,
      speechRate,
      stop,
    ],
  );

  const isArmed = useCallback((id) => armedId === id, [armedId]);

  const isReady = useCallback((id) => readyId === id, [readyId]);

  return {
    trigger,
    isArmed,
    isReady,
    armedId,
    readyId,
    isSpeaking,
    reset: clearSelection,
  };
}
