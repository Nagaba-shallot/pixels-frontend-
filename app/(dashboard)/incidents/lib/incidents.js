export function getIncidentStatus(alert) {
  if (alert.resolved_at) return "resolved";
  if (alert.acknowledged_at) return "acknowledged";
  return "triggered";
}

function normalizeCoordinate(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const coordinate = Number(value);

  return Number.isFinite(coordinate) ? coordinate : null;
}

export function toIncident(alert, index = 0) {
  const location = alert.location ?? alert.log ?? alert;

  return {
    id: alert.alert_id,
    displayId: `IID${String(index + 1).padStart(3, "0")}`,
    fisherId: alert.fisher_id,
    locationId: alert.location_id,
    status: getIncidentStatus(alert),
    triggeredAt: alert.triggered_at,
    acknowledgedAt: alert.acknowledged_at ?? null,
    resolvedAt: alert.resolved_at ?? null,
    fisherCount: alert.number_of_fishers ?? null,
    latitude: normalizeCoordinate(location.latitude ?? alert.latitude),
    longitude: normalizeCoordinate(location.longitude ?? alert.longitude),
  };
}

export function hasCoordinates(incident) {
  const latitude = incident?.latitude;
  const longitude = incident?.longitude;

  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined ||
    (typeof latitude === "string" && latitude.trim() === "") ||
    (typeof longitude === "string" && longitude.trim() === "")
  ) {
    return false;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function getCurrentTrip(trips = []) {
  const open = trips.filter((trip) => !trip.checkout_at);
  const candidates = open.length > 0 ? open : trips;
  return (
    [...candidates].sort(
      (a, b) => new Date(b.checkin_at) - new Date(a.checkin_at),
    )[0] ?? null
  );
}

export function buildTimeline({ incident, fisher, responders }) {
  const wristband = fisher?.rfid_id;
  const events = [
    {
      id: "triggered",
      at: incident.triggeredAt,
      text: wristband
        ? `SOS alert received from wristband ${wristband}`
        : "SOS alert received",
    },
  ];

  const firstNotified = responders
    .map((responder) => responder.received_at)
    .filter(Boolean)
    .sort()[0];
  if (firstNotified) {
    events.push({
      id: "notified",
      at: firstNotified,
      text: "SMS sent to nearby responders",
    });
  }

  if (incident.acknowledgedAt) {
    events.push({
      id: "acknowledged",
      at: incident.acknowledgedAt,
      text: "Alert acknowledged by operator",
    });
  }

  for (const responder of responders) {
    if (responder.arrived_at) {
      events.push({
        id: `arrived-${responder.alert_responder_id}`,
        at: responder.arrived_at,
        text: "Responder arrived at incident location",
      });
    }
  }

  if (incident.resolvedAt) {
    events.push({
      id: "resolved",
      at: incident.resolvedAt,
      text: "Incident resolved",
    });
  }

  return events.sort((a, b) => new Date(a.at) - new Date(b.at));
}
