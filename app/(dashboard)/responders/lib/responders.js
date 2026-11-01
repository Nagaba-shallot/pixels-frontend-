import { STATUS_COLORS } from "./constants";
export function statusColor(status) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.unavailable;
}

export function sortByDistance(responders) {
  const distanceOf = (responder) => responder.distance_km ?? Infinity;
  return [...responders].sort((a, b) => distanceOf(a) - distanceOf(b));
}
