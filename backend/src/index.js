import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { initDatabase } from "./database/init.js";
import externalJobsRouter from "./routes/externalJobs.js";
import { syncAllJobs } from "./jobs/syncJobs.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://not-tradesforce.onrender.com",
  "https://tradesforce-component-1.onrender.com",
];
const configuredOrigins = [process.env.CORS_ORIGIN, process.env.FRONTEND_URL]
  .filter(Boolean)
  .flatMap((originList) => originList.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

app.disable("x-powered-by");

// Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server/no-origin requests.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET"],
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json({ limit: "100kb" }));

// Initialize database
initDatabase();

// Routes
app.use("/api/external-jobs", externalJobsRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS origin denied" });
  }

  if (err) {
    console.error("Unhandled server error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }

  return next();
});

// Schedule sync job
const parsedSyncHours = Number.parseInt(
  process.env.SYNC_INTERVAL_HOURS || "2",
  10,
);
const SYNC_INTERVAL_HOURS =
  Number.isFinite(parsedSyncHours) &&
  parsedSyncHours >= 1 &&
  parsedSyncHours <= 24
    ? parsedSyncHours
    : 2;
const cronExpression = `0 */${SYNC_INTERVAL_HOURS} * * *`; // Every N hours

console.log(`🔄 Scheduling sync job to run every ${SYNC_INTERVAL_HOURS} hours`);

cron.schedule(cronExpression, async () => {
  console.log("⏰ Running scheduled job sync...");
  try {
    await syncAllJobs();
    console.log("✅ Scheduled sync completed");
  } catch (error) {
    console.error("❌ Scheduled sync failed:", error);
  }
});

// Run initial sync on startup (optional)
if (process.env.SYNC_ON_STARTUP !== "false") {
  console.log("🚀 Running initial job sync...");
  syncAllJobs().catch(console.error);
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
});
