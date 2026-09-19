import axios from "axios";

const API_BASE_URL = import.meta.env.NETRA_API_URL || "/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});
