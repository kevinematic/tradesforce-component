import express from "express";
import {
  getJobs,
  getRandomJob,
  getJobById,
  getJobsByRadius,
  getStatsSummary,
} from "../database/init.js";

const router = express.Router();
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 50;
const MAX_FILTER_LENGTH = 100;
const ALLOWED_SORTS = new Set(["date", "salary", "relevance"]);
const ALLOWED_CONTRACT_TYPES = new Set(["permanent", "contract"]);
const ALLOWED_CONTRACT_TIMES = new Set(["full_time", "part_time"]);

function normalizeFilter(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_FILTER_LENGTH);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parseLocationArea(locationArea) {
  if (!locationArea) return null;
  try {
    return JSON.parse(locationArea);
  } catch {
    return null;
  }
}

function parseJob(job) {
  const { description_summary, ...rest } = job;
  return {
    ...rest,
    description: description_summary || job.description,
    location_area: parseLocationArea(job.location_area),
    salary_predicted: Boolean(job.salary_predicted),
    is_active: Boolean(job.is_active),
  };
}

/**
 * GET /api/external-jobs
 * Get paginated list of external job listings with filters
 */
router.get("/", async (req, res) => {
  try {
    const trade = normalizeFilter(req.query.trade);
    const location = normalizeFilter(req.query.location);
    const contractType = normalizeFilter(req.query.contract_type);
    const contractTime = normalizeFilter(req.query.contract_time);
    const sort = ALLOWED_SORTS.has(req.query.sort) ? req.query.sort : "date";
    const pageNum = parsePositiveInt(req.query.page, 1);
    const perPage = Math.min(
      parsePositiveInt(req.query.per_page, DEFAULT_PER_PAGE),
      MAX_PER_PAGE,
    );

    const { jobs, total } = await getJobs({
      trade: trade || undefined,
      location: location || undefined,
      contractType: ALLOWED_CONTRACT_TYPES.has(contractType)
        ? contractType
        : undefined,
      contractTime: ALLOWED_CONTRACT_TIMES.has(contractTime)
        ? contractTime
        : undefined,
      sort,
      page: pageNum,
      perPage,
    });

    const parsedJobs = jobs.map(parseJob);

    res.json({
      jobs: parsedJobs,
      pagination: {
        page: pageNum,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error("Error fetching external jobs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/external-jobs/random
 * Get one random active external job listing
 */
router.get("/random", async (req, res) => {
  try {
    const job = await getRandomJob();

    if (!job) {
      return res.status(404).json({ error: "No jobs found" });
    }

    res.json(parseJob(job));
  } catch (error) {
    console.error("Error fetching random job:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const ALLOWED_RADII = new Set([5, 10, 25, 50, 100]);
const MAX_NEARBY_COUNT = 10;

/**
 * GET /api/external-jobs/nearby
 * Find jobs within a radius of given coordinates
 */
router.get("/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius, 10) || 25;
    const count = Math.min(
      parsePositiveInt(req.query.count, 3),
      MAX_NEARBY_COUNT,
    );

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: "Invalid lat (must be -90 to 90)" });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res
        .status(400)
        .json({ error: "Invalid lng (must be -180 to 180)" });
    }
    if (!ALLOWED_RADII.has(radius)) {
      return res
        .status(400)
        .json({ error: "Invalid radius (allowed: 5, 10, 25, 50, 100)" });
    }

    const jobs = await getJobsByRadius({
      lat,
      lng,
      radiusMiles: radius,
      count,
    });

    res.json({ jobs: jobs.map(parseJob) });
  } catch (error) {
    console.error("Error fetching nearby jobs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/external-jobs/:id
 * Get a single external job listing by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id || id.length > 64) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    const job = await getJobById(id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(parseJob(job));
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/external-jobs/stats/summary
 * Get summary statistics
 */
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await getStatsSummary();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
