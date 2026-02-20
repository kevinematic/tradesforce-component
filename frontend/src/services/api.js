import axios from "axios";

const PROD_FALLBACK_API_BASE_URL =
  "https://tradesforce-component.onrender.com/api";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? PROD_FALLBACK_API_BASE_URL : "/api");

/**
 * Fetch one random active job
 */
export async function fetchRandomJob() {
  try {
    const response = await axios.get(`${API_BASE_URL}/external-jobs/random`);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    if (error.request && !error.response) {
      throw new Error(
        "Cannot reach backend API. Check VITE_API_BASE_URL and backend CORS_ORIGIN.",
      );
    }
    throw new Error(
      error.response?.data?.error || "Failed to fetch random job",
    );
  }
}
