/**
 * Geocode an address using OpenStreetMap Nominatim (free, no API key).
 * Returns { lat, lng, displayName } or null if not found.
 */
export async function geocodeAddress(address) {
  const encoded = encodeURIComponent(address.trim());
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encoded}`;

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
