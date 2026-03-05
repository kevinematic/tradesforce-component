import {
  upsertJob,
  markStaleJobsInactive,
  checkJobExists,
} from "../database/init.js";
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
 * Build a row object for upserting into Supabase
 */
function buildJobRow(job) {
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

  return {
    id: job.id,
    source: "adzuna",
    title: job.title,
    description: job.description || null,
    description_summary: descriptionSummary,
    company_name: job.company?.display_name || null,
    location_display: job.location?.display_name || null,
    location_area: locationArea,
    latitude: job.latitude || null,
    longitude: job.longitude || null,
    category_label: job.category?.label || null,
    category_tag: job.category?.tag || null,
    salary_min: job.salary_min || null,
    salary_max: job.salary_max || null,
    salary_predicted: Boolean(job.salary_is_predicted),
    contract_time: job.contract_time || null,
    contract_type: job.contract_type || null,
    redirect_url: job.redirect_url,
    posted_at: job.created || null,
    fetched_at: new Date().toISOString(),
    is_active: true,
    derived_trade: derivedTrade,
  };
}

/**
 * Sync jobs for a single query
 */
async function syncQuery(query, delay = 1000) {
  console.log(`  Fetching jobs for: ${query.what}`);

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
        const exists = await checkJobExists(job.id);
        const row = buildJobRow(job);
        await upsertJob(row);

        if (exists) {
          updatedCount++;
        } else {
          insertedCount++;
        }
      } catch (error) {
        console.error(`    Error upserting job ${job.id}:`, error.message);
      }
    }

    console.log(
      `    ${query.what}: ${insertedCount} new, ${updatedCount} updated`,
    );

    // Rate limiting: delay between requests
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return { insertedCount, updatedCount, total: results.count };
  } catch (error) {
    console.error(`    Error fetching ${query.what}:`, error.message);
    return { insertedCount: 0, updatedCount: 0, total: 0 };
  }
}

/**
 * Sync all trade job queries
 */
export async function syncAllJobs() {
  console.log("Starting job sync...");
  const startTime = Date.now();

  let totalInserted = 0;
  let totalUpdated = 0;

  for (const query of TRADE_QUERIES) {
    const result = await syncQuery(query);
    totalInserted += result.insertedCount;
    totalUpdated += result.updatedCount;
  }

  // Mark stale jobs as inactive
  const inactiveCount = await markStaleJobsInactive();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("Sync complete!");
  console.log(
    `  Total: ${totalInserted} new, ${totalUpdated} updated, ${inactiveCount} marked inactive`,
  );
  console.log(`  Duration: ${duration}s`);
}

// Allow running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  import("dotenv").then((dotenv) => {
    dotenv.config();
    import("../database/init.js").then(({ initDatabase }) => {
      initDatabase()
        .then(() => syncAllJobs())
        .then(() => process.exit(0))
        .catch((error) => {
          console.error("Sync failed:", error);
          process.exit(1);
        });
    });
  });
}
