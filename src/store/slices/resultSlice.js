export const createResultSlice = (set) => ({
  currentResult: null,
  setCurrentResult: (currentResult) => set({ currentResult }),
  clearCurrentResult: () => set({ currentResult: null }),
});
