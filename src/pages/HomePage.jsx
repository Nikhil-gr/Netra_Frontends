import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNetraStore } from "../store/useNetraStore.js";
import { useNetraVoice } from "../voice/useNetraVoice.js";
import { openWalkAssist as enterWalkAssist } from "../voice/openWalkAssist.js";

const ASSET_ROOT = "/netra_assets";

export default function HomePage() {
  const navigate = useNavigate();

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

  const openWalkAssist = useCallback(async () => {
    await enterWalkAssist({ navigate, setWalkInitialLocation });
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

  const handleKeyDown = useCallback((event) => {
    if (voiceAssistantActive || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const now = Date.now();
    if (now - lastTapRef.current <= 700) {
      lastTapRef.current = 0;
      activateFromGesture();
    } else {
      lastTapRef.current = now;
    }
  }, [activateFromGesture, voiceAssistantActive]);

  return (
    <main
      className={`netra-home ${
        voiceAssistantActive ? "is-activated" : "is-landing"
      }`}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={voiceAssistantActive ? undefined : 0}
      aria-label={voiceAssistantActive ? undefined : "Double tap or press Enter twice to activate Netra voice assistant"}
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
                ? "Voice assistant active — say Describe, Read Text, Walk Assist, or Guide"
                : "Voice assistant inactive — double tap to activate"}
            </span>
          </div>
        )}

        <p className="netra-signoff">A more independent tomorrow starts here</p>
      </section>

    </main>
  );
}
