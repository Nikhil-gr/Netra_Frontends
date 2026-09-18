import { Link } from 'react-router-dom'
import ResultCard from '../components/results/ResultCard.jsx'
import { useNetraStore } from '../store/useNetraStore.js'

export default function ResultPage() {
  const currentResult = useNetraStore((state) => state.currentResult)

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-6">
      <Link className="text-sm font-medium text-emerald-700" to="/">Back</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-950">Result</h1>
      <div className="mt-6">
        <ResultCard>
          <p className="text-slate-600">
            {currentResult?.spokenResponse ?? 'No result yet. Capture and analyze will be added next.'}
          </p>
        </ResultCard>
      </div>
    </main>
  )
}
