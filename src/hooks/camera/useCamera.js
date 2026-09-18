import { useCallback, useRef, useState } from "react";

function stopStream(stream) {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

function getCameraError(error) {
  switch (error?.name) {
    case "NotAllowedError":
      return "Camera permission was denied.";

    case "NotFoundError":
      return "No camera was found.";

    case "NotReadableError":
      return "The camera is currently unavailable.";

    case "OverconstrainedError":
      return "The requested camera is unavailable.";

    default:
      return "Unable to start the camera.";
  }
}

export function useCamera() {
  const streamRef = useRef(null);

  const [stream, setStream] = useState(null);

  const [error, setError] = useState(null);

  const [isStarting, setIsStarting] = useState(false);

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current);

    streamRef.current = null;

    setStream(null);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser.");

      return;
    }

    try {
      setIsStarting(true);
      setError(null);

      stopStream(streamRef.current);

      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },

          width: {
            ideal: 1280,
          },

          height: {
            ideal: 720,
          },
        },

        audio: false,
      });

      streamRef.current = nextStream;

      setStream(nextStream);
    } catch (cameraError) {
      console.error(cameraError);

      setError(getCameraError(cameraError));
    } finally {
      setIsStarting(false);
    }
  }, []);

  return {
    stream,
    error,
    isStarting,
    isActive: Boolean(stream),

    startCamera,
    stopCamera,
  };
}
