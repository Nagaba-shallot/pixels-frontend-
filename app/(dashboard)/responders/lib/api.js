import { api } from "@/lib/api";

async function getAllLocations() {
  const page = await api.getLocations(0, 50);
  if (!Array.isArray(page)) return [];
  return page;
}

function toResponder(record, fisher, location) {
  return {
    id: record.alert_responder_id,
    name: fisher?.full_name ?? "Responder Fisher",
    phone: fisher?.phone_number ?? null,
    status: record.arrived_at ? "available" : "busy",
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    distance_km: record.distance_m == null ? null : record.distance_m / 1000,
  };
}

export async function getResponders() {
  const [alerts, fishers, locations] = await Promise.all([
    api.getAllAlerts(),
    api.getAllFishers(),
    getAllLocations(),
  ]);

  const activeAlerts = alerts.filter((a) => !a.resolved_at);

  const fisherMap = fishers.reduce((acc, f) => {
    acc[f.fisher_id] = f;
    return acc;
  }, {});

  const locationMap = locations.reduce((acc, l) => {
    acc[l.fisher_id] = l;
    return acc;
  }, {});

  const responderPromises = activeAlerts.map((alert) =>
    api.getRespondersByAlert(alert.alert_id),
  );

  const respondersArray = await Promise.all(responderPromises);

  const allResponders = respondersArray.flat().map((record) => {
    const fisher = fisherMap[record.responder_fisher_id];
    const location = locationMap[record.responder_fisher_id];
    return toResponder(record, fisher, location);
  });

  return allResponders;
}
