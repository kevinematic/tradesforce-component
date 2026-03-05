import { useCallback, useEffect, useRef, useState } from "react";
import JobCard from "./JobCard";
import JobSearchForm from "./JobSearchForm";
import { fetchRandomJob, fetchNearbyJobs } from "../services/api";
import "./JobFeed.css";

const CARD_COUNT = 3;

const JobFeed = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useRef(null);
  const resetFormRef = useRef(null);

  const loadRandomJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        Array.from({ length: CARD_COUNT }, () => fetchRandomJob()),
      );
      setJobs(results.filter(Boolean));
    } catch (err) {
      setError(err.message || "Failed to load jobs");
      console.error("Error loading random jobs:", err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNearbyJobs = useCallback(async (params) => {
    setLoading(true);
    setError(null);

    try {
      const results = await fetchNearbyJobs({
        lat: params.lat,
        lng: params.lng,
        radius: params.radius,
        count: CARD_COUNT,
      });
      setJobs(results);
    } catch (err) {
      setError(err.message || "Failed to load nearby jobs");
      console.error("Error loading nearby jobs:", err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRandomJobs();
  }, [loadRandomJobs]);

  const handleSearch = useCallback(
    (params) => {
      searchParams.current = params;
      loadNearbyJobs(params);
    },
    [loadNearbyJobs],
  );

  const handleShuffle = useCallback(() => {
    if (searchParams.current) {
      loadNearbyJobs(searchParams.current);
    } else {
      loadRandomJobs();
    }
  }, [loadNearbyJobs, loadRandomJobs]);

  const handleClear = useCallback(() => {
    searchParams.current = null;
    if (resetFormRef.current) resetFormRef.current();
    loadRandomJobs();
  }, [loadRandomJobs]);

  const handleClearRef = useCallback((resetFn) => {
    resetFormRef.current = resetFn;
  }, []);

  const isSearchMode = searchParams.current !== null;

  return (
    <div className="job-feed">
      <JobSearchForm onSearch={handleSearch} onClear={handleClearRef} loading={loading} />

      <div className="feed-controls">
        <button
          onClick={handleShuffle}
          className="pagination-btn"
          disabled={loading}
        >
          {loading
            ? "Loading..."
            : isSearchMode
              ? "Shuffle Nearby"
              : "Show Other Jobs"}
        </button>
        {isSearchMode && (
          <button
            onClick={handleClear}
            className="pagination-btn clear-btn"
            disabled={loading}
          >
            Clear
          </button>
        )}
      </div>

      {isSearchMode && !loading && (
        <p className="search-context">
          Showing jobs near{" "}
          <strong>{searchParams.current.displayName}</strong> within{" "}
          {searchParams.current.radius} miles
        </p>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading jobs...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={handleShuffle} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && jobs.length > 0 && (
        <div className="jobs-grid">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="empty-state">
          <p>
            {isSearchMode
              ? "No jobs found in this area. Try a larger radius or different location."
              : "No jobs available right now."}
          </p>
        </div>
      )}
    </div>
  );
};

export default JobFeed;
