import { useCallback, useEffect, useState } from "react";

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  const stop = useCallback(() => {
    if (!isSupported) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
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
      } = {},
    ) => {
      if (!isSupported || !text?.trim()) {
        onError?.();

        return false;
      }

      const synthesis = window.speechSynthesis;

      synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text.trim());

      utterance.lang = language;

      utterance.rate = Math.min(1.5, Math.max(0.6, rate));

      utterance.pitch = pitch;
      utterance.volume = volume;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);

        onEnd?.();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);

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

        speak(text, {
          ...options,

          onEnd: () => {
            resolve(true);
          },

          onError: () => {
            resolve(false);
          },
        });
      });
    },
    [isSupported, speak],
  );

  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    speak,
    speakAndWait,
    stop,
    isSpeaking,
    isSupported,
  };
}
