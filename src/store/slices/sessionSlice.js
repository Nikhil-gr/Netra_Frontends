export const createSessionSlice = (set) => ({
  findQuery: "",
  walkInitialLocation: null,
  walkDestination: null,
  walkRoute: null,
  walkStepIndex: 0,
  walkAssistActive: false,
  walkAssistPaused: false,
  walkLastCue: "",

  setFindQuery: (findQuery) => set({ findQuery }),

  setWalkInitialLocation: (walkInitialLocation) => set({ walkInitialLocation }),

  setWalkDestination: (walkDestination) => set({ walkDestination }),

  setWalkRoute: (walkRoute) =>
    set({
      walkRoute,
      walkStepIndex: 0,
    }),

  setWalkStepIndex: (walkStepIndex) => set({ walkStepIndex }),

  setWalkAssistActive: (walkAssistActive) => set({ walkAssistActive }),

  setWalkAssistPaused: (walkAssistPaused) => set({ walkAssistPaused }),

  setWalkLastCue: (walkLastCue) => set({ walkLastCue }),

  resetWalkRoute: () =>
    set({
      walkDestination: null,
      walkRoute: null,
      walkStepIndex: 0,
      walkAssistActive: false,
      walkAssistPaused: false,
      walkLastCue: "",
    }),

  clearWalkAssist: () =>
    set({
      walkInitialLocation: null,
      walkDestination: null,
      walkRoute: null,
      walkStepIndex: 0,
      walkAssistActive: false,
      walkAssistPaused: false,
      walkLastCue: "",
    }),
});
