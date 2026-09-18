import { useEffect, useState } from "react";

import {
  ArrowLeft,
  LoaderCircle,
  MapPin,
  Mic,
  MicOff,
  Navigation,
  Search,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  getWalkingRoute,
  searchDestinations,
} from "../api/navigation/navigationApi.js";

import { useGeolocation } from "../hooks/location/useGeolocation.js";

import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";

import { useSpeechRecognition } from "../hooks/speech/useSpeechRecognition.js";

import { useSpeechSynthesis } from "../hooks/speech/useSpeechSynthesis.js";

import { useNetraStore } from "../store/useNetraStore.js";

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

const getDestinationId = (destination, index) =>
  destination?.id ||
  `${destination?.latitude}-${destination?.longitude}-${index}`;

export default function WalkAssistPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");

  const [results, setResults] = useState([]);

  const [selectedDestination, setSelectedDestination] = useState(null);

  const [searchError, setSearchError] = useState("");

  const [routeError, setRouteError] = useState("");

  const [isSearching, setIsSearching] = useState(false);

  const [isStarting, setIsStarting] = useState(false);

  const speechRate = useNetraStore((state) => state.speechRate);

  const setWalkDestination = useNetraStore((state) => state.setWalkDestination);

  const setWalkRoute = useNetraStore((state) => state.setWalkRoute);

  const setWalkAssistActive = useNetraStore(
    (state) => state.setWalkAssistActive,
  );

  const setWalkAssistPaused = useNetraStore(
    (state) => state.setWalkAssistPaused,
  );

  const setWalkLastCue = useNetraStore((state) => state.setWalkLastCue);

  const { speak } = useSpeechSynthesis();

  const { trigger, isArmed } = useSpokenAction();

  const { getCurrentPosition, isSupported: locationSupported } =
    useGeolocation();

  const {
    transcript,
    isListening,
    error: speechRecognitionError,
    isSupported: speechRecognitionSupported,
    startListening,
  } = useSpeechRecognition({
    language: "en-US",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      speak(
        "Walk Assist. Tell Netra where you want to go, or type a destination.",
        {
          language: "en-US",

          rate: speechRate,
        },
      );
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [speak, speechRate]);

  useEffect(() => {
    if (!transcript) {
      return;
    }

    setQuery(transcript);

    setSelectedDestination(null);

    setResults([]);

    setSearchError("");

    speak(`I heard ${transcript}. Search destination when ready.`, {
      language: "en-US",

      rate: speechRate,
    });
  }, [speak, speechRate, transcript]);

  const handleSearch = async () => {
    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      const message = "Enter or speak a destination first.";

      setSearchError(message);

      speak(message, {
        language: "en-US",

        rate: speechRate,
      });

      return;
    }

    setIsSearching(true);

    setSearchError("");

    setRouteError("");

    setSelectedDestination(null);

    try {
      const items = await searchDestinations(cleanedQuery);

      setResults(items);

      if (items.length === 0) {
        const message = `No destinations were found for ${cleanedQuery}.`;

        setSearchError(message);

        speak(message, {
          language: "en-US",

          rate: speechRate,
        });

        return;
      }

      speak(
        `${items.length} destination${items.length === 1 ? "" : "s"} found. Select the correct result.`,
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

      setSearchError(message);

      speak(message, {
        language: "en-US",

        rate: speechRate,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectDestination = (destination) => {
    setSelectedDestination(destination);

    setRouteError("");

    speak(`${destination.label || destination.name} selected.`, {
      language: "en-US",

      rate: speechRate,
    });
  };

  const handleStartWalkAssist = async () => {
    if (!selectedDestination) {
      const message = "Select a destination first.";

      setRouteError(message);

      speak(message, {
        language: "en-US",

        rate: speechRate,
      });

      return;
    }

    if (!locationSupported) {
      const message = "Location is not supported by this browser.";

      setRouteError(message);

      speak(message, {
        language: "en-US",

        rate: speechRate,
      });

      return;
    }

    const latitude = Number(selectedDestination.latitude);

    const longitude = Number(selectedDestination.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const message =
        "The selected destination does not have valid coordinates.";

      setRouteError(message);

      speak(message, {
        language: "en-US",

        rate: speechRate,
      });

      return;
    }

    setIsStarting(true);

    setRouteError("");

    try {
      const currentLocation = await getCurrentPosition();

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

      if (!Array.isArray(route?.steps) || route.steps.length === 0) {
        throw new Error("No walking route was returned for this destination.");
      }

      setWalkDestination({
        ...selectedDestination,

        latitude,

        longitude,
      });

      setWalkRoute(route);

      setWalkAssistActive(true);

      setWalkAssistPaused(false);

      setWalkLastCue("");

      navigate("/camera/assist");
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to start Walk Assist right now.",
      );

      setRouteError(message);

      speak(message, {
        language: "en-US",

        rate: speechRate,
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() =>
          trigger({
            id: "walk-back",

            announcement: "Back button clicked. Press again to return home.",

            action: () => navigate("/"),
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
          Choose where you want to go. Netra will combine walking directions
          with live camera awareness.
        </p>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">
          Where do you want to go?
        </h2>

        <button
          type="button"
          disabled={!speechRecognitionSupported || isListening}
          onClick={() =>
            trigger({
              id: "speak-destination",

              announcement:
                "Speak destination button clicked. Press again and say where you want to go.",

              action: startListening,
            })
          }
          className={`mt-5 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl px-5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isArmed("speak-destination")
              ? "bg-emerald-800 text-white ring-4 ring-emerald-100"
              : "bg-emerald-700 text-white hover:bg-emerald-800"
          }`}
        >
          {isListening ? <MicOff size={22} /> : <Mic size={22} />}

          {isListening ? "Listening..." : "Speak destination"}
        </button>

        {!speechRecognitionSupported && (
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Voice input is not supported by this browser. You can type the
            destination below.
          </p>
        )}

        {speechRecognitionError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {speechRecognitionError}
          </p>
        )}

        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            or type
          </span>

          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <label
          htmlFor="destination-query"
          className="font-medium text-slate-900"
        >
          Destination
        </label>

        <input
          id="destination-query"
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);

            setSelectedDestination(null);

            setResults([]);

            setSearchError("");

            setRouteError("");
          }}
          placeholder="For example: Civil Mall"
          autoComplete="off"
          className="mt-2 min-h-14 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />

        <button
          type="button"
          disabled={!query.trim() || isSearching}
          onClick={() =>
            trigger({
              id: "search-destination",

              announcement:
                "Search destination button clicked. Press again to search.",

              action: handleSearch,
            })
          }
          className={`mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border px-5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isArmed("search-destination")
              ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-100"
              : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
          }`}
        >
          {isSearching ? (
            <LoaderCircle size={20} className="animate-spin" />
          ) : (
            <Search size={20} />
          )}

          {isSearching ? "Searching..." : "Search destination"}
        </button>

        {searchError && (
          <p
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
            role="alert"
          >
            {searchError}
          </p>
        )}
      </section>

      {results.length > 0 && (
        <section className="mt-6" aria-label="Destination results">
          <h2 className="text-lg font-semibold text-slate-950">
            Destination results
          </h2>

          <div className="mt-3 space-y-3">
            {results.map((destination, index) => {
              const resultId = getDestinationId(destination, index);

              const actionId = `destination-${resultId}`;

              const isSelected =
                selectedDestination &&
                Number(selectedDestination.latitude) ===
                  Number(destination.latitude) &&
                Number(selectedDestination.longitude) ===
                  Number(destination.longitude);

              return (
                <button
                  type="button"
                  key={resultId}
                  onClick={() =>
                    trigger({
                      id: actionId,

                      announcement: `${destination.label || destination.name}. Press again to select this destination.`,

                      action: () => handleSelectDestination(destination),
                    })
                  }
                  className={`flex min-h-16 w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                    isSelected || isArmed(actionId)
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
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {selectedDestination && (
        <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <MapPin size={22} className="mt-0.5 shrink-0 text-emerald-700" />

            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-700">
                Selected destination
              </p>

              <p className="mt-1 font-semibold text-slate-950">
                {selectedDestination.label || selectedDestination.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isStarting}
            onClick={() =>
              trigger({
                id: "start-walk-assist",

                announcement:
                  "Start Walk Assist button clicked. Press again to get your walking route and begin.",

                action: handleStartWalkAssist,
              })
            }
            className={`mt-5 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl px-5 text-lg font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isArmed("start-walk-assist")
                ? "bg-emerald-800 ring-4 ring-emerald-100"
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            {isStarting ? (
              <LoaderCircle size={22} className="animate-spin" />
            ) : (
              <Navigation size={22} />
            )}

            {isStarting ? "Creating walking route..." : "Start Walk Assist"}
          </button>
        </section>
      )}

      {routeError && (
        <p
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
          role="alert"
        >
          {routeError}
        </p>
      )}
    </main>
  );
}
