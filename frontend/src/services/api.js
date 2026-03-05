import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

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
        "Cannot reach backend API. Check VITE_API_BASE_URL and ensure the backend is running.",
      );
    }
    throw new Error(
      error.response?.data?.error || "Failed to fetch random job",
    );
  }
}
