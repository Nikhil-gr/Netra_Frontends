import { createContext, useContext } from "react";

export const NetraVoiceContext = createContext(null);

export function useNetraVoice() {
  const value = useContext(NetraVoiceContext);
  if (!value) throw new Error("useNetraVoice must be used inside NetraVoiceProvider");
  return value;
}
