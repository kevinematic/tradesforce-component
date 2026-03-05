import { schedule } from "@netlify/functions";
import dotenv from "dotenv";

dotenv.config();

const syncHandler = async () => {
  // Dynamic import to ensure env vars are loaded first
  const { initDatabase } = await import("../../backend/src/database/init.js");
  const { syncAllJobs } = await import("../../backend/src/jobs/syncJobs.js");

  console.log("Scheduled sync starting...");

  try {
    await initDatabase();
    await syncAllJobs();
    console.log("Scheduled sync completed");
    return { statusCode: 200 };
  } catch (error) {
    console.error("Scheduled sync failed:", error);
    return { statusCode: 500 };
  }
};

// Run every 2 hours
export const handler = schedule("0 */2 * * *", syncHandler);
