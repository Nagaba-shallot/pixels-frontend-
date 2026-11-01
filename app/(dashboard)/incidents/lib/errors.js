export function describeError(label, error) {
  if (error?.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (error?.status === 403) {
    return "You do not have access to this data.";
  }
  return `Could not load ${label}: ${error?.message ?? "Something went wrong"}`;
}
