import { useEffect, useRef, useState } from "react";

import { getCocoDetector } from "../../vision/cocoDetector.js";

import { getObjectPosition } from "../../utils/vision/getObjectPosition.js";

const DEFAULT_INTERVAL = 700;

export function useObjectDetection({
  videoRef,
  enabled = true,
  minScore = 0.6,
  interval = DEFAULT_INTERVAL,
}) {
  const [detections, setDetections] = useState([]);

  const [isModelLoading, setIsModelLoading] = useState(false);

  const [isDetecting, setIsDetecting] = useState(false);

  const [detectionError, setDetectionError] = useState(null);

  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setDetections([]);
      setIsDetecting(false);

      return;
    }

    let cancelled = false;
    let timerId = null;

    async function startDetection() {
      try {
        setIsModelLoading(true);
        setDetectionError(null);

        const model = await getCocoDetector();

        if (cancelled) {
          return;
        }

        setIsModelLoading(false);

        async function detectFrame() {
          if (cancelled) {
            return;
          }

          const video = videoRef.current;

          const cameraReady =
            video &&
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0;

          if (cameraReady && !runningRef.current) {
            runningRef.current = true;

            setIsDetecting(true);

            try {
              const predictions = await model.detect(video, 10);

              if (cancelled) {
                return;
              }

              const frameArea = video.videoWidth * video.videoHeight;

              const filtered = predictions
                .filter((prediction) => prediction.score >= minScore)
                .map((prediction) => {
                  const [, , width, height] = prediction.bbox;

                  const boxArea = Math.max(0, width) * Math.max(0, height);

                  return {
                    label: prediction.class,

                    confidence: prediction.score,

                    bbox: prediction.bbox,

                    areaRatio: frameArea > 0 ? boxArea / frameArea : 0,

                    position: getObjectPosition(
                      prediction.bbox,
                      video.videoWidth,
                    ),
                  };
                });

              setDetections(filtered);
            } catch (error) {
              console.error("Object detection failed:", error);

              if (!cancelled) {
                setDetectionError(
                  "Object detection is temporarily unavailable.",
                );
              }
            } finally {
              runningRef.current = false;

              if (!cancelled) {
                setIsDetecting(false);
              }
            }
          }

          if (!cancelled) {
            timerId = window.setTimeout(detectFrame, interval);
          }
        }

        detectFrame();
      } catch (error) {
        console.error("Unable to load object detector:", error);

        if (!cancelled) {
          setIsModelLoading(false);

          setDetectionError("Unable to load local object detection.");
        }
      }
    }

    startDetection();

    return () => {
      cancelled = true;

      runningRef.current = false;

      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [enabled, interval, minScore, videoRef]);

  return {
    detections,
    isModelLoading,
    isDetecting,
    detectionError,
  };
}
