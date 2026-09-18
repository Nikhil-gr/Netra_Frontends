import { AlertTriangle, Eye, FileText, MapPin } from "lucide-react";

export default function DescribeResult({ result }) {
  if (!result) {
    return null;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-emerald-700">
          <Eye size={20} />

          <h2 className="font-semibold">Scene</h2>
        </div>

        <p className="mt-4 text-lg leading-8 text-slate-900">
          {result.summary}
        </p>

        {result.scene && (
          <p className="mt-3 text-sm capitalize text-slate-500">
            {result.scene}
          </p>
        )}
      </section>

      {result.objects?.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-emerald-700" />

            <h2 className="font-semibold text-slate-950">Objects</h2>
          </div>

          <div className="mt-4 space-y-2">
            {result.objects.map((object, index) => (
              <div
                key={`${object.name}-${index}`}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
              >
                <span className="capitalize text-slate-900">{object.name}</span>

                <span className="text-sm capitalize text-slate-500">
                  {object.position}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {result.possibleHazards?.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={20} />

            <h2 className="font-semibold">Possible hazards</h2>
          </div>

          <div className="mt-4 space-y-2">
            {result.possibleHazards.map((hazard, index) => (
              <p
                key={`${hazard.type}-${index}`}
                className="text-sm text-amber-900"
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
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-emerald-700" />

            <h2 className="font-semibold text-slate-950">Visible text</h2>
          </div>

          <div className="mt-4 space-y-2">
            {result.visibleText.map((text, index) => (
              <p key={index} className="text-sm leading-6 text-slate-700">
                {text}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
