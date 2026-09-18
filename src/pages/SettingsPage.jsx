import { Link } from 'react-router-dom'
import { useNetraStore } from '../store/useNetraStore.js'

export default function SettingsPage() {
  const language = useNetraStore((state) => state.language)
  const setLanguage = useNetraStore((state) => state.setLanguage)
  const autoSpeak = useNetraStore((state) => state.autoSpeak)
  const setAutoSpeak = useNetraStore((state) => state.setAutoSpeak)
  const vibrationEnabled = useNetraStore((state) => state.vibrationEnabled)
  const setVibrationEnabled = useNetraStore((state) => state.setVibrationEnabled)

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-6">
      <Link className="text-sm font-medium text-emerald-700" to="/">Back</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-950">Settings</h1>
      <section className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Language</span>
          <select className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3" value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="ne">Nepali</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-4 text-slate-700">
          Auto speak
          <input checked={autoSpeak} onChange={(event) => setAutoSpeak(event.target.checked)} type="checkbox" />
        </label>
        <label className="flex items-center justify-between gap-4 text-slate-700">
          Vibration
          <input checked={vibrationEnabled} onChange={(event) => setVibrationEnabled(event.target.checked)} type="checkbox" />
        </label>
      </section>
    </main>
  )
}
