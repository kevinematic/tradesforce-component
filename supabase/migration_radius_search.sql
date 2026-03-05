-- Radius search function using Haversine formula
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION search_jobs_by_radius(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 25,
  result_count INTEGER DEFAULT 3
)
RETURNS SETOF external_job_listings
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM external_job_listings
  WHERE is_active = true
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND (
      3959 * acos(
        LEAST(1.0,
          cos(radians(search_lat))
          * cos(radians(latitude))
          * cos(radians(longitude) - radians(search_lng))
          + sin(radians(search_lat))
          * sin(radians(latitude))
        )
      )
    ) <= radius_miles
  ORDER BY random()
  LIMIT result_count;
$$;
