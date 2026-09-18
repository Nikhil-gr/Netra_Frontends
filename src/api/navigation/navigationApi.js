import { apiClient } from "../client.js";

export async function searchDestinations(query) {
  const cleanedQuery = query.trim();

  if (!cleanedQuery) {
    return [];
  }

  const { data } = await apiClient.get("/navigation/search", {
    params: {
      q: cleanedQuery,
    },
  });

  return Array.isArray(data?.data?.items) ? data.data.items : [];
}

export async function getWalkingRoute({ start, destination }) {
  const { data } = await apiClient.post("/navigation/route", {
    start,
    destination,
  });

  return data.data;
}
