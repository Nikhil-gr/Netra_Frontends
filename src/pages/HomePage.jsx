import { Eye, FileText, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";
import { useNetraStore } from "../store/useNetraStore.js";
import { useNetraVoice } from "../voice/useNetraVoice.js";

const ASSET_ROOT = "/netra_assets";

const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
};

const normalizePosition = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  heading: Number.isFinite(position.coords.heading)
    ? position.coords.heading
    : null,
  speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
  timestamp: position.timestamp,
});

export default function HomePage() {
  const navigate = useNavigate();

  const { trigger, isArmed } = useSpokenAction();

  const {
    registerActions,
    voiceAssistantActive,
    voiceEnabled,
    isActivatingVoice,
    activateVoiceAssistant,
  } = useNetraVoice();

  const setWalkInitialLocation = useNetraStore(
    (state) => state.setWalkInitialLocation,
  );

  const lastTapRef = useRef(0);
  const activationLockRef = useRef(false);

  const requestMicrophonePermission = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return Promise.resolve(null);
    }

    return navigator.mediaDevices
      .getUserMedia({
        audio: true,
      })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());

        return true;
      })
      .catch(() => null);
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      return Promise.resolve(null);
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = normalizePosition(position);

          setWalkInitialLocation(location);

          resolve(location);
        },

        () => resolve(null),

        LOCATION_OPTIONS,
      );
    });
  };

  const openWalkAssist = useCallback(async () => {
    setWalkInitialLocation(null);

    await Promise.allSettled([
      requestMicrophonePermission(),
      requestLocationPermission(),
    ]);

    navigate("/walk-assist");
  }, [navigate, setWalkInitialLocation]);

  const openDescribe = useCallback(() => {
    navigate("/camera/describe");
  }, [navigate]);

  const openRead = useCallback(() => {
    navigate("/camera/read");
  }, [navigate]);

  useEffect(
    () =>
      registerActions({
        describe: openDescribe,

        read: openRead,

        walk: openWalkAssist,
      }),

    [openDescribe, openRead, openWalkAssist, registerActions],
  );

  const activateFromGesture = useCallback(async () => {
    if (
      voiceAssistantActive ||
      isActivatingVoice ||
      activationLockRef.current
    ) {
      return;
    }

    activationLockRef.current = true;

    try {
      await activateVoiceAssistant();
    } finally {
      activationLockRef.current = false;
    }
  }, [activateVoiceAssistant, isActivatingVoice, voiceAssistantActive]);

  const handlePointerUp = useCallback(
    (event) => {
      if (voiceAssistantActive || event.pointerType === "mouse") {
        return;
      }

      const now = Date.now();

      const elapsed = now - lastTapRef.current;

      if (elapsed > 0 && elapsed <= 420) {
        lastTapRef.current = 0;

        activateFromGesture();

        return;
      }

      lastTapRef.current = now;
    },

    [activateFromGesture, voiceAssistantActive],
  );

  const handleDoubleClick = useCallback(() => {
    if (!voiceAssistantActive) {
      activateFromGesture();
    }
  }, [activateFromGesture, voiceAssistantActive]);

  const modes = [
    {
      id: "describe",

      title: "Describe",

      description: "Describes your surroundings",

      icon: Eye,

      announcement: "Describe clicked. Press again to open.",

      action: openDescribe,
    },

    {
      id: "read",

      title: "Read Text",

      description: "Reads visible text instantly",

      icon: FileText,

      announcement: "Read text clicked. Press again to open.",

      action: openRead,
    },

    {
      id: "assist",

      title: "Walk Assist",

      description: "Assists you while walking",

      icon: ShieldAlert,

      announcement:
        "Walk assist clicked. Press again to allow microphone and location access and open Walk Assist.",

      action: openWalkAssist,
    },
  ];

  const triggerMode = (mode) => {
    trigger({
      id: mode.id,

      announcement: mode.announcement,

      action: mode.action,
    });
  };

  return (
    <main
      className={`netra-home ${
        voiceAssistantActive ? "is-activated" : "is-landing"
      }`}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <picture className="netra-home__picture" aria-hidden="true">
        <source
          media="(max-width: 700px)"
          srcSet={`${ASSET_ROOT}/hero/hero-bg-mobile.webp`}
        />

        <img src={`${ASSET_ROOT}/hero/hero-bg-desktop.webp`} alt="" />
      </picture>

      <div className="netra-home__shade" aria-hidden="true" />

      <div
        className="netra-home__ambient netra-home__ambient--one"
        aria-hidden="true"
      />

      <div
        className="netra-home__ambient netra-home__ambient--two"
        aria-hidden="true"
      />

      <div className="netra-home__logo" aria-label="Netra, a clearer tomorrow">
        <img
          src={`${ASSET_ROOT}/logo/netra-logo-full.webp`}
          alt="Netra — A clearer tomorrow"
        />
      </div>

      <section className="netra-hero" aria-labelledby="netra-title">
        <div className="netra-hero__copy">
          <p className="netra-kicker">Hello, welcome to</p>

          <h1 id="netra-title">Netra</h1>

          <p className="netra-subtitle">
            Your AI companion for a more independent life.
          </p>
        </div>

        <div
          className={`netra-voice-stage ${
            voiceAssistantActive && voiceEnabled ? "is-live" : ""
          } ${isActivatingVoice ? "is-activating" : ""}`}
          aria-hidden="true"
        >
          <div className="netra-wave netra-wave--left">
            {Array.from(
              {
                length: 18,
              },

              (_, index) => (
                <i key={index} />
              ),
            )}
          </div>

          <div className="netra-orb" role="presentation">
            <span className="netra-orb__core">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>

          <div className="netra-wave netra-wave--right">
            {Array.from(
              {
                length: 18,
              },

              (_, index) => (
                <i key={index} />
              ),
            )}
          </div>
        </div>

        {!voiceAssistantActive ? (
          <div className="netra-activation-copy" aria-live="polite">
            <span className="netra-activation-copy__eyebrow">
              Voice assistant off
            </span>

            <p>
              {isActivatingVoice
                ? "Activating Netra voice assistant..."
                : "Double tap anywhere to activate voice assistant"}
            </p>

            <span className="netra-activation-copy__note">
              No microphone is listening until you activate it.
            </span>
          </div>
        ) : (
          <div className="netra-activated-copy" aria-live="polite">
            <span className="netra-activation-dot" aria-hidden="true" />

            <span>
              {voiceEnabled
                ? "Voice assistant active — say Describe, Read Text, or Walk Assist"
                : "Voice assistant activated — use the controls below"}
            </span>
          </div>
        )}

        {voiceAssistantActive && (
          <div
            className="netra-features netra-features--revealed"
            aria-label="Netra modes"
          >
            {modes.map((mode) => {
              const Icon = mode.icon;

              return (
                <button
                  type="button"
                  key={mode.id}
                  onClick={(event) => {
                    event.stopPropagation();

                    triggerMode(mode);
                  }}
                  className={isArmed(mode.id) ? "is-armed" : ""}
                  aria-label={`${mode.title}. ${mode.description}. ${
                    isArmed(mode.id)
                      ? "Press again to open."
                      : "Press once for confirmation."
                  }`}
                >
                  <span className="netra-feature__icon">
                    <Icon size={25} />
                  </span>

                  <span className="netra-feature__title">{mode.title}</span>

                  <span className="netra-feature__description">
                    {mode.description}
                  </span>

                  {isArmed(mode.id) && (
                    <span className="netra-feature__armed">Press again</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <p className="netra-signoff">A more independent tomorrow starts here</p>
      </section>

      {!voiceAssistantActive && (
        <button type="button" className="sr-only" onClick={activateFromGesture}>
          Activate Netra voice assistant
        </button>
      )}
    </main>
  );
}
