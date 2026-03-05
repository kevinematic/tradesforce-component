import { useState } from "react";
import { geocodeAddress } from "../utils/geocode";
import "./JobSearchForm.css";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

const JobSearchForm = ({ onSearch, loading }) => {
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState(25);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;

    setGeocoding(true);
    setError(null);

    try {
      const result = await geocodeAddress(trimmed);
      if (!result) {
        setError("Location not found. Try a more specific address.");
        return;
      }
      onSearch({ lat: result.lat, lng: result.lng, radius, displayName: result.displayName });
    } catch {
      setError("Geocoding failed. Please try again.");
    } finally {
      setGeocoding(false);
    }
  };

  const busy = geocoding || loading;

  return (
    <form className="job-search-form" onSubmit={handleSubmit}>
      <div className="search-fields">
        <div className="field-group field-address">
          <label htmlFor="search-address">Location</label>
          <input
            id="search-address"
            type="text"
            placeholder="City, state, or zip code"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="field-group field-radius">
          <label htmlFor="search-radius">Radius</label>
          <select
            id="search-radius"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            disabled={busy}
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} miles
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="search-btn" disabled={busy || !address.trim()}>
          {geocoding ? "Finding..." : "Search"}
        </button>
      </div>
      {error && <p className="search-error">{error}</p>}
    </form>
  );
};

export default JobSearchForm;
