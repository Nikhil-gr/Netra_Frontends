import { apiClient } from '../client.js'

export async function analyzeImage(formData) {
  const { data } = await apiClient.post('/analyze', formData)
  return data
}
