import { useCallback, useEffect, useState } from "react";
import JobCard from "./JobCard";
import { fetchRandomJob } from "../services/api";
import "./JobFeed.css";

const JobFeed = () => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRandomJob = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchRandomJob();
      setJob(data);
    } catch (err) {
      setError(err.message || "Failed to load random job");
      console.error("Error loading random job:", err);
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRandomJob();
  }, [loadRandomJob]);

  return (
    <div className="job-feed">
      <div className="single-job-controls">
        <button
          onClick={loadRandomJob}
          className="pagination-btn"
          disabled={loading}
        >
          {loading ? "Loading..." : "Show Another Job"}
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading random job...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={loadRandomJob} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        (job ? (
          <div className="single-job-wrapper">
            <JobCard key={job.id} job={job} />
          </div>
        ) : (
          <div className="empty-state">
            <p>No jobs available right now.</p>
          </div>
        ))}
    </div>
  );
};

export default JobFeed;
