import { supabase } from "./supabase.js";

const TABLE = "external_job_listings";

export async function initDatabase() {
  console.log("Checking Supabase connection...");
  const { error } = await supabase.from(TABLE).select("id").limit(1);
  if (error) {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }
  console.log("Supabase connected successfully");
}

export async function getJobs({
  trade,
  location,
  contractType,
  contractTime,
  sort = "date",
  page = 1,
  perPage = 20,
}) {
  let query = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .eq("is_active", true);

  if (trade) {
    query = query.or(
      `derived_trade.ilike.%${trade}%,title.ilike.%${trade}%`,
    );
  }
  if (location) {
    query = query.ilike("location_display", `%${location}%`);
  }
  if (contractType) {
    query = query.eq("contract_type", contractType);
  }
  if (contractTime) {
    query = query.eq("contract_time", contractTime);
  }

  if (sort === "salary") {
    query = query
      .order("salary_max", { ascending: false, nullsFirst: false })
      .order("salary_min", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("posted_at", { ascending: false });
  }

  const offset = (page - 1) * perPage;
  query = query.range(offset, offset + perPage - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  return { jobs: data || [], total: count || 0 };
}

export async function getRandomJob() {
  // Supabase doesn't support ORDER BY RANDOM() directly,
  // so we fetch a count and pick a random offset.
  const { count, error: countError } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (countError) throw countError;
  if (!count || count === 0) return null;

  const randomOffset = Math.floor(Math.random() * count);

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("is_active", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .range(randomOffset, randomOffset)
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

export async function getJobById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null; // not found
  if (error) throw error;
  return data;
}

export async function getStatsSummary() {
  const { data: stats, error: statsError } = await supabase
    .from(TABLE)
    .select("salary_min, salary_max")
    .eq("is_active", true);

  if (statsError) throw statsError;

  const totalJobs = stats.length;
  const salaryMins = stats
    .map((j) => j.salary_min)
    .filter((v) => v != null);
  const salaryMaxes = stats
    .map((j) => j.salary_max)
    .filter((v) => v != null);
  const avgSalaryMin =
    salaryMins.length > 0
      ? salaryMins.reduce((a, b) => a + b, 0) / salaryMins.length
      : null;
  const avgSalaryMax =
    salaryMaxes.length > 0
      ? salaryMaxes.reduce((a, b) => a + b, 0) / salaryMaxes.length
      : null;

  const { data: tradeRows, error: tradeError } = await supabase.rpc(
    "get_trade_breakdown",
  );

  // Fallback if the RPC doesn't exist: compute in JS
  let tradeBreakdown;
  if (tradeError) {
    const tradeCounts = {};
    for (const job of stats) {
      // We don't have derived_trade in the salary query, re-fetch
    }
    // If RPC fails, do a separate query
    const { data: tradeData } = await supabase
      .from(TABLE)
      .select("derived_trade")
      .eq("is_active", true);

    const counts = {};
    for (const row of tradeData || []) {
      const t = row.derived_trade || "Unknown";
      counts[t] = (counts[t] || 0) + 1;
    }
    tradeBreakdown = Object.entries(counts)
      .map(([derived_trade, count]) => ({ derived_trade, count }))
      .sort((a, b) => b.count - a.count);
  } else {
    tradeBreakdown = tradeRows;
  }

  const trades = new Set(
    (tradeBreakdown || []).map((t) => t.derived_trade),
  );

  return {
    total_jobs: totalJobs,
    total_trades: trades.size,
    avg_salary_min: avgSalaryMin,
    avg_salary_max: avgSalaryMax,
    trade_breakdown: tradeBreakdown || [],
  };
}

export async function upsertJob(job) {
  const { error } = await supabase.from(TABLE).upsert(job, {
    onConflict: "id",
  });
  if (error) throw error;
}

export async function markStaleJobsInactive() {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - 48);

  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_active: false })
    .lt("fetched_at", cutoffTime.toISOString())
    .eq("is_active", true)
    .select("id");

  if (error) throw error;
  return data?.length || 0;
}

export async function checkJobExists(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
