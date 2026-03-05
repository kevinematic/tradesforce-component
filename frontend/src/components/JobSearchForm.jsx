import { useState, useRef, useEffect, useCallback } from "react";
import { geocodeAddress, searchAddress } from "../utils/geocode";
import "./JobSearchForm.css";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

const JobSearchForm = ({ onSearch, onClear, loading }) => {
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState(25);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedCoords, setSelectedCoords] = useState(null);

  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const fetchSuggestions = useCallback(async (query) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const results = await searchAddress(query);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
    setActiveIndex(-1);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setAddress(value);
    setSelectedCoords(null);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const selectSuggestion = (suggestion) => {
    setAddress(suggestion.displayName);
    setSelectedCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    setAddress("");
    setSelectedCoords(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setError(null);
  }, []);

  useEffect(() => {
    if (onClear) onClear(reset);
  }, [onClear, reset]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;

    setShowSuggestions(false);
    setError(null);

    if (selectedCoords) {
      onSearch({ lat: selectedCoords.lat, lng: selectedCoords.lng, radius, displayName: trimmed });
      return;
    }

    setGeocoding(true);
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
          <div className="address-wrapper" ref={wrapperRef}>
            <input
              id="search-address"
              type="text"
              placeholder="City, state, or zip code"
              value={address}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              disabled={busy}
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-autocomplete="list"
              aria-controls="address-suggestions"
              aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul id="address-suggestions" className="autocomplete-list" role="listbox">
                {suggestions.map((s, i) => (
                  <li
                    key={`${s.lat}-${s.lng}`}
                    id={`suggestion-${i}`}
                    className={`autocomplete-item${i === activeIndex ? " active" : ""}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseDown={() => selectSuggestion(s)}
                  >
                    {s.displayName}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
