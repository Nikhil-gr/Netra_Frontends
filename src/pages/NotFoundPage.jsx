import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-6">
      <h1 className="mt-6 text-3xl font-bold text-slate-950">Page not found</h1>
      <Link className="mt-4 inline-block text-sm font-medium text-emerald-700" to="/">Go home</Link>
    </main>
  )
}
