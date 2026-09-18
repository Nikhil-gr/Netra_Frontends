import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  LoaderCircle,
  MapPin,
  Mic,
  Navigation,
  Search,
  Volume2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  getWalkingRoute,
  searchDestinations,
} from "../api/navigation/navigationApi.js";

import { useGeolocation } from "../hooks/location/useGeolocation.js";
import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";
import { useNetraStore } from "../store/useNetraStore.js";
import { useNetraVoice } from "../voice/useNetraVoice.js";
import { parseVoiceIntent } from "../voice/voiceIntents.js";

import { sortDestinationsByDistance } from "../utils/navigation/distance.js";

const getApiErrorMessage = (error, fallback) => {
  const backendError = error?.response?.data?.error;

  if (backendError?.message) {
    return backendError.message;
  }

  if (error?.response?.status === 429) {
    return "Navigation is temporarily busy. Please wait and try again.";
  }

  return error?.message || fallback;
};

const getDestinationName = (destination) =>
  destination?.label || destination?.name || "this destination";

const getDestinationKey = (destination, index) =>
  destination?.id ||
  `${destination?.latitude}-${destination?.longitude}-${index}`;

export default function WalkAssistPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggestedIndex, setSuggestedIndex] = useState(-1);
  const [status, setStatus] = useState("Preparing Walk Assist...");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isStartingRoute, setIsStartingRoute] = useState(false);
  const [voiceFallback, setVoiceFallback] = useState(false);

  const conversationVersionRef = useRef(0);
  const autoStartTimerRef = useRef(null);

  const speechRate = useNetraStore((state) => state.speechRate);
  const autoSpeak = useNetraStore((state) => state.autoSpeak);
  const walkInitialLocation = useNetraStore(
    (state) => state.walkInitialLocation,
  );
  const setWalkDestination = useNetraStore((state) => state.setWalkDestination);
  const setWalkRoute = useNetraStore((state) => state.setWalkRoute);
  const setWalkAssistActive = useNetraStore(
    (state) => state.setWalkAssistActive,
  );
  const setWalkAssistPaused = useNetraStore(
    (state) => state.setWalkAssistPaused,
  );
  const setWalkLastCue = useNetraStore((state) => state.setWalkLastCue);
  const resetWalkRoute = useNetraStore((state) => state.resetWalkRoute);
  const clearWalkAssist = useNetraStore((state) => state.clearWalkAssist);

  const { trigger, isArmed } = useSpokenAction();

  const {
    getCurrentPosition,
    isSupported: locationSupported,
    isSecure: locationSecure,
  } = useGeolocation();

  const {
    speak,
    speakAndWait,
    stopSpeech,
    ask: askVoice,
    isListening,
    error: recognitionError,
    isSupported: recognitionSupported,
    unsupportedReason,
    abortListening,
  } = useNetraVoice();

  const cancelConversation = useCallback(() => {
    conversationVersionRef.current += 1;
    abortListening();
    stopSpeech();
  }, [abortListening, stopSpeech]);

  const saveAndStartRoute = useCallback(
    async (destination, version) => {
      if (!destination) {
        return;
      }

      setIsStartingRoute(true);
      setErrorMessage("");
      setStatus("Getting your walking route...");

      try {
        const currentLocation = await getCurrentPosition();

        if (conversationVersionRef.current !== version) {
          return;
        }

        const latitude = Number(destination.latitude);
        const longitude = Number(destination.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error(
            "The selected destination does not have valid coordinates.",
          );
        }

        const route = await getWalkingRoute({
          start: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          destination: {
            latitude,
            longitude,
          },
        });

        if (conversationVersionRef.current !== version) {
          return;
        }

        if (!Array.isArray(route?.steps) || route.steps.length === 0) {
          throw new Error(
            "No walking route was returned for this destination.",
          );
        }

        const normalizedDestination = {
          ...destination,
          latitude,
          longitude,
        };

        setWalkDestination(normalizedDestination);
        setWalkRoute(route);
        setWalkAssistActive(true);
        setWalkAssistPaused(false);
        setWalkLastCue("");

        setStatus("Route ready.");

        await speakAndWait(
          `Starting Walk Assist to ${getDestinationName(
            normalizedDestination,
          )}.`,
          {
            language: "en-US",
            rate: speechRate,
          },
        );

        if (conversationVersionRef.current !== version) {
          return;
        }

        navigate("/camera/assist");
      } catch (error) {
        if (conversationVersionRef.current !== version) {
          return;
        }

        const message = getApiErrorMessage(
          error,
          "Unable to start Walk Assist right now.",
        );

        setErrorMessage(message);
        setStatus("Unable to start the route.");
        setVoiceFallback(true);

        speak(message, {
          language: "en-US",
          rate: speechRate,
        });
      } finally {
        if (conversationVersionRef.current === version) {
          setIsStartingRoute(false);
        }
      }
    },
    [
      getCurrentPosition,
      navigate,
      setWalkAssistActive,
      setWalkAssistPaused,
      setWalkDestination,
      setWalkLastCue,
      setWalkRoute,
      speak,
      speakAndWait,
      speechRate,
    ],
  );

  const askForConfirmation = useCallback(
    async (destination, index, version) => {
      setSuggestedIndex(index);
      setStatus(`Suggested: ${getDestinationName(destination)}`);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        setStatus("Listening for yes or no...");

        try {
          const answer = await askVoice(
            attempt === 0
              ? `The closest result by location I found is ${getDestinationName(destination)}. Is that where you want to go?`
              : "Please say yes or no.",
          );

          if (!answer) return "cancelled";

          if (conversationVersionRef.current !== version) {
            return "cancelled";
          }

          const intent = parseVoiceIntent(answer, { expectsConfirmation: true }).type;

          if (intent === "home") {
            clearWalkAssist();
            navigate("/");
            return "cancelled";
          }

          if (intent === "yes" || intent === "no") {
            return intent;
          }

        } catch {
          if (attempt === 0) {
            await speakAndWait("I did not catch that. Please say yes or no.", {
              language: "en-US",
              rate: speechRate,
            });
          }
        }
      }

      return "unknown";
    },
    [askVoice, clearWalkAssist, navigate, speakAndWait, speechRate],
  );

  const runVoiceConversation = useCallback(async () => {
    const version = conversationVersionRef.current + 1;
    conversationVersionRef.current = version;

    setErrorMessage("");
    setVoiceFallback(false);
    setSuggestedIndex(-1);
    setResults([]);

    if (!autoSpeak || !recognitionSupported) {
      setVoiceFallback(true);
      const message =
        (!autoSpeak && "Voice Guide is off in Settings. Type a destination below.") || unsupportedReason ||
        "Automatic voice input is unavailable. Type a destination below.";

      setStatus(message);

      speak(`Where would you like to go? ${message}`, {
        language: "en-US",
        rate: speechRate,
      });

      return;
    }

    if (!locationSecure) {
      const message =
        "Walk Assist location requires HTTPS on mobile. Open Netra using your HTTPS ngrok link.";
      setErrorMessage(message);
      setStatus(message);
      setVoiceFallback(true);
      speak(message, {
        language: "en-US",
        rate: speechRate,
      });
      return;
    }

    if (!locationSupported) {
      const message = "Location is not supported by this browser.";
      setErrorMessage(message);
      setStatus(message);
      setVoiceFallback(true);
      speak(message, {
        language: "en-US",
        rate: speechRate,
      });
      return;
    }

    let currentLocation;

    try {
      setStatus("Getting your location...");
      const hasFreshInitialLocation =
        walkInitialLocation &&
        Date.now() - Number(walkInitialLocation.timestamp || 0) < 120000;

      currentLocation = hasFreshInitialLocation
        ? walkInitialLocation
        : await getCurrentPosition();
    } catch (error) {
      if (conversationVersionRef.current !== version) {
        return;
      }

      const message = error?.message || "Unable to get your current location.";
      setErrorMessage(message);
      setStatus(message);
      setVoiceFallback(true);
      speak(message, {
        language: "en-US",
        rate: speechRate,
      });
      return;
    }

    if (conversationVersionRef.current !== version) {
      return;
    }

    let noSpeechCount = 0;

    while (conversationVersionRef.current === version) {
      setStatus("Listening for your destination...");

      let spokenDestination = "";

      try {
        const answer = await askVoice("Where would you like to go?");
        if (!answer) return;
        const command = parseVoiceIntent(answer);
        if (command.type === "home") {
          clearWalkAssist();
          navigate("/");
          return;
        }
        spokenDestination = answer.trim();
        noSpeechCount = 0;
      } catch (error) {
        noSpeechCount += 1;

        if (conversationVersionRef.current !== version) {
          return;
        }

        if (noSpeechCount >= 3) {
          setVoiceFallback(true);
          setErrorMessage(
            "Voice input could not hear a destination. Type it below instead.",
          );
          setStatus("Type a destination below.");
          return;
        }

        await speakAndWait("I did not catch that. I will listen again.", {
          language: "en-US",
          rate: speechRate,
        });

        continue;
      }

      if (!spokenDestination) {
        continue;
      }

      setQuery(spokenDestination);
      setStatus(`Searching for ${spokenDestination}...`);
      setIsSearching(true);

      let destinations;

      try {
        const items = await searchDestinations(spokenDestination);
        destinations = sortDestinationsByDistance(items, currentLocation);
      } catch (error) {
        setIsSearching(false);

        if (conversationVersionRef.current !== version) {
          return;
        }

        const message = getApiErrorMessage(
          error,
          "Unable to search destinations right now.",
        );

        setErrorMessage(message);
        setVoiceFallback(true);
        setStatus(message);

        await speakAndWait(message, {
          language: "en-US",
          rate: speechRate,
        });

        return;
      }

      setIsSearching(false);

      if (conversationVersionRef.current !== version) {
        return;
      }

      setResults(destinations);

      if (destinations.length === 0) {
        await speakAndWait(
          `I could not find ${spokenDestination}. Please say another destination.`,
          {
            language: "en-US",
            rate: speechRate,
          },
        );

        continue;
      }

      let confirmed = false;
      const maxSuggestions = destinations.length;

      for (let index = 0; index < maxSuggestions; index += 1) {
        if (conversationVersionRef.current !== version) {
          return;
        }

        const destination = destinations[index];
        const intent = await askForConfirmation(destination, index, version);

        if (intent === "cancelled") {
          return;
        }

        if (intent === "yes") {
          confirmed = true;
          await saveAndStartRoute(destination, version);
          return;
        }

        if (intent === "unknown") {
          setVoiceFallback(true);
          setErrorMessage(
            "I could not understand the confirmation. Select a destination below or type another one.",
          );
          setStatus("Choose a destination below.");
          return;
        }

        if (index < maxSuggestions - 1) {
          await speakAndWait("Okay. I will suggest the next closest result.", {
            language: "en-US",
            rate: speechRate,
          });
        }
      }

      if (!confirmed) {
        await speakAndWait(
          "I have no more nearby results from that search. Tell me another destination.",
          {
            language: "en-US",
            rate: speechRate,
          },
        );

        setSuggestedIndex(-1);
        setResults([]);
      }
    }
  }, [
    askForConfirmation,
    askVoice,
    autoSpeak,
    clearWalkAssist,
    getCurrentPosition,
    locationSecure,
    locationSupported,
    navigate,
    recognitionSupported,
    saveAndStartRoute,
    unsupportedReason,
    walkInitialLocation,
    speak,
    speakAndWait,
    speechRate,
  ]);

  useEffect(() => {
    resetWalkRoute();

    autoStartTimerRef.current = window.setTimeout(() => {
      runVoiceConversation();
    }, 450);

    return () => {
      if (autoStartTimerRef.current) {
        window.clearTimeout(autoStartTimerRef.current);
      }

      conversationVersionRef.current += 1;
      abortListening();
      stopSpeech();
    };
  }, [abortListening, resetWalkRoute, runVoiceConversation, stopSpeech]);

  const handleTypedSearch = async () => {
    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      const message = "Enter a destination first.";
      setErrorMessage(message);
      speak(message, {
        language: "en-US",
        rate: speechRate,
      });
      return;
    }

    cancelConversation();

    const version = conversationVersionRef.current;

    setIsSearching(true);
    setErrorMessage("");
    setSuggestedIndex(-1);
    setStatus(`Searching for ${cleanedQuery}...`);

    try {
      const hasFreshInitialLocation =
        walkInitialLocation &&
        Date.now() - Number(walkInitialLocation.timestamp || 0) < 120000;

      const currentLocation = hasFreshInitialLocation
        ? walkInitialLocation
        : await getCurrentPosition();

      const items = await searchDestinations(cleanedQuery);
      const sorted = sortDestinationsByDistance(items, currentLocation);

      if (conversationVersionRef.current !== version) {
        return;
      }

      setResults(sorted);

      if (sorted.length === 0) {
        const message = `No destinations were found for ${cleanedQuery}.`;
        setErrorMessage(message);
        setStatus(message);
        speak(message, {
          language: "en-US",
          rate: speechRate,
        });
        return;
      }

      setStatus("Closest results are shown below.");
      speak(
        `I found ${sorted.length} result${
          sorted.length === 1 ? "" : "s"
        }. The closest result by location is ${getDestinationName(sorted[0])}.`,
        {
          language: "en-US",
          rate: speechRate,
        },
      );
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to search destinations right now.",
      );
      setErrorMessage(message);
      setStatus(message);
      speak(message, {
        language: "en-US",
        rate: speechRate,
      });
    } finally {
      setIsSearching(false);
      setVoiceFallback(true);
    }
  };

  const handleManualDestination = async (destination) => {
    cancelConversation();
    const version = conversationVersionRef.current;
    await saveAndStartRoute(destination, version);
  };

  const handleBack = () => {
    cancelConversation();
    clearWalkAssist();
    navigate("/");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() =>
          trigger({
            id: "walk-back",
            announcement: "Back button clicked. Press again to return home.",
            action: handleBack,
          })
        }
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
          isArmed("walk-back")
            ? "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <section className="mt-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Navigation size={28} />
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Walk Assist
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Netra asks where you want to go, listens automatically, suggests the
          closest matching destination, then starts walking guidance after you
          confirm.
        </p>
      </section>

      <section
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            {isListening ? <Mic size={21} /> : <Volume2 size={21} />}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">
              Voice conversation
            </p>

            <p className="mt-1 text-lg font-semibold leading-7 text-slate-950">
              {status}
            </p>

            {isListening && (
              <p className="mt-2 text-sm font-medium text-emerald-700">
                Microphone is listening now.
              </p>
            )}
          </div>
        </div>

        {recognitionError && !errorMessage && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            {recognitionError}
          </p>
        )}

        {errorMessage && (
          <p
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </section>

      {query && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Destination heard
          </p>
          <p className="mt-1 font-semibold text-slate-950">{query}</p>
        </section>
      )}

      {results.length > 0 && (
        <section className="mt-6" aria-label="Nearby destination matches">
          <h2 className="text-lg font-semibold text-slate-950">
            Nearby matches
          </h2>

          <div className="mt-3 space-y-3">
            {results.slice(0, 5).map((destination, index) => {
              const id = getDestinationKey(destination, index);
              const actionId = `walk-destination-${id}`;
              const isSuggested = suggestedIndex === index;

              return (
                <button
                  type="button"
                  key={id}
                  disabled={isStartingRoute}
                  onClick={() =>
                    trigger({
                      id: actionId,
                      announcement: `${getDestinationName(
                        destination,
                      )}. Press again to start Walk Assist to this destination.`,
                      action: () => handleManualDestination(destination),
                    })
                  }
                  className={`flex min-h-16 w-full items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSuggested || isArmed(actionId)
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                      : "border-slate-200 bg-white hover:border-emerald-200"
                  }`}
                >
                  <MapPin
                    size={21}
                    className="mt-0.5 shrink-0 text-emerald-700"
                  />

                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-950">
                      {destination.name || destination.label}
                    </span>

                    {destination.label &&
                      destination.label !== destination.name && (
                        <span className="mt-1 block text-sm leading-5 text-slate-600">
                          {destination.label}
                        </span>
                      )}

                    {Number.isFinite(destination.distanceFromUserMeters) && (
                      <span className="mt-1 block text-xs text-slate-500">
                        Approx. {Math.round(destination.distanceFromUserMeters)}{" "}
                        m away by location
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {(voiceFallback || !recognitionSupported) && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-slate-950">Type destination</h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use this if automatic voice input is unavailable, blocked, or not
            understood.
          </p>

          <label
            htmlFor="walk-destination-input"
            className="mt-5 block text-sm font-medium text-slate-900"
          >
            Destination
          </label>

          <input
            id="walk-destination-input"
            type="text"
            value={query}
            onChange={(event) => {
              cancelConversation();
              setQuery(event.target.value);
              setResults([]);
              setSuggestedIndex(-1);
              setErrorMessage("");
              setVoiceFallback(true);
            }}
            placeholder="For example: Himalayan Java"
            autoComplete="off"
            className="mt-2 min-h-14 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />

          <button
            type="button"
            disabled={!query.trim() || isSearching || isStartingRoute}
            onClick={() =>
              trigger({
                id: "typed-destination-search",
                announcement:
                  "Search destination button clicked. Press again to search nearby matches.",
                action: handleTypedSearch,
              })
            }
            className={`mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isArmed("typed-destination-search")
                ? "bg-emerald-800 ring-4 ring-emerald-100"
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            {isSearching ? (
              <LoaderCircle size={20} className="animate-spin" />
            ) : (
              <Search size={20} />
            )}

            {isSearching ? "Searching..." : "Search destination"}
          </button>
        </section>
      )}

      {isStartingRoute && (
        <div
          className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
          role="status"
        >
          <LoaderCircle size={20} className="animate-spin" />
          Creating your walking route...
        </div>
      )}
    </main>
  );
}
