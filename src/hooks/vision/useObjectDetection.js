import { useEffect, useRef, useState } from "react";

import { getCocoDetector } from "../../vision/cocoDetector.js";

import { getObjectPosition } from "../../utils/vision/getObjectPosition.js";

const DEFAULT_INTERVAL = 500;

const DEFAULT_MAX_DETECTIONS = 20;

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const getCenterOverlapRatio = (bbox, frameWidth) => {
  if (!bbox || !frameWidth) {
    return 0;
  }

  const [x, , width] = bbox;

  if (width <= 0) {
    return 0;
  }

  const boxLeft = x;

  const boxRight = x + width;

  const corridorLeft = frameWidth * 0.34;

  const corridorRight = frameWidth * 0.66;

  const overlap = Math.max(
    0,

    Math.min(boxRight, corridorRight) - Math.max(boxLeft, corridorLeft),
  );

  return clamp(overlap / width, 0, 1);
};

export function useObjectDetection({
  videoRef,
  enabled = true,
  minScore = 0.5,
  interval = DEFAULT_INTERVAL,
  maxDetections = DEFAULT_MAX_DETECTIONS,
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

      setDetectionError(null);

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
              const predictions = await model.detect(
                video,
                maxDetections,
                minScore,
              );

              if (cancelled) {
                return;
              }

              const frameWidth = video.videoWidth;

              const frameHeight = video.videoHeight;

              const frameArea = frameWidth * frameHeight;

              const filtered = predictions
                .filter((prediction) => prediction.score >= minScore)
                .map((prediction) => {
                  const [x, y, width, height] = prediction.bbox;

                  const safeWidth = Math.max(0, width);

                  const safeHeight = Math.max(0, height);

                  const boxArea = safeWidth * safeHeight;

                  const centerXRatio = clamp(
                    (x + safeWidth / 2) / frameWidth,
                    0,
                    1,
                  );

                  const bottomRatio = clamp(
                    (y + safeHeight) / frameHeight,
                    0,
                    1,
                  );

                  return {
                    label: prediction.class,

                    confidence: prediction.score,

                    bbox: prediction.bbox,

                    areaRatio: frameArea > 0 ? boxArea / frameArea : 0,

                    centerXRatio,

                    bottomRatio,

                    centerOverlapRatio: getCenterOverlapRatio(
                      prediction.bbox,
                      frameWidth,
                    ),

                    position: getObjectPosition(prediction.bbox, frameWidth),
                  };
                });

              setDetections(filtered);

              setDetectionError(null);
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
  }, [enabled, interval, maxDetections, minScore, videoRef]);

  return {
    detections,

    isModelLoading,

    isDetecting,

    detectionError,
  };
}
