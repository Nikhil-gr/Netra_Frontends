export default function ModeCard({
  icon: Icon,
  title,
  description,
  onClick,
  selected = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-selected={selected ? "true" : "false"}
      aria-label={`${title}. ${description}`}
      className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
        selected
          ? "border-emerald-500 ring-2 ring-emerald-100"
          : "border-slate-200 hover:border-emerald-200 hover:shadow-md"
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon size={24} />
      </div>

      <h2 className="mt-5 text-xl font-semibold text-slate-950">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      {selected && (
        <p className="mt-4 text-xs font-medium text-emerald-700">
          Press again to open
        </p>
      )}
    </button>
  );
}
