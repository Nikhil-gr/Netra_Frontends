import { Eye, FileText, History, Menu, Settings, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSpokenAction } from "../hooks/accessibilty/useSpokenAction.js";
import { useNetraStore } from "../store/useNetraStore.js";
import { useNetraVoice } from "../voice/useNetraVoice.js";

const ASSET_ROOT = "/netra_assets";
const LOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 };
const normalizePosition = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
  speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
  timestamp: position.timestamp,
});

export default function HomePage() {
  const navigate = useNavigate();
  const { trigger, isArmed } = useSpokenAction();
  const { registerActions } = useNetraVoice();
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const setWalkInitialLocation = useNetraStore((state) => state.setWalkInitialLocation);

  const requestMicrophonePermission = () => {
    if (!navigator.mediaDevices?.getUserMedia) return Promise.resolve(null);
    return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
      return true;
    }).catch(() => null);
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) return Promise.resolve(null);
    if (!window.isSecureContext && window.location.hostname !== "localhost") return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition((position) => {
        const location = normalizePosition(position);
        setWalkInitialLocation(location);
        resolve(location);
      }, () => resolve(null), LOCATION_OPTIONS);
    });
  };

  const openWalkAssist = useCallback(async () => {
    setWalkInitialLocation(null);
    await Promise.allSettled([requestMicrophonePermission(), requestLocationPermission()]);
    navigate("/walk-assist");
  }, [navigate, setWalkInitialLocation]);
  const openDescribe = useCallback(() => navigate("/camera/describe"), [navigate]);
  const openRead = useCallback(() => navigate("/camera/read"), [navigate]);

  useEffect(() => registerActions({
    describe: openDescribe,
    read: openRead,
    walk: openWalkAssist,
  }), [openDescribe, openRead, openWalkAssist, registerActions]);

  const modes = [
    { id: "describe", title: "Describe", description: "Describes your surroundings", icon: Eye, announcement: "Describe clicked. Press again to open.", action: openDescribe },
    { id: "read", title: "Read Text", description: "Reads visible text instantly", icon: FileText, announcement: "Read text clicked. Press again to open.", action: openRead },
    { id: "assist", title: "Walk Assist", description: "Assists you while walking", icon: ShieldAlert, announcement: "Walk assist clicked. Press again to allow microphone and location access and open Walk Assist.", action: openWalkAssist },
  ];
  const triggerMode = (mode) => trigger({ id: mode.id, announcement: mode.announcement, action: mode.action });

  return (
    <main className="netra-home">
      <picture className="netra-home__picture" aria-hidden="true">
        <source media="(max-width: 700px)" srcSet={`${ASSET_ROOT}/hero/hero-bg-mobile.webp`} />
        <img src={`${ASSET_ROOT}/hero/hero-bg-desktop.webp`} alt="" />
      </picture>
      <div className="netra-home__shade" aria-hidden="true" />

      <header className="netra-nav">
        <a href="#home" className="netra-brand" aria-label="Netra home">
          <img src={`${ASSET_ROOT}/logo/netra-logo-full.webp`} alt="Netra — A clearer tomorrow" />
        </a>
        <nav className="netra-nav__links" aria-label="Primary navigation">
          <a className="is-active" href="#home">Home</a>
          <a href="#vision">Our Vision</a>
          <a href="#features">Technology</a>
          <a href="#features">Impact</a>
          <a href="#vision">Built for People</a>
        </nav>
        <nav className="netra-nav__tools" aria-label="Account navigation">
          <button type="button" className={isArmed("history") ? "is-armed" : ""} onClick={() => trigger({ id: "history", announcement: "History clicked. Press again to open.", action: () => navigate("/history") })}>
            <History size={17} /><span>History</span>
          </button>
          <button type="button" className={isArmed("settings") ? "is-armed" : ""} onClick={() => trigger({ id: "settings", announcement: "Settings clicked. Press again to open.", action: () => navigate("/settings") })}>
            <Settings size={17} /><span>Settings</span>
          </button>
        </nav>
        <button type="button" className="netra-nav__menu" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="netra-mobile-menu">
            <a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Technology</a>
            <button type="button" onClick={() => trigger({ id: "mobile-history", announcement: "History clicked. Press again to open.", action: () => navigate("/history") })}>{isArmed("mobile-history") ? "Press again: History" : "History"}</button>
            <button type="button" onClick={() => trigger({ id: "mobile-settings", announcement: "Settings clicked. Press again to open.", action: () => navigate("/settings") })}>{isArmed("mobile-settings") ? "Press again: Settings" : "Settings"}</button>
          </div>
        )}
      </header>

      <section id="home" className="netra-hero" aria-labelledby="netra-title">
        <div id="vision" className="netra-hero__copy">
          <p className="netra-kicker">Hello, welcome to</p>
          <h1 id="netra-title">Netra</h1>
          <p className="netra-subtitle">Your AI companion for a more independent life.</p>
        </div>

        <div id="features" className="netra-features" aria-label="Netra modes">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button type="button" key={mode.id} onClick={() => triggerMode(mode)} className={isArmed(mode.id) ? "is-armed" : ""} aria-label={`${mode.title}. ${mode.description}. ${isArmed(mode.id) ? "Press again to open." : "Press once for confirmation."}`}>
                <span className="netra-feature__icon"><Icon size={25} /></span>
                <span className="netra-feature__title">{mode.title}</span>
                <span className="netra-feature__description">{mode.description}</span>
                {isArmed(mode.id) && <span className="netra-feature__armed">Press again</span>}
              </button>
            );
          })}
        </div>

        <div className="netra-voice-stage">
          <div className="netra-wave netra-wave--left" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
          <button type="button" className="netra-orb" onClick={() => setVoiceMenuOpen(true)} aria-label="Open voice action menu" aria-haspopup="dialog">
            <span className="netra-orb__core" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          </button>
          <div className="netra-wave netra-wave--right" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
        </div>

        <button type="button" className={`netra-begin ${isArmed("voice-menu") ? "is-armed" : ""}`} onClick={() => trigger({ id: "voice-menu", announcement: "Begin clicked. Press again to open Netra actions.", action: () => setVoiceMenuOpen(true) })}>
          <span>{isArmed("voice-menu") ? "Press again to open" : "Double tap anywhere to begin"}</span>
          <span className="netra-begin__ring" aria-hidden="true" />
        </button>
        <p className="netra-signoff">A more independent tomorrow starts here</p>
      </section>

      <p className="netra-corner netra-corner--left" aria-hidden="true">People<br />Technology<br />A brighter tomorrow</p>
      <p className="netra-corner netra-corner--right" aria-hidden="true">Netra<br />For a more inclusive world</p>

      {voiceMenuOpen && (
        <div className="netra-dialog-backdrop" role="presentation" onMouseDown={() => setVoiceMenuOpen(false)}>
          <section className="netra-dialog" role="dialog" aria-modal="true" aria-labelledby="voice-menu-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="netra-dialog__close" onClick={() => setVoiceMenuOpen(false)} aria-label="Close Netra actions"><X size={22} /></button>
            <img src={`${ASSET_ROOT}/logo/netra-logo-mark.webp`} alt="" aria-hidden="true" />
            <p className="netra-kicker">How can Netra help?</p>
            <h2 id="voice-menu-title">Choose an action or say it aloud</h2>
            <div className="netra-dialog__actions">
              {modes.map((mode) => {
                const Icon = mode.icon;
                return <button type="button" key={mode.id} onClick={() => triggerMode(mode)}><Icon size={21} /><span>{mode.title}</span></button>;
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
