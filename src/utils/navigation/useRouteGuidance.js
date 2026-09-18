import { useEffect, useMemo, useRef, useState } from "react";

import { distanceBetweenMeters } from "../../utils/navigation/distance.js";

const sanitizeInstruction = (instruction = "") =>
  instruction
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getFallbackInstruction = (maneuver) => {
  switch (maneuver) {
    case "left":
    case "sharp_left":
    case "slight_left":
      return "Your route turns left ahead.";

    case "right":
    case "sharp_right":
    case "slight_right":
      return "Your route turns right ahead.";

    case "u_turn":
      return "Your route makes a U-turn ahead.";

    case "arrive":
      return "Your destination is ahead.";

    default:
      return "Continue along the route.";
  }
};

export const getSafeRouteInstruction = (step) => {
  const instruction = sanitizeInstruction(step?.instruction || "");
  const lower = instruction.toLowerCase();

  const unsafeClaim =
    lower.includes("safe to cross") ||
    lower.includes("cross now") ||
    lower.includes("road is clear") ||
    lower.includes("path is clear") ||
    lower.includes("no cars");

  if (!instruction || unsafeClaim) {
    return getFallbackInstruction(step?.maneuver);
  }

  return instruction;
};

export function useRouteGuidance({
  route,
  currentLocation,
  currentStepIndex,
  setCurrentStepIndex,
  enabled = true,
}) {
  const [cue, setCue] = useState(null);

  const previewedRef = useRef(new Set());
  const reachedRef = useRef(new Set());

  const steps = Array.isArray(route?.steps) ? route.steps : [];
  const currentStep = steps[currentStepIndex] || null;

  const distanceToStep = useMemo(() => {
    if (!currentStep || !currentLocation) {
      return Number.POSITIVE_INFINITY;
    }

    return distanceBetweenMeters(currentLocation, currentStep);
  }, [currentLocation, currentStep]);

  useEffect(() => {
    if (!enabled || !currentLocation || !currentStep) {
      return;
    }

    const stepId = currentStep.id || `step-${currentStepIndex}`;
    const accuracy = Number.isFinite(currentLocation.accuracy)
      ? currentLocation.accuracy
      : 10;

    const arrivalThreshold = Math.min(30, Math.max(12, accuracy * 1.25));
    const previewThreshold = Math.max(45, arrivalThreshold + 25);
    const instruction = getSafeRouteInstruction(currentStep);

    if (
      distanceToStep <= previewThreshold &&
      distanceToStep > arrivalThreshold &&
      !previewedRef.current.has(stepId)
    ) {
      previewedRef.current.add(stepId);

      setCue({
        id: `${stepId}-preview`,
        type: "maneuver_preview",
        priority: 60,
        message: instruction,
        step: currentStep,
        distanceMeters: Math.round(distanceToStep),
      });

      return;
    }

    if (distanceToStep <= arrivalThreshold && !reachedRef.current.has(stepId)) {
      reachedRef.current.add(stepId);

      const isArrival = currentStep.maneuver === "arrive";

      setCue({
        id: `${stepId}-reached`,
        type: isArrival ? "arrival" : "maneuver_now",
        priority: isArrival ? 95 : 80,
        message: instruction,
        step: currentStep,
        distanceMeters: Math.round(distanceToStep),
      });

      if (!isArrival && currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    }
  }, [
    currentLocation,
    currentStep,
    currentStepIndex,
    distanceToStep,
    enabled,
    setCurrentStepIndex,
    steps.length,
  ]);

  useEffect(() => {
    previewedRef.current.clear();
    reachedRef.current.clear();
    setCue(null);
  }, [route]);

  return {
    cue,
    currentStep,
    distanceToStep,
    hasRoute: steps.length > 0,
  };
}
