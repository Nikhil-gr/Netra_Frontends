import { Check, RotateCcw } from "lucide-react";

export default function ImagePreview({ imageUrl, onRetake, onContinue }) {
  return (
    <div className="space-y-5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
        <img
          src={imageUrl}
          alt="Captured camera preview"
          className="h-full w-full object-cover"
        />

        <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-2 text-xs font-medium text-white backdrop-blur">
          Image captured
        </div>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-2"
        role="group"
        aria-label="Captured image actions"
      >
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-4 font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          <RotateCcw size={20} />
          Retake
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 font-semibold text-white transition hover:bg-emerald-800"
        >
          <Check size={20} />
          Use image
        </button>
      </div>
    </div>
  );
}
