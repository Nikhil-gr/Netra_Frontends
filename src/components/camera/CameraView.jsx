import { useEffect } from "react";
import { Camera, LoaderCircle, VideoOff } from "lucide-react";

export default function CameraView({
  videoRef,
  stream,
  error,
  isStarting,
  placeholderSrc = "/netra_WPA/03_describe_scene.webp",
}) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
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
      <div className="flex min-h-[390px] sm:min-h-[440px] items-center justify-center rounded-3xl border border-white/10 bg-[#050b12] p-6 text-center text-white md:min-h-[560px]">
        <div>
          <VideoOff size={42} className="mx-auto text-slate-400" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (isStarting || !stream) {
    return (
      <div className="relative flex min-h-[390px] sm:min-h-[440px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#050b12] text-white md:min-h-[560px]">
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20 blur-[1px]"
        />
        <div className="absolute inset-0 bg-[#02070d]/65" />
        <div className="relative text-center">
          {isStarting ? (
            <LoaderCircle
              className="mx-auto animate-spin text-blue-400"
              size={40}
            />
          ) : (
            <Camera className="mx-auto text-slate-300" size={40} />
          )}
          <p className="mt-3 text-sm text-slate-300">
            {isStarting ? "Starting camera..." : "Waiting for camera"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[390px] overflow-hidden rounded-2xl border border-white/10 bg-black sm:min-h-[440px] md:min-h-[560px] md:rounded-3xl">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="Live camera preview"
      />
      <div className="pointer-events-none absolute inset-4 rounded-2xl border border-white/20">
        <span className="absolute -left-px -top-px h-7 w-7 rounded-tl-2xl border-l-2 border-t-2 border-white" />
        <span className="absolute -right-px -top-px h-7 w-7 rounded-tr-2xl border-r-2 border-t-2 border-white" />
        <span className="absolute -bottom-px -left-px h-7 w-7 rounded-bl-2xl border-b-2 border-l-2 border-white" />
        <span className="absolute -bottom-px -right-px h-7 w-7 rounded-br-2xl border-b-2 border-r-2 border-white" />
      </div>
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-2 text-xs font-medium text-white backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Camera active
      </div>
    </div>
  );
}
