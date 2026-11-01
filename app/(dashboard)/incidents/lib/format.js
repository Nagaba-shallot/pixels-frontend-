const TIME_FORMAT = { hour: "numeric", minute: "2-digit" };
const DATE_FORMAT = { day: "numeric", month: "short", year: "numeric" };

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", TIME_FORMAT);
}

export function formatDateTime(iso) {
  const date = new Date(iso).toLocaleDateString("en-GB", DATE_FORMAT);
  return `${formatTime(iso)} (${date})`;
}

export function formatCoordinates(latitude, longitude) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}
