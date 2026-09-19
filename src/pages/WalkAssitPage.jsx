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

import { useLocation, useNavigate } from "react-router-dom";

import {
  getWalkingRoute,
  searchDestinations,
} from "../api/navigation/navigationApi.js";

import { useGeolocation } from "../hooks/location/useGeolocation.js";
import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";
import { useNetraStore } from "../store/useNetraStore.js";
import { useNetraVoice } from "../voice/useNetraVoice.js";
import { parseVoiceIntent } from "../voice/voiceIntents.js";
import {
  DesktopHeader,
  MobileBottomNav,
} from "../components/layout/NetraNavigation.jsx";

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
  const locationRoute = useLocation();

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
  const cachedLocationRef = useRef(null);

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
    voiceAssistantActive,
    voiceEnabled,
  } = useNetraVoice();

  const getRouteLocation = useCallback(async () => {
    const cached = [cachedLocationRef.current, walkInitialLocation].find(
      (position) =>
        position && Date.now() - Number(position.timestamp || 0) < 120000,
    );
    const position = cached || (await getCurrentPosition());
    cachedLocationRef.current = position;
    return position;
  }, [getCurrentPosition, walkInitialLocation]);

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

      abortListening();
      setIsStartingRoute(true);
      setErrorMessage("");
      setStatus("Getting your walking route...");

      try {
        const currentLocation = await getRouteLocation();

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
      abortListening,
      getRouteLocation,
      navigate,
      setWalkAssistActive,
      setWalkAssistPaused,
      setWalkDestination,
      setWalkLastCue,
      setWalkRoute,
      speak,
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

          const intent = parseVoiceIntent(answer, {
            expectsConfirmation: true,
          }).type;

          if (intent === "home" || intent === "back") {
            clearWalkAssist();
            navigate("/");
            return "cancelled";
          }

          if (intent === "help") {
            await speakAndWait(
              "Tell me a destination. I search nearby matches and ask you to confirm. Say Back or Home to return, Stop to interrupt speech, Continue to resume, or Guide for help.",
            );
            attempt -= 1;
            continue;
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
    if (!voiceAssistantActive || !voiceEnabled) {
      setVoiceFallback(true);
      setStatus("Voice assistant is not active. Type a destination below.");
      return;
    }

    const version = conversationVersionRef.current + 1;
    conversationVersionRef.current = version;

    setErrorMessage("");
    setVoiceFallback(false);
    setSuggestedIndex(-1);
    setResults([]);

    if (!autoSpeak || !recognitionSupported) {
      setVoiceFallback(true);
      const message =
        (!autoSpeak &&
          "Voice Guide is off in Settings. Type a destination below.") ||
        unsupportedReason ||
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
      currentLocation = await getRouteLocation();
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
        if (command.type === "home" || command.type === "back") {
          clearWalkAssist();
          navigate("/");
          return;
        }
        if (command.type === "help") {
          await speakAndWait(
            "Tell me a destination. I search nearby matches and ask you to confirm. Say Back or Home to return, Stop to interrupt speech, Continue to resume, or Guide for help.",
          );
          continue;
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
    getRouteLocation,
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
    voiceAssistantActive,
    voiceEnabled,
  ]);

  useEffect(() => {
    resetWalkRoute();

    if (!voiceAssistantActive || !voiceEnabled) {
      setVoiceFallback(true);
      setStatus("Voice assistant is not active. Type a destination below.");

      return () => {
        conversationVersionRef.current += 1;
        abortListening();
        stopSpeech();
      };
    }

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
  }, [
    abortListening,
    resetWalkRoute,
    runVoiceConversation,
    stopSpeech,
    voiceAssistantActive,
    voiceEnabled,
  ]);

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
      const currentLocation = await getRouteLocation();

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
    <main className="min-h-screen bg-[#030a12] pb-24 text-white md:pb-0">
      <DesktopHeader compact />
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10">
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
            ? "bg-blue-500/10 text-blue-300 ring-2 ring-blue-400/20"
            : "text-slate-300 hover:bg-white/5"
        }`}
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <section className="mt-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <Navigation size={28} />
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Walk Assist
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-slate-400">
          Netra asks where you want to go, listens automatically, suggests the
          closest matching destination, then starts walking guidance after you
          confirm.
        </p>
      </section>

      <section
        className="mt-8 rounded-3xl border border-white/10 bg-[#07111c] p-5 sm:p-6"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            {isListening ? <Mic size={21} /> : <Volume2 size={21} />}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-400">
              Voice conversation
            </p>

            <p className="mt-1 text-lg font-semibold leading-7 text-white">
              {status}
            </p>

            {isListening && (
              <p className="mt-2 text-sm font-medium text-blue-400">
                Microphone is listening now.
              </p>
            )}
          </div>
        </div>

        {recognitionError && !errorMessage && (
          <p className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">
            {recognitionError}
          </p>
        )}

        {errorMessage && (
          <p
            className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </section>

      {query && (
        <section className="mt-5 rounded-2xl border border-white/10 bg-[#07111c]/[0.025] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Destination heard
          </p>
          <p className="mt-1 font-semibold text-white">{query}</p>
        </section>
      )}

      {results.length > 0 && (
        <section className="mt-6" aria-label="Nearby destination matches">
          <h2 className="text-lg font-semibold text-white">Nearby matches</h2>

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
                      ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-400/20"
                      : "border-white/10 bg-[#07111c] hover:border-blue-400/30"
                  }`}
                >
                  <MapPin size={21} className="mt-0.5 shrink-0 text-blue-400" />

                  <span className="min-w-0">
                    <span className="block font-semibold text-white">
                      {destination.name || destination.label}
                    </span>

                    {destination.label &&
                      destination.label !== destination.name && (
                        <span className="mt-1 block text-sm leading-5 text-slate-400">
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
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#07111c] p-5 sm:p-6">
          <h2 className="font-semibold text-white">Type destination</h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use this if automatic voice input is unavailable, blocked, or not
            understood.
          </p>

          <label
            htmlFor="walk-destination-input"
            className="mt-5 block text-sm font-medium text-slate-200"
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
            className="mt-2 min-h-14 w-full rounded-2xl border border-white/15 bg-[#0b1724] px-4 text-base text-white placeholder:text-slate-600 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-400/20"
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
                ? "bg-blue-700 ring-4 ring-blue-400/20"
                : "bg-blue-600 hover:bg-blue-700"
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
          className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-blue-500/10 p-4 text-emerald-900"
          role="status"
        >
          <LoaderCircle size={20} className="animate-spin" />
          Creating your walking route...
        </div>
      )}
      </div>
      <MobileBottomNav pathname={locationRoute.pathname} />
    </main>
  );
}
