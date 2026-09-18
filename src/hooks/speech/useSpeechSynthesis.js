import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceIdRef = useRef(0);
  const pendingResolveRef = useRef(null);

  const isSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  const stop = useCallback(() => {
    if (!isSupported) return;

    utteranceIdRef.current += 1;
    window.speechSynthesis.cancel();
    pendingResolveRef.current?.(false);
    pendingResolveRef.current = null;
    setIsSpeaking(false);
    window.dispatchEvent(new CustomEvent("netra-speech-end"));
  }, [isSupported]);

  const speak = useCallback(
    (
      text,
      {
        language = "en-US",
        rate = 1,
        pitch = 1,
        volume = 1,
        onEnd,
        onError,
        preservePending = false,
      } = {},
    ) => {
      if (!isSupported || !text?.trim()) {
        onError?.();

        return false;
      }

      const synthesis = window.speechSynthesis;

      if (!preservePending) {
        pendingResolveRef.current?.(false);
        pendingResolveRef.current = null;
      }

      const utteranceId = utteranceIdRef.current + 1;
      utteranceIdRef.current = utteranceId;
      synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text.trim());

      utterance.lang = language;

      utterance.rate = Math.min(1.5, Math.max(0.6, rate));

      utterance.pitch = pitch;
      utterance.volume = volume;

      utterance.onstart = () => {
        if (utteranceIdRef.current !== utteranceId) return;
        setIsSpeaking(true);
        window.dispatchEvent(new CustomEvent("netra-speech-start"));
      };

      utterance.onend = () => {
        if (utteranceIdRef.current !== utteranceId) return;
        setIsSpeaking(false);
        window.dispatchEvent(new CustomEvent("netra-speech-end"));

        onEnd?.();
      };

      utterance.onerror = (event) => {
        if (utteranceIdRef.current !== utteranceId) return;
        setIsSpeaking(false);
        window.dispatchEvent(new CustomEvent("netra-speech-end"));

        onError?.(event);
      };

      synthesis.speak(utterance);

      return true;
    },
    [isSupported],
  );

  const speakAndWait = useCallback(
    (text, options = {}) => {
      return new Promise((resolve) => {
        if (!isSupported || !text?.trim()) {
          resolve(false);

          return;
        }

        pendingResolveRef.current?.(false);
        pendingResolveRef.current = resolve;

        speak(text, {
          ...options,
          preservePending: true,

          onEnd: () => {
            pendingResolveRef.current = null;
            resolve(true);
          },

          onError: () => {
            pendingResolveRef.current = null;
            resolve(false);
          },
        });
      });
    },
    [isSupported, speak],
  );

  useEffect(() => {
    const handleGlobalStop = () => stop();
    window.addEventListener("netra-stop-speech", handleGlobalStop);
    return () => {
      window.removeEventListener("netra-stop-speech", handleGlobalStop);
      if (isSupported) {
        stop();
      }
    };
  }, [isSupported, stop]);

  return {
    speak,
    speakAndWait,
    stop,
    isSpeaking,
    isSupported,
  };
}
