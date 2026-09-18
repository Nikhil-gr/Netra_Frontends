import { Link, useParams } from 'react-router-dom'
import CameraView from '../components/camera/CameraView.jsx'
import CaptureButton from '../components/camera/CaptureButton.jsx'
import { useNetraStore } from '../store/useNetraStore.js'

export default function CameraPage() {
  const { mode } = useParams()
  const findQuery = useNetraStore((state) => state.findQuery)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-6">
      <Link className="text-sm font-medium text-emerald-700" to="/">Back</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-950">Camera</h1>
      <p className="mt-2 text-slate-600">Mode: {mode}</p>
      {mode === 'find' && <p className="mt-1 text-slate-600">Looking for: {findQuery || 'No object set'}</p>}
      <div className="mt-6">
        <CameraView />
      </div>
      <div className="mt-5">
        <CaptureButton />
      </div>
    </main>
  )
}
