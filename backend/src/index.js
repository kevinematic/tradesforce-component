import express from "express";
import dotenv from "dotenv";
import { initDatabase } from "./database/init.js";
import externalJobsRouter from "./routes/externalJobs.js";

dotenv.config();

const app = express();

app.disable("x-powered-by");

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
});

app.use(express.json({ limit: "100kb" }));

// Initialize database (async — runs on first request via middleware)
let dbReady = false;
app.use(async (req, res, next) => {
  if (!dbReady) {
    try {
      await initDatabase();
      dbReady = true;
    } catch (error) {
      console.error("Database init failed:", error);
      return res.status(500).json({ error: "Database unavailable" });
    }
  }
  next();
});

// Routes
app.use("/api/external-jobs", externalJobsRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Also support /health for backwards compat
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  if (err) {
    console.error("Unhandled server error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
  return next();
});

export default app;
