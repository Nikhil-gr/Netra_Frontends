import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function EmergencyCallPage() {
  const navigate = useNavigate();
  const hasSpoken = useRef(false);

  const handleEndCall = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Call ended.");
      u.lang = "en-US";
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch (_) { /* optional */ }
    navigate("/");
  }, [navigate]);

  // Speak clear prompt on mount & cancel on unmount
  useEffect(() => {
    if (hasSpoken.current) return undefined;
    hasSpoken.current = true;

    const say = () => {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(
          "Calling emergency help. Please stay calm. Help is on the way.",
        );
        u.lang = "en-US";
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
      } catch (_) { /* speechSynthesis not supported */ }
    };

    const t = setTimeout(say, 150);
    return () => {
      clearTimeout(t);
      try {
        window.speechSynthesis.cancel();
      } catch (_) { /* ignore */ }
    };
  }, []);

  // Speech recognition listening for "cut", "stop", "cancel", "hang up"
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return undefined;
    let recognition;
    try {
      recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const lastIndex = event.results.length - 1;
        const transcript = (event.results[lastIndex][0]?.transcript || "").toLowerCase().trim();
        if (
          transcript.includes("cut") ||
          transcript.includes("stop") ||
          transcript.includes("cancel") ||
          transcript.includes("hang up") ||
          transcript.includes("end") ||
          transcript.includes("close")
        ) {
          try { recognition.stop(); } catch (_) { /* ignore */ }
          handleEndCall();
        }
      };

      recognition.start();
    } catch (_) { /* mic access / speech rec error */ }

    return () => {
      try { recognition?.stop(); } catch (_) { /* ignore */ }
    };
  }, [handleEndCall]);

  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0f1a] text-white select-none">

      {/* Pulsing rings */}
      <div className="relative flex items-center justify-center mb-10">
        <span
          className="absolute h-40 w-40 animate-ping rounded-full bg-red-500/10"
          style={{ animationDuration: "1.6s" }}
        />
        <span
          className="absolute h-28 w-28 animate-ping rounded-full bg-red-500/15"
          style={{ animationDuration: "1.2s", animationDelay: "0.2s" }}
        />
        <span
          className="absolute h-20 w-20 animate-ping rounded-full bg-red-500/20"
          style={{ animationDuration: "1s", animationDelay: "0.1s" }}
        />

        {/* Phone icon circle */}
        <span className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-600/30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.58a16 16 0 0 0 5.51 5.51l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </span>
      </div>

      {/* Status text */}
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-red-400/80 mb-2">
        Emergency Services
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Calling…
      </h1>
      <p className="mt-2 text-sm text-slate-400">911 / 112</p>

      {/* Wave bars under the number */}
      <div className="mt-5 flex items-end gap-1" aria-hidden="true">
        {[0.5, 0.8, 1, 0.7, 0.9, 0.6, 1].map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-red-400/60"
            style={{
              height: `${h * 18}px`,
              animation: "waveemg 0.7s ease-in-out infinite alternate",
              animationDelay: `${i * 0.09}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes waveemg {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      {/* End call button */}
      <button
        type="button"
        onClick={handleEndCall}
        className="mt-16 flex h-14 w-14 items-center justify-center rounded-full bg-red-600/20 border border-red-500/30 transition hover:bg-red-600/30 active:scale-95"
        aria-label="Cut call and return home"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-400 rotate-[135deg]"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.58a16 16 0 0 0 5.51 5.51l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </button>
      <p className="mt-2 text-[10px] text-slate-500">say "cut" or tap to end call</p>
    </main>
  );
}
