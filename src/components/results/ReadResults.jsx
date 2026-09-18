import { FileText } from "lucide-react";

export default function ReadResult({ result }) {
  if (!result) {
    return null;
  }

  const detectedText = Array.isArray(result.detectedText)
    ? result.detectedText.filter(
        (text) => typeof text === "string" && text.trim(),
      )
    : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-emerald-700">
        <FileText size={20} />

        <h2 className="font-semibold">Detected text</h2>
      </div>

      {detectedText.length > 0 ? (
        <div className="mt-4 space-y-3">
          {detectedText.map((text, index) => (
            <p
              key={`${text}-${index}`}
              className="whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900"
            >
              {text}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          No clearly readable text was detected in this view.
        </p>
      )}
    </section>
  );
}
