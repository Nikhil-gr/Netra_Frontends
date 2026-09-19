import { useEffect, useRef } from "react";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  VideoOff,
  Zap,
} from "lucide-react";

export default function CameraView({
  videoRef,
  stream,
  error,
  isStarting,
  helperText,
  onImageFile,
  zoom = "1x",
  onZoomToggle,
  torch = false,
  onTorchToggle,
}) {
  const fileInputRef = useRef(null);

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

  const handleGalleryClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImageFile) {
      onImageFile(file);
    }
  };

  const isLive = Boolean(stream && !error && !isStarting);

  return (
    <div className="relative aspect-[4/5] sm:aspect-[3/4] md:aspect-[4/3] max-h-[500px] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-lg">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Video Feed */}
      {isLive ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            transform: zoom === "2x" ? "scale(1.75)" : "scale(1)",
            transition: "transform 0.25s ease",
          }}
          className="absolute inset-0 h-full w-full object-cover"
          aria-label="Live camera preview"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e16] p-6 text-center">
          {error ? (
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <VideoOff size={24} />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-200">Camera Unavailable</p>
              <p className="mt-1 text-xs text-slate-400 max-w-xs">{error}</p>
            </div>
          ) : isStarting ? (
            <div className="flex flex-col items-center">
              <Loader2 className="animate-spin text-blue-400" size={32} />
              <p className="mt-3 text-xs font-medium text-slate-300">
                Starting camera...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-slate-400">
                <Camera size={24} />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Waiting for camera feed
              </p>
            </div>
          )}
        </div>
      )}

      {/* Minimal Real Viewfinder Corner Tick Marks */}
      <div className="pointer-events-none absolute inset-4">
        <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-white/70 rounded-tl-sm" />
        <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-white/70 rounded-tr-sm" />
        <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-white/70 rounded-bl-sm" />
        <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-white/70 rounded-br-sm" />
      </div>

      {/* Top Helper Pill */}
      {helperText && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
          <div className="rounded-full bg-black/65 border border-white/10 px-3.5 py-1 text-[11px] font-medium text-slate-200 shadow-sm backdrop-blur-sm">
            {helperText}
          </div>
        </div>
      )}

      {/* Bottom Camera Controls: Upload, Zoom, Flash */}
      <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-between px-6 sm:px-10">
        <button
          type="button"
          onClick={handleGalleryClick}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 border border-white/15 text-slate-200 transition hover:bg-black/80 hover:text-white active:scale-95"
          title="Upload image from gallery"
          aria-label="Upload photo from gallery"
        >
          <ImageIcon size={18} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoomToggle?.();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 border border-white/15 text-xs font-semibold text-slate-200 transition hover:bg-black/80 hover:text-white active:scale-95"
          title="Toggle camera zoom"
          aria-label={`Toggle zoom, current ${zoom}`}
        >
          {zoom}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTorchToggle?.();
          }}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-95 ${
            torch
              ? "bg-amber-400 text-black border-amber-300"
              : "bg-black/60 border-white/15 text-slate-200 hover:bg-black/80 hover:text-white"
          }`}
          title="Toggle flashlight"
          aria-label="Toggle flashlight"
        >
          <Zap size={18} className={torch ? "fill-black" : ""} />
        </button>
      </div>
    </div>
  );
}
