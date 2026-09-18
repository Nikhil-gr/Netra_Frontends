import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../../api/health/healthApi.js'
import { queryKeys } from '../queryKeys.js'

export function useHealth() { return useQuery({ queryKey: queryKeys.health, queryFn: getHealth }) }
