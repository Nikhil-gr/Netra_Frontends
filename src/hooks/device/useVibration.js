import { useCallback } from "react";

export function useVibration() {
  const isSupported =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  const vibrate = useCallback(
    (pattern = 100) => {
      if (!isSupported) {
        return false;
      }

      navigator.vibrate(pattern);
      return true;
    },
    [isSupported],
  );

  const stop = useCallback(() => {
    if (isSupported) {
      navigator.vibrate(0);
    }
  }, [isSupported]);

  return {
    isSupported,
    vibrate,
    stop,
  };
}
