import { Camera } from 'lucide-react'

export default function CaptureButton(props) {
  return (
    <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white" type="button" {...props}>
      <Camera size={18} />
      Capture
    </button>
  )
}
