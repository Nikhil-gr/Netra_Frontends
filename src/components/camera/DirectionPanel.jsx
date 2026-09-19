import { BrainCircuit, LoaderCircle } from "lucide-react";

export default function DetectionPanel({
  detections,
  isModelLoading,
  isDetecting,
  error,
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#07111c] p-5">
      <div className="flex items-center gap-2">
        <BrainCircuit size={20} className="text-blue-400" />

        <h2 className="font-semibold text-white">Local vision</h2>
      </div>

      {isModelLoading && (
        <div
          className="mt-4 flex items-center gap-2 text-sm text-slate-400"
          role="status"
        >
          <LoaderCircle size={18} className="animate-spin" />
          Loading object detector...
        </div>
      )}

      {!isModelLoading && isDetecting && (
        <p className="mt-3 text-xs font-medium text-blue-400">Scanning...</p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {!isModelLoading && !error && detections.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          No confident objects detected yet.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {detections.map((detection, index) => (
          <div
            key={`${detection.label}-${detection.position}-${index}`}
            className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3"
          >
            <div>
              <p className="font-medium capitalize text-slate-100">
                {detection.label}
              </p>

              <p className="text-xs text-slate-500">
                {Math.round(detection.confidence * 100)}% confidence
              </p>
            </div>

            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium capitalize text-blue-400">
              {detection.position}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
