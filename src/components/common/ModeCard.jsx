import { Link } from 'react-router-dom'

export default function ModeCard({ icon: Icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <Icon size={22} />
      </div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  )
}
