/**
 * Search for address suggestions using Nominatim.
 * Returns array of { lat, lng, displayName }.
 */
const STATE_ABBR = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "District of Columbia": "DC",
};

function formatUSAddress(addr) {
  const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county;
  const state = STATE_ABBR[addr.state] || addr.state;
  const zip = addr.postcode;

  const parts = [street, city, [state, zip].filter(Boolean).join(" ")]
    .filter(Boolean);
  return parts.join(", ");
}

export async function searchAddress(query) {
  const encoded = encodeURIComponent(query.trim());
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&addressdetails=1&q=${encoded}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "TradesForce/1.0" },
  });

  if (!response.ok) return [];

  const results = await response.json();
  return results.map(({ lat, lon, display_name, address }) => ({
    lat: parseFloat(lat),
    lng: parseFloat(lon),
    displayName: formatUSAddress(address) || display_name,
  }));
}

/**
 * Geocode an address using OpenStreetMap Nominatim (free, no API key).
 * Returns { lat, lng, displayName } or null if not found.
 */
export async function geocodeAddress(address) {
  const encoded = encodeURIComponent(address.trim());
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encoded}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "TradesForce/1.0" },
  });

  if (!response.ok) return null;

  const results = await response.json();
  if (!results.length) return null;

  const { lat, lon, display_name } = results[0];
  return {
    lat: parseFloat(lat),
    lng: parseFloat(lon),
    displayName: display_name,
  };
}
