export const createSessionSlice = (set) => ({
  findQuery: "",
  walkDestination: null,
  walkRoute: null,
  walkStepIndex: 0,
  walkAssistActive: false,
  walkAssistPaused: false,
  walkLastCue: "",

  setFindQuery: (findQuery) => set({ findQuery }),

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

  clearWalkAssist: () =>
    set({
      walkDestination: null,
      walkRoute: null,
      walkStepIndex: 0,
      walkAssistActive: false,
      walkAssistPaused: false,
      walkLastCue: "",
    }),
});
