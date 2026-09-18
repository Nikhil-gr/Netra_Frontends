import { useMutation } from '@tanstack/react-query'
import { analyzeImage } from '../../api/analysis/analysisApi.js'

export function useAnalyzeImage() { return useMutation({ mutationFn: analyzeImage }) }
