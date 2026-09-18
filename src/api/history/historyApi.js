import { apiClient } from '../client.js'

export async function getHistory(params) {
  const { data } = await apiClient.get('/history', { params })
  return data
}
