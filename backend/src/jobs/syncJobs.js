import { db } from "../database/init.js";
import adzunaClient from "../services/adzunaClient.js";
import { inferTrade } from "../utils/tradeInference.js";
import { summarizeJobDescription } from "../utils/descriptionSummary.js";

const TRADE_QUERIES = [
  { what: "plumber" },
  { what: "electrician" },
  { what: "carpenter" },
  { what: "locksmith" },
  { what: "HVAC" },
  { what: "welder" },
  { what: "roofer" },
  { what: "painter" },
  { what: "mason" },
  { what: "construction" },
  { what: "general contractor" },
  { what: "drywall" },
  { what: "flooring installer" },
  { what: "heavy equipment operator" },
];

const RESULTS_PER_PAGE = Number.parseInt(
  process.env.RESULTS_PER_PAGE || "20",
  10,
);
const MAX_DAYS_OLD = Number.parseInt(process.env.MAX_DAYS_OLD || "30", 10);

/**
 * Upsert a job listing into the database
 */
function upsertJob(job) {
  const stmt = db.prepare(`
    INSERT INTO external_job_listings (
      id, source, title, description, description_summary, company_name, location_display,
      location_area, latitude, longitude, category_label, category_tag,
      salary_min, salary_max, salary_predicted, contract_time, contract_type,
      redirect_url, posted_at, fetched_at, is_active, derived_trade
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      description_summary = excluded.description_summary,
      company_name = excluded.company_name,
      location_display = excluded.location_display,
      salary_min = excluded.salary_min,
      salary_max = excluded.salary_max,
      salary_predicted = excluded.salary_predicted,
      contract_time = excluded.contract_time,
      contract_type = excluded.contract_type,
      fetched_at = excluded.fetched_at,
      is_active = 1
  `);

  const locationArea = job.location?.area
    ? JSON.stringify(job.location.area)
    : null;
  const derivedTrade = inferTrade(job.title);
  const descriptionSummary = summarizeJobDescription(
    job.description || null,
    job.title || "",
    {
      company_name: job.company?.display_name || null,
      location_display: job.location?.display_name || null,
      category_label: job.category?.label || null,
      derived_trade: derivedTrade,
      contract_type: job.contract_type || null,
      contract_time: job.contract_time || null,
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
    },
  );

  stmt.run(
    job.id,
    "adzuna",
    job.title,
    job.description || null,
    descriptionSummary,
    job.company?.display_name || null,
    job.location?.display_name || null,
    locationArea,
    job.latitude || null,
    job.longitude || null,
    job.category?.label || null,
    job.category?.tag || null,
    job.salary_min || null,
    job.salary_max || null,
    job.salary_is_predicted || 0,
    job.contract_time || null,
    job.contract_type || null,
    job.redirect_url,
    job.created || null,
    new Date().toISOString(),
    1,
    derivedTrade,
  );
}

/**
 * Mark stale jobs as inactive
 */
function markStaleJobsInactive() {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - 48); // 48 hours ago

  const stmt = db.prepare(`
    UPDATE external_job_listings
    SET is_active = 0
    WHERE fetched_at < ? AND is_active = 1
  `);

  const result = stmt.run(cutoffTime.toISOString());
  return result.changes;
}

/**
 * Sync jobs for a single query
 */
async function syncQuery(query, delay = 1000) {
  console.log(`  🔍 Fetching jobs for: ${query.what}`);

  try {
    const results = await adzunaClient.searchJobs({
      ...query,
      category: "trade-construction-jobs",
      resultsPerPage: RESULTS_PER_PAGE,
      maxDaysOld: MAX_DAYS_OLD,
      sortBy: "date",
    });

    let insertedCount = 0;
    let updatedCount = 0;

    for (const job of results.results || []) {
      try {
        const existingJob = db
          .prepare("SELECT id FROM external_job_listings WHERE id = ?")
          .get(job.id);
        upsertJob(job);

        if (existingJob) {
          updatedCount++;
        } else {
          insertedCount++;
        }
      } catch (error) {
        console.error(`    ❌ Error upserting job ${job.id}:`, error.message);
      }
    }

    console.log(
      `    ✅ ${query.what}: ${insertedCount} new, ${updatedCount} updated`,
    );

    // Rate limiting: delay between requests
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return { insertedCount, updatedCount, total: results.count };
  } catch (error) {
    console.error(`    ❌ Error fetching ${query.what}:`, error.message);
    return { insertedCount: 0, updatedCount: 0, total: 0 };
  }
}

/**
 * Sync all trade job queries
 */
export async function syncAllJobs() {
  console.log("🔄 Starting job sync...");
  const startTime = Date.now();

  let totalInserted = 0;
  let totalUpdated = 0;

  for (const query of TRADE_QUERIES) {
    const result = await syncQuery(query);
    totalInserted += result.insertedCount;
    totalUpdated += result.updatedCount;
  }

  // Mark stale jobs as inactive
  const inactiveCount = markStaleJobsInactive();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("✅ Sync complete!");
  console.log(
    `  📊 Total: ${totalInserted} new, ${totalUpdated} updated, ${inactiveCount} marked inactive`,
  );
  console.log(`  ⏱️  Duration: ${duration}s`);
}

// Allow running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  import("../database/init.js").then(({ initDatabase }) => {
    initDatabase();
    syncAllJobs()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("❌ Sync failed:", error);
        process.exit(1);
      });
  });
}
