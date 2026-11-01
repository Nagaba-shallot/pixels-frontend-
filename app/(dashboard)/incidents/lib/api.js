import { api } from "@/lib/api";
import { toIncident } from "./incidents";

export async function getActiveIncidents() {
  const [triggered, acknowledged, locations] = await Promise.all([
    api.getAlerts("triggered"),
    api.getAlerts("acknowledged"),
    api.getLocations(),
  ]);

  const locationMap = locations.reduce((acc, loc) => {
    acc[loc.location_id] = loc;
    return acc;
  }, {});

  return [...triggered, ...acknowledged]
    .map((alert, index) => {
      const loc = locationMap[alert.location_id];
      return toIncident({ ...alert, location: loc }, index);
    })
    .sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));
}

export function getFisher(fisherId) {
  return api.getFisher(fisherId);
}

export function getAlertResponders(alertId) {
  return api.getAlertResponders(alertId);
}
