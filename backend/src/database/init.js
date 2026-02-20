import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { mkdirSync, existsSync } from "fs";
import { summarizeJobDescription } from "../utils/descriptionSummary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH =
  process.env.DATABASE_URL || resolve(__dirname, "../../data/jobs.sqlite");

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);

export function initDatabase() {
  console.log("📦 Initializing database...");

  // Create external_job_listings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS external_job_listings (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'adzuna',
      title TEXT NOT NULL,
      description TEXT,
      description_summary TEXT,
      company_name TEXT,
      location_display TEXT,
      location_area TEXT,
      latitude REAL,
      longitude REAL,
      category_label TEXT,
      category_tag TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      salary_predicted INTEGER DEFAULT 0,
      contract_time TEXT,
      contract_type TEXT,
      redirect_url TEXT NOT NULL,
      posted_at DATETIME,
      fetched_at DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1,
      derived_trade TEXT
    );
  `);

  // Backward-compatible migration for existing SQLite databases.
  const tableInfo = db
    .prepare("PRAGMA table_info('external_job_listings')")
    .all();
  const hasDescriptionSummary = tableInfo.some(
    (column) => column.name === "description_summary",
  );
  if (!hasDescriptionSummary) {
    db.exec(
      "ALTER TABLE external_job_listings ADD COLUMN description_summary TEXT;",
    );
  }

  const jobsNeedingSummary = db
    .prepare(
      `
    SELECT
      id, title, description, company_name, location_display, category_label,
      derived_trade, contract_type, contract_time, salary_min, salary_max
    FROM external_job_listings
    WHERE description IS NOT NULL
      AND TRIM(description) != ''
      AND (description_summary IS NULL OR TRIM(description_summary) = '')
  `,
    )
    .all();

  if (jobsNeedingSummary.length > 0) {
    const updateSummaryStmt = db.prepare(`
      UPDATE external_job_listings
      SET description_summary = ?
      WHERE id = ?
    `);

    const updateMany = db.transaction((rows) => {
      for (const row of rows) {
        const summary = summarizeJobDescription(
          row.description,
          row.title || "",
          {
            company_name: row.company_name,
            location_display: row.location_display,
            category_label: row.category_label,
            derived_trade: row.derived_trade,
            contract_type: row.contract_type,
            contract_time: row.contract_time,
            salary_min: row.salary_min,
            salary_max: row.salary_max,
          },
        );
        updateSummaryStmt.run(summary, row.id);
      }
    });

    updateMany(jobsNeedingSummary);
    console.log(
      `📝 Backfilled summaries for ${jobsNeedingSummary.length} jobs`,
    );
  }

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_is_active ON external_job_listings(is_active);
    CREATE INDEX IF NOT EXISTS idx_posted_at ON external_job_listings(posted_at);
    CREATE INDEX IF NOT EXISTS idx_category_tag ON external_job_listings(category_tag);
    CREATE INDEX IF NOT EXISTS idx_derived_trade ON external_job_listings(derived_trade);
    CREATE INDEX IF NOT EXISTS idx_fetched_at ON external_job_listings(fetched_at);
  `);

  console.log("✅ Database initialized successfully");
}
