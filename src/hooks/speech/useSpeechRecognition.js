import { useCallback, useEffect, useRef, useState } from "react";

const getRecognitionErrorMessage = (errorCode) => {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied. Allow microphone access and try Walk Assist again.";

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

  const isSecure =
    typeof window !== "undefined" &&
    (window.isSecureContext || window.location.hostname === "localhost");

  const RecognitionConstructor =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const browserSupportsRecognition = Boolean(RecognitionConstructor);
  const isSupported = browserSupportsRecognition && isSecure;

  const unsupportedReason = !isSecure
    ? "Automatic voice input requires HTTPS on mobile. Open Netra using your HTTPS ngrok link."
    : !browserSupportsRecognition
      ? "Automatic voice recognition is not available in this browser. Use Chrome or Edge for voice input, or type the destination below."
      : "";

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
          new Error(
            unsupportedReason ||
              "Voice recognition is not supported by this browser.",
          ),
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
  }, [isSupported, unsupportedReason]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current || isListening) {
      if (!isSupported && unsupportedReason) {
        setError(unsupportedReason);
      }

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
  }, [isListening, isSupported, unsupportedReason]);

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

  const listenWithTimeout = useCallback(
    (timeoutMs = 9000) =>
      new Promise((resolve, reject) => {
        let settled = false;
        const settle = (callback, value) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          callback(value);
        };
        const timer = window.setTimeout(() => {
          abortListening();
          settle(reject, new Error("I did not hear anything."));
        }, timeoutMs);

        listenOnce().then(
          (value) => settle(resolve, value),
          (listenError) => settle(reject, listenError),
        );
      }),
    [abortListening, listenOnce],
  );

  return {
    transcript,
    isListening,
    error,
    isSupported,
    unsupportedReason,
    listenOnce,
    listenWithTimeout,
    startListening,
    stopListening,
    abortListening,
  };
}
