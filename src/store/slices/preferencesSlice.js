export const createPreferencesSlice = (set) => ({
  language: "en",
  speechRate: 1,
  autoSpeak: true,
  vibrationEnabled: true,
  setLanguage: (language) => set({ language }),
  setSpeechRate: (speechRate) => set({ speechRate }),
  setAutoSpeak: (autoSpeak) => set({ autoSpeak }),
  setVibrationEnabled: (vibrationEnabled) => set({ vibrationEnabled }),
});
