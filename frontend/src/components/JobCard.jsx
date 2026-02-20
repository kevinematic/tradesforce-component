import { useMemo, useState } from "react";
import {
  formatPostedDate,
  formatSalary,
  formatContractInfo,
} from "../utils/formatters";
import "./JobCard.css";

const JobCard = ({ job }) => {
  const {
    title,
    description,
    company_name,
    location_display,
    latitude,
    longitude,
    category_label,
    salary_min,
    salary_max,
    salary_predicted,
    contract_time,
    contract_type,
    redirect_url,
    posted_at,
    derived_trade,
  } = job;

  const [mapImageOk, setMapImageOk] = useState(true);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const hasCoords = latitude != null && longitude != null;

  const mapImageUrl = useMemo(() => {
    if (!hasCoords || !mapboxToken) return null;
    return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${longitude},${latitude},14,0/370x180@2x?access_token=${mapboxToken}`;
  }, [hasCoords, mapboxToken, longitude, latitude]);

  const mapEmbedUrl = useMemo(() => {
    if (!hasCoords) return null;

    const latDelta = 0.02;
    const lngDelta = 0.03;
    const minLng = longitude - lngDelta;
    const minLat = latitude - latDelta;
    const maxLng = longitude + lngDelta;
    const maxLat = latitude + latDelta;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  }, [hasCoords, longitude, latitude]);

  const shouldUseMapboxImage = Boolean(
    mapboxToken && mapImageOk && mapImageUrl,
  );
  const safeRedirectUrl = useMemo(() => {
    if (!redirect_url) return null;
    try {
      const parsedUrl = new URL(redirect_url);
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        return parsedUrl.toString();
      }
    } catch {
      return null;
    }
    return null;
  }, [redirect_url]);

  const handleExternalClick = (e) => {
    e.preventDefault();
    if (!safeRedirectUrl) return;
    window.open(safeRedirectUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="job-card">
      {/* Map area */}
      {hasCoords && (
        <div className="card-map">
          {shouldUseMapboxImage ? (
            <>
              <img
                className="map-placeholder"
                src={mapImageUrl}
                alt="Job location map"
                loading="lazy"
                onError={() => setMapImageOk(false)}
              />
              <div className="map-pin"></div>
            </>
          ) : (
            <iframe
              className="map-embed"
              title="Job location map"
              src={mapEmbedUrl}
              loading="lazy"
            />
          )}
          <div className="map-watermark" aria-hidden="true">
            <img src="/favicon.svg" alt="" />
          </div>
          <a
            className="badge-external"
            href={safeRedirectUrl || "#"}
            onClick={handleExternalClick}
            title="View original listing"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            External
          </a>
        </div>
      )}

      {/* Card body */}
      <div className="card-body">
        {/* Location block */}
        <div className="card-location">
          <h3>{title}</h3>
          <p>{location_display || "Location not specified"}</p>
        </div>

        {/* Info grid */}
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Company</span>
            <span className="info-value">
              {company_name || (
                <em className="text-fallback">Company not listed</em>
              )}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Category</span>
            <span className="info-value">
              {category_label || derived_trade}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Salary Range</span>
            <span className="info-value estimated">
              {formatSalary(salary_min, salary_max)}
              {salary_predicted && salary_min && salary_max && (
                <span
                  className="estimated-dot"
                  title="Salary is estimated by Adzuna"
                >
                  ~
                </span>
              )}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Contract</span>
            <span className="info-value">
              {formatContractInfo(contract_type, contract_time) || (
                <em className="text-fallback">Not specified</em>
              )}
            </span>
          </div>
        </div>

        {/* Tags row */}
        <div className="tags-row">
          {category_label && (
            <span className="tag category">{category_label}</span>
          )}
          {contract_time && (
            <span className="tag">
              {contract_time === "full_time" ? "Full-time" : "Part-time"}
            </span>
          )}
          {contract_type && (
            <span className="tag">
              {contract_type === "permanent" ? "Permanent" : "Contract"}
            </span>
          )}
        </div>

        {/* Description snippet */}
        <div className="card-description">
          <span className="info-label">Description</span>
          <p>
            {description || (
              <em style={{ color: "var(--slate-400)" }}>
                No description available. View the full listing for details.
              </em>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="card-footer">
          <span className="posted-date">
            Posted <span>{formatPostedDate(posted_at)}</span>
          </span>
          <a
            href={safeRedirectUrl || "#"}
            className="btn-view"
            onClick={handleExternalClick}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Listing
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
