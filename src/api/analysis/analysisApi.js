import { apiClient } from "../client.js";

export async function analyzeImage({
  image,
  mode,
  query = "",
  language = "en",
  saveHistory = false,
}) {
  const formData = new FormData();

  formData.append("image", image, "capture.jpg");

  formData.append("mode", mode);

  formData.append("language", language);

  formData.append("saveHistory", String(saveHistory));

  if (mode === "find" && query.trim()) {
    formData.append("query", query.trim());
  }

  const { data } = await apiClient.post("/analyze", formData);

  return data.data;
}
