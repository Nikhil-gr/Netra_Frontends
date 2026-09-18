import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition({ language = "en-US" } = {}) {
  const recognitionRef = useRef(null);

  const [transcript, setTranscript] = useState("");

  const [isListening, setIsListening] = useState(false);

  const [error, setError] = useState(null);

  const RecognitionConstructor =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = Boolean(RecognitionConstructor);

  useEffect(() => {
    if (!isSupported) {
      return undefined;
    }

    const recognition = new RecognitionConstructor();

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      const nextTranscript = event.results?.[0]?.[0]?.transcript?.trim() || "";

      setTranscript(nextTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        return;
      }

      const message =
        event.error === "not-allowed"
          ? "Microphone permission was denied."
          : "Voice input was not understood. Please try again.";

      setError(message);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      try {
        recognition.abort();
      } catch {}

      recognitionRef.current = null;
    };
  }, [RecognitionConstructor, isSupported, language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) {
      return false;
    }

    setTranscript("");
    setError(null);

    try {
      recognitionRef.current.start();

      return true;
    } catch {
      setError("Unable to start voice input. Please try again.");

      return false;
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) {
      return;
    }

    try {
      recognitionRef.current.stop();
    } catch {}
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    transcript,
    isListening,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
