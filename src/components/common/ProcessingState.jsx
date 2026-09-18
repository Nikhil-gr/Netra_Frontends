import { LoaderCircle, Sparkles } from "lucide-react";

export default function ProcessingState({
  message = "Understanding your surroundings...",
}) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50/50 p-8 text-center"
      role="status"
      aria-live="assertive"
    >
      <div className="relative">
        <Sparkles size={32} className="text-emerald-700" />

        <LoaderCircle
          size={52}
          className="absolute -left-2.5 -top-2.5 animate-spin text-emerald-300"
        />
      </div>

      <p className="mt-6 text-lg font-semibold text-slate-950">{message}</p>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
        Netra is analyzing one captured frame.
      </p>
    </div>
  );
}
