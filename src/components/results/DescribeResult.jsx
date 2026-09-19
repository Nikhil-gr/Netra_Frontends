import { AlertTriangle, Eye, FileText, MapPin } from "lucide-react";

export default function DescribeResult({ result }) {
  if (!result) {
    return null;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-[#07111c] p-5">
        <div className="flex items-center gap-2 text-blue-400">
          <Eye size={20} />

          <h2 className="font-semibold">Scene</h2>
        </div>

        <p className="mt-4 text-lg leading-8 text-slate-100">
          {result.summary}
        </p>

        {result.scene && (
          <p className="mt-3 text-sm capitalize text-slate-500">
            {result.scene}
          </p>
        )}
      </section>

      {result.objects?.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#07111c] p-5">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-blue-400" />

            <h2 className="font-semibold text-white">Objects</h2>
          </div>

          <div className="mt-4 space-y-2">
            {result.objects.map((object, index) => (
              <div
                key={`${object.name}-${index}`}
                className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3"
              >
                <span className="capitalize text-slate-100">{object.name}</span>

                <span className="text-sm capitalize text-slate-500">
                  {object.position}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {result.possibleHazards?.length > 0 && (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle size={20} />

            <h2 className="font-semibold">Possible hazards</h2>
          </div>

          <div className="mt-4 space-y-2">
            {result.possibleHazards.map((hazard, index) => (
              <p
                key={`${hazard.type}-${index}`}
                className="text-sm text-amber-200"
              >
                <span className="capitalize">{hazard.type}</span>

                {" — "}

                {hazard.position}
              </p>
            ))}
          </div>
        </section>
      )}

      {result.visibleText?.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#07111c] p-5">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-blue-400" />

            <h2 className="font-semibold text-white">Visible text</h2>
          </div>

          <div className="mt-4 space-y-2">
            {result.visibleText.map((text, index) => (
              <p key={index} className="text-sm leading-6 text-slate-300">
                {text}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
