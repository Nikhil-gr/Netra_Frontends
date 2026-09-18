import { useEffect } from "react";

import { Camera, LoaderCircle, VideoOff } from "lucide-react";

export default function CameraView({ videoRef, stream, error, isStarting }) {
  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!stream) {
      video.srcObject = null;
      return;
    }

    video.srcObject = stream;

    return () => {
      video.srcObject = null;
    };
  }, [stream, videoRef]);

  if (error) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-950 p-6 text-center text-white">
        <div>
          <VideoOff size={42} className="mx-auto" />

          <p className="mt-4">{error}</p>
        </div>
      </div>
    );
  }

  if (isStarting || !stream) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-950 text-white">
        <div className="text-center">
          {isStarting ? (
            <LoaderCircle className="mx-auto animate-spin" size={40} />
          ) : (
            <Camera className="mx-auto" size={40} />
          )}

          <p className="mt-3">
            {isStarting ? "Starting camera..." : "Waiting for camera"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="aspect-video h-full w-full object-contain"
        aria-label="Live camera preview"
      />

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-xs font-medium text-white backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Camera active
      </div>
    </div>
  );
}
