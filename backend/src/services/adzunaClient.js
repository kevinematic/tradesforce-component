import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";
const COUNTRY = "us";

export class AdzunaClient {
  constructor() {
    this.appId = process.env.ADZUNA_APP_ID;
    this.appKey = process.env.ADZUNA_APP_KEY;

    if (!this.appId || !this.appKey) {
      throw new Error(
        "ADZUNA_APP_ID and ADZUNA_APP_KEY must be set in environment variables",
      );
    }
  }

  /**
   * Search for jobs using Adzuna API
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchJobs(params = {}) {
    const {
      what = "",
      where = "",
      category = "trade-construction-jobs",
      page = 1,
      resultsPerPage = 20,
      sortBy = "date",
      maxDaysOld = 30,
      salaryMin = null,
      salaryMax = null,
      fullTime = null,
      partTime = null,
      permanent = null,
      contract = null,
      distance = null,
    } = params;

    const url = `${ADZUNA_BASE_URL}/${COUNTRY}/search/${page}`;

    const queryParams = {
      app_id: this.appId,
      app_key: this.appKey,
      results_per_page: resultsPerPage,
      "content-type": "application/json",
    };

    // Add optional parameters
    if (what) queryParams.what = what;
    if (where) queryParams.where = where;
    if (category) queryParams.category = category;
    if (sortBy) queryParams.sort_by = sortBy;
    if (maxDaysOld) queryParams.max_days_old = maxDaysOld;
    if (salaryMin) queryParams.salary_min = salaryMin;
    if (salaryMax) queryParams.salary_max = salaryMax;
    if (fullTime) queryParams.full_time = fullTime;
    if (partTime) queryParams.part_time = partTime;
    if (permanent) queryParams.permanent = permanent;
    if (contract) queryParams.contract = contract;
    if (distance) queryParams.distance = distance;

    try {
      const response = await axios.get(url, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error("Adzuna API Error:", error.response?.data || error.message);
      throw error;
    }
  }
}

export default new AdzunaClient();
