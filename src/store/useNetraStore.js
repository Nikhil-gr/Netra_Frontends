import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSessionSlice } from './slices/sessionSlice.js'
import { createResultSlice } from './slices/resultSlice.js'
import { createPreferencesSlice } from './slices/preferencesSlice.js'

export const useNetraStore = create(
  persist(
    (...args) => ({
      ...createSessionSlice(...args),
      ...createResultSlice(...args),
      ...createPreferencesSlice(...args),
    }),
    {
      name: 'netra-preferences',
      partialize: ({ language, speechRate, autoSpeak, vibrationEnabled }) => ({
        language,
        speechRate,
        autoSpeak,
        vibrationEnabled,
      }),
    },
  ),
)
