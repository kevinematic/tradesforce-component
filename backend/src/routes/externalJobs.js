import express from "express";
import { db } from "../database/init.js";

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
router.get("/", (req, res) => {
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
    const offset = (pageNum - 1) * perPage;

    // Build WHERE clause
    const conditions = ["is_active = 1"];
    const params = [];

    if (trade) {
      conditions.push("(derived_trade LIKE ? OR title LIKE ?)");
      params.push(`%${trade}%`, `%${trade}%`);
    }

    if (location) {
      conditions.push("location_display LIKE ?");
      params.push(`%${location}%`);
    }

    if (ALLOWED_CONTRACT_TYPES.has(contractType)) {
      conditions.push("contract_type = ?");
      params.push(contractType);
    }

    if (ALLOWED_CONTRACT_TIMES.has(contractTime)) {
      conditions.push("contract_time = ?");
      params.push(contractTime);
    }

    const whereClause = conditions.join(" AND ");

    // Build ORDER BY clause
    let orderBy = "posted_at DESC";
    if (sort === "salary") {
      orderBy = "salary_max DESC NULLS LAST, salary_min DESC NULLS LAST";
    } else if (sort === "relevance") {
      orderBy = "posted_at DESC"; // Could implement more complex relevance scoring
    }

    // Get total count
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM external_job_listings
      WHERE ${whereClause}
    `);
    const { total } = countStmt.get(...params);

    // Get jobs
    const jobsStmt = db.prepare(`
      SELECT *
      FROM external_job_listings
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `);

    const jobs = jobsStmt.all(...params, perPage, offset);

    // Parse location_area JSON
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
router.get("/random", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT *
      FROM external_job_listings
      WHERE is_active = 1
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 1
    `);
    const job = stmt.get();

    if (!job) {
      return res.status(404).json({ error: "No jobs found" });
    }

    res.json(parseJob(job));
  } catch (error) {
    console.error("Error fetching random job:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/external-jobs/:id
 * Get a single external job listing by ID
 */
router.get("/:id", (req, res) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id || id.length > 64) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    const stmt = db.prepare("SELECT * FROM external_job_listings WHERE id = ?");
    const job = stmt.get(id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Parse location_area JSON
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
router.get("/stats/summary", (req, res) => {
  try {
    const stats = db
      .prepare(
        `
      SELECT
        COUNT(*) as total_jobs,
        COUNT(DISTINCT derived_trade) as total_trades,
        AVG(salary_min) as avg_salary_min,
        AVG(salary_max) as avg_salary_max
      FROM external_job_listings
      WHERE is_active = 1
    `,
      )
      .get();

    const tradeBreakdown = db
      .prepare(
        `
      SELECT derived_trade, COUNT(*) as count
      FROM external_job_listings
      WHERE is_active = 1
      GROUP BY derived_trade
      ORDER BY count DESC
    `,
      )
      .all();

    res.json({
      ...stats,
      trade_breakdown: tradeBreakdown,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
