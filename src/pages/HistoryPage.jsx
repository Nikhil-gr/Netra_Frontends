import { Link } from 'react-router-dom'
import { useHistory } from '../queries/history/useHistory.js'

export default function HistoryPage() {
  const { data, isLoading, isError } = useHistory()
  const items = data?.history ?? data?.data ?? []

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-6">
      <Link className="text-sm font-medium text-emerald-700" to="/">Back</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-950">History</h1>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-slate-600">
        {isLoading && 'Loading history...'}
        {isError && 'History is not available right now.'}
        {!isLoading && !isError && items.length === 0 && 'No saved history yet.'}
        {!isLoading && !isError && items.length > 0 && `${items.length} saved items`}
      </div>
    </main>
  )
}
