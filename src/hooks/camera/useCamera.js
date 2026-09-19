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

export function useCamera({ walkAssist = false } = {}) {
  const streamRef = useRef(null);
  const requestRef = useRef(null);
  const versionRef = useRef(0);

  const [stream, setStream] = useState(null);

  const [error, setError] = useState(null);

  const [isStarting, setIsStarting] = useState(false);

  const stopCamera = useCallback(() => {
    versionRef.current += 1;
    stopStream(streamRef.current);

    streamRef.current = null;

    setStream(null);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser.");

      return;
    }

    const version = ++versionRef.current;
    try {
      setIsStarting(true);
      setError(null);

      if (requestRef.current) {
        await requestRef.current.catch(() => {});
      }
      if (version !== versionRef.current) return;
      stopStream(streamRef.current);

      const request = navigator.mediaDevices.getUserMedia({
        video: {
          ...(walkAssist ? { frameRate: { ideal: 15, max: 20 } } : {}),
          facingMode: {
            ideal: "environment",
          },

          width: {
            ideal: walkAssist ? 640 : 1280,
          },

          height: {
            ideal: walkAssist ? 480 : 720,
          },
        },

        audio: false,
      });

      requestRef.current = request;
      const nextStream = await request;
      if (version !== versionRef.current) {
        stopStream(nextStream);
        return;
      }
      streamRef.current = nextStream;

      setStream(nextStream);
    } catch (cameraError) {
      if (version !== versionRef.current) return;
      console.error(cameraError);

      setError(getCameraError(cameraError));
    } finally {
      if (version === versionRef.current) setIsStarting(false);
    }
  }, [walkAssist]);

  return {
    stream,
    error,
    isStarting,
    isActive: Boolean(stream),

    startCamera,
    stopCamera,
  };
}
