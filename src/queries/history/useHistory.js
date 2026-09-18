import { useQuery } from '@tanstack/react-query'
import { getHistory } from '../../api/history/historyApi.js'
import { queryKeys } from '../queryKeys.js'

export function useHistory(params) {
  return useQuery({ queryKey: queryKeys.history(params), queryFn: () => getHistory(params) })
}
