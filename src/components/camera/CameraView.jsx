import { Camera } from 'lucide-react'

export default function CameraView() {
  return (
    <div className="flex aspect-[3/4] w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500">
      <Camera size={42} />
      <p className="mt-3 text-sm font-medium">Camera preview placeholder</p>
    </div>
  )
}
