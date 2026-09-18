import { useCallback, useEffect, useRef, useState } from "react";

const getRecognitionErrorMessage = (errorCode) => {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied.";

    case "audio-capture":
      return "No microphone is available.";

    case "network":
      return "Voice recognition needs a network connection in this browser.";

    case "no-speech":
      return "I did not hear anything.";

    default:
      return "Voice input was not understood.";
  }
};

export function useSpeechRecognition({ language = "en-US" } = {}) {
  const recognitionRef = useRef(null);
  const pendingRef = useRef(null);
  const resultReceivedRef = useRef(false);

  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);

  const RecognitionConstructor =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = Boolean(RecognitionConstructor);

  const rejectPending = useCallback((message) => {
    if (!pendingRef.current) {
      return;
    }

    const { reject } = pendingRef.current;
    pendingRef.current = null;
    reject(new Error(message));
  }, []);

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
      resultReceivedRef.current = false;
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      const nextTranscript = event.results?.[0]?.[0]?.transcript?.trim() || "";

      resultReceivedRef.current = Boolean(nextTranscript);
      setTranscript(nextTranscript);

      if (pendingRef.current && nextTranscript) {
        const { resolve } = pendingRef.current;
        pendingRef.current = null;
        resolve(nextTranscript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        setIsListening(false);
        return;
      }

      const message = getRecognitionErrorMessage(event.error);

      setError(message);
      setIsListening(false);
      rejectPending(message);
    };

    recognition.onend = () => {
      setIsListening(false);

      if (pendingRef.current && !resultReceivedRef.current) {
        rejectPending("I did not hear anything.");
      }
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

      if (pendingRef.current) {
        const { reject } = pendingRef.current;
        pendingRef.current = null;
        reject(new Error("Voice listening stopped."));
      }

      recognitionRef.current = null;
    };
  }, [RecognitionConstructor, isSupported, language, rejectPending]);

  const listenOnce = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!isSupported || !recognitionRef.current) {
        reject(
          new Error("Voice recognition is not supported by this browser."),
        );
        return;
      }

      if (pendingRef.current) {
        reject(new Error("Voice recognition is already listening."));
        return;
      }

      setTranscript("");
      setError(null);
      resultReceivedRef.current = false;
      pendingRef.current = { resolve, reject };

      try {
        recognitionRef.current.start();
      } catch (startError) {
        pendingRef.current = null;
        const message = startError?.message || "Unable to start voice input.";
        setError(message);
        reject(new Error(message));
      }
    });
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current || isListening) {
      return false;
    }

    setTranscript("");
    setError(null);

    try {
      recognitionRef.current.start();
      return true;
    } catch {
      setError("Unable to start voice input.");
      return false;
    }
  }, [isListening, isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    try {
      recognitionRef.current.stop();
    } catch {}
  }, []);

  const abortListening = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    try {
      recognitionRef.current.abort();
    } catch {}

    if (pendingRef.current) {
      const { reject } = pendingRef.current;
      pendingRef.current = null;
      reject(new Error("Voice listening stopped."));
    }

    setIsListening(false);
  }, []);

  return {
    transcript,
    isListening,
    error,
    isSupported,
    listenOnce,
    startListening,
    stopListening,
    abortListening,
  };
}
