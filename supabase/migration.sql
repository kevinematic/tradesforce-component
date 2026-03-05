-- Run this in the Supabase SQL Editor to create the table and indexes.

CREATE TABLE IF NOT EXISTS external_job_listings (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'adzuna',
  title TEXT NOT NULL,
  description TEXT,
  description_summary TEXT,
  company_name TEXT,
  location_display TEXT,
  location_area TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  category_label TEXT,
  category_tag TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_predicted BOOLEAN DEFAULT FALSE,
  contract_time TEXT,
  contract_type TEXT,
  redirect_url TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  derived_trade TEXT
);

CREATE INDEX IF NOT EXISTS idx_is_active ON external_job_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_posted_at ON external_job_listings(posted_at);
CREATE INDEX IF NOT EXISTS idx_category_tag ON external_job_listings(category_tag);
CREATE INDEX IF NOT EXISTS idx_derived_trade ON external_job_listings(derived_trade);
CREATE INDEX IF NOT EXISTS idx_fetched_at ON external_job_listings(fetched_at);
