export function formatDistance(km) {
  return km == null ? null : `${Number(km.toFixed(1))} km`;
}

const TIME_FORMAT = { hour: "numeric", minute: "2-digit" };

export function formatTimeRange(from, to) {
  if (!from) return "-";
  const start = new Date(from).toLocaleTimeString("en-US", TIME_FORMAT);
  if (!to) return start;
  return `${start} - ${new Date(to).toLocaleTimeString("en-US", TIME_FORMAT)}`;
}

export function formatStatus(status) {
  if (!status) return "-";
  const text = status.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
