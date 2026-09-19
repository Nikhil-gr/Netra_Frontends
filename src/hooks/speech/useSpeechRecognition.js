import { useCallback, useEffect, useRef, useState } from "react";

const getRecognitionErrorMessage = (errorCode) => {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied. Allow microphone access and try again.";

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

const EMPTY_RESULT = {
  transcript: "",
  alternatives: [],
};

export function useSpeechRecognition({ language = "en-US" } = {}) {
  const recognitionRef = useRef(null);
  const pendingRef = useRef(null);
  const resultReceivedRef = useRef(false);
  const activeRef = useRef(false);
  const resultRef = useRef(EMPTY_RESULT);

  const [transcript, setTranscript] = useState("");
  const [alternatives, setAlternatives] = useState([]);
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
    ? "Automatic voice input requires HTTPS on mobile. Open Netra using your HTTPS link."
    : !browserSupportsRecognition
      ? "Automatic voice recognition is not available in this browser. Use Chrome or Edge for voice input."
      : "";

  const rejectPending = useCallback((message) => {
    if (!pendingRef.current) return;

    const { reject } = pendingRef.current;
    pendingRef.current = null;
    reject(new Error(message));
  }, []);

  useEffect(() => {
    if (!isSupported) return undefined;

    const recognition = new RecognitionConstructor();

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    // Let the browser give us several likely interpretations instead of only one.
    // This is especially useful for commands such as "Walk Assist" where Chrome may
    // return "walk assistant" as its first choice and "walk assist" as another.
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      activeRef.current = true;
      resultReceivedRef.current = false;
      resultRef.current = EMPTY_RESULT;
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      const firstResult = event.results?.[0];

      const nextAlternatives = firstResult
        ? Array.from(firstResult)
            .map((item) => ({
              transcript: item?.transcript?.trim() || "",
              confidence: Number.isFinite(item?.confidence)
                ? item.confidence
                : null,
            }))
            .filter((item) => item.transcript)
        : [];

      const nextTranscript = nextAlternatives[0]?.transcript || "";

      resultReceivedRef.current = Boolean(nextTranscript);
      resultRef.current = {
        transcript: nextTranscript,
        alternatives: nextAlternatives,
      };

      setTranscript(nextTranscript);
      setAlternatives(nextAlternatives);
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
      activeRef.current = false;
      setIsListening(false);

      if (!pendingRef.current) return;

      const pending = pendingRef.current;
      pendingRef.current = null;

      if (!resultReceivedRef.current) {
        pending.reject(new Error("I did not hear anything."));
        return;
      }

      if (pending.mode === "detailed") {
        pending.resolve(resultRef.current);
      } else {
        pending.resolve(resultRef.current.transcript);
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
      activeRef.current = false;
    };
  }, [RecognitionConstructor, isSupported, language, rejectPending]);

  const beginListening = useCallback(
    (mode = "text") =>
      new Promise((resolve, reject) => {
        if (!isSupported || !recognitionRef.current) {
          reject(
            new Error(
              unsupportedReason ||
                "Voice recognition is not supported by this browser.",
            ),
          );
          return;
        }

        if (pendingRef.current || activeRef.current) {
          reject(new Error("Voice recognition is already listening."));
          return;
        }

        setTranscript("");
        setAlternatives([]);
        setError(null);
        resultReceivedRef.current = false;
        resultRef.current = EMPTY_RESULT;
        pendingRef.current = { resolve, reject, mode };

        try {
          activeRef.current = true;
          recognitionRef.current.start();
        } catch (startError) {
          activeRef.current = false;
          pendingRef.current = null;
          const message = startError?.message || "Unable to start voice input.";
          setError(message);
          reject(new Error(message));
        }
      }),
    [isSupported, unsupportedReason],
  );

  const listenOnce = useCallback(
    () => beginListening("text"),
    [beginListening],
  );

  const listenOnceDetailed = useCallback(
    () => beginListening("detailed"),
    [beginListening],
  );

  const startListening = useCallback(() => {
    if (
      !isSupported ||
      !recognitionRef.current ||
      isListening ||
      activeRef.current
    ) {
      if (!isSupported && unsupportedReason) setError(unsupportedReason);
      return false;
    }

    setTranscript("");
    setAlternatives([]);
    setError(null);
    resultReceivedRef.current = false;
    resultRef.current = EMPTY_RESULT;

    try {
      activeRef.current = true;
      recognitionRef.current.start();
      return true;
    } catch {
      activeRef.current = false;
      setError("Unable to start voice input.");
      return false;
    }
  }, [isListening, isSupported, unsupportedReason]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch {}
  }, []);

  const abortListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.abort();
    } catch {}

    if (pendingRef.current) {
      const { reject } = pendingRef.current;
      pendingRef.current = null;
      reject(new Error("Voice listening stopped."));
    }

    // Keep the session locked until the browser delivers onend.
    setIsListening(false);
  }, []);

  const withTimeout = useCallback(
    (listenFn, timeoutMs = 9000) =>
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

        listenFn().then(
          (value) => settle(resolve, value),
          (listenError) => settle(reject, listenError),
        );
      }),
    [abortListening],
  );

  const listenWithTimeout = useCallback(
    (timeoutMs = 9000) => withTimeout(listenOnce, timeoutMs),
    [listenOnce, withTimeout],
  );

  const listenDetailedWithTimeout = useCallback(
    (timeoutMs = 9000) => withTimeout(listenOnceDetailed, timeoutMs),
    [listenOnceDetailed, withTimeout],
  );

  return {
    transcript,
    alternatives,
    isListening,
    error,
    isSupported,
    unsupportedReason,
    listenOnce,
    listenOnceDetailed,
    listenWithTimeout,
    listenDetailedWithTimeout,
    startListening,
    stopListening,
    abortListening,
  };
}
