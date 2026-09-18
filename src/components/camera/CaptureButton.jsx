import { Camera } from "lucide-react";

export default function CaptureButton({ onCapture, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onCapture}
      disabled={disabled}
      className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      aria-label="Capture image"
    >
      <Camera size={22} />
      Capture
    </button>
  );
}
