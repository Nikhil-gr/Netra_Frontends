import { Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useNetraStore } from '../store/useNetraStore.js'

export default function FindPage() {
  const navigate = useNavigate()
  const findQuery = useNetraStore((state) => state.findQuery)
  const setFindQuery = useNetraStore((state) => state.setFindQuery)

  function handleSubmit(event) {
    event.preventDefault()
    if (findQuery.trim()) navigate('/camera/find')
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-6">
      <Link className="text-sm font-medium text-emerald-700" to="/">Back</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-950">Find an object</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Object name</span>
          <input
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-emerald-600"
            value={findQuery}
            onChange={(event) => setFindQuery(event.target.value)}
            placeholder="chair"
          />
        </label>
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">
          <Search size={18} />
          Open camera
        </button>
      </form>
    </main>
  )
}
