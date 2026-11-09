const BASE =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_LOCAL_URL || "";
const IOT_BASE =
  process.env.NEXT_PUBLIC_IOT_API_URL || process.env.NEXT_PUBLIC_LOCAL_URL;

async function request(path, options = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("mvuvi_token") : null;
  const { headers: extraHeaders, ...rest } = options;

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
  });

  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = body?.detail ?? `Request failed (${res.status})`;
    const error = new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail),
    );
    error.status = res.status;

    const isAuthEndpoint =
      path.includes("/auth/login") ||
      path.includes("/auth/verify-otp") ||
      path.includes("/auth/request-code") ||
      path.includes("/auth/password-reset");

    if (res.status === 401 && !isAuthEndpoint) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("mvuvi_token");
        window.location.replace("/signin");
      }
    }

    throw error;
  }

  return body;
}

async function fetchAllPages(fetchPage, pageSize, maxPages = 200) {
  const records = [];
  for (let pageNumber = 0; pageNumber < maxPages; pageNumber++) {
    const skip = pageNumber * pageSize;
    const page = await fetchPage(skip, pageSize);
    if (!Array.isArray(page)) {
      throw new Error("The API returned an unexpected list response.");
    }
    records.push(...page);
    if (page.length < pageSize) return records;
  }
  return records;
}

export const api = {
  getLastScan: async () => {
    const res = await fetch(`${IOT_BASE}/last-scan`);
    if (!res.ok) {
      throw new Error(`Failed to fetch last scan: ${res.status}`);
    }
    return await res.json();
  },

  sendGPS: (payload) =>
    request("/api/iot/gps", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  sendSOS: (payload) =>
    request("/api/iot/sos", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createWristband: (rfid_tag) =>
    request("/api/v1/wristbands/", {
      method: "POST",
      body: JSON.stringify({ rfid_tag }),
    }),
  login: (email, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  requestSignupCode: (email) =>
    request("/auth/signup/request-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifySignupCode: (email, code) =>
    request("/auth/signup/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  completeSignup: (data) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  loginStep1: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  verifyOtp: async (email, code) => {
    const res = await request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    if (res?.access_token)
      localStorage.setItem("mvuvi_token", res.access_token);
    return res;
  },
  requestCode: (email) =>
    request("/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  requestPasswordResetCode: (email) =>
    request("/auth/password-reset/request-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyPasswordResetCode: (email, code) =>
    request("/auth/password-reset/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  confirmPasswordReset: (token, new_password) =>
    request("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    }),
  resetPassword: (token, newPassword) =>
    request("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    }),
  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem("mvuvi_token");
  },

  getFishers: (query = "") => request(`/api/fishers/${query}`),
  getFisher: (fisherId) =>
    request(`/api/fishers/${encodeURIComponent(fisherId)}`),
  getAllFishers: () =>
    fetchAllPages(
      (skip, limit) => request(`/api/fishers/?skip=${skip}&limit=${limit}`),
      100,
    ),
  getAllFishersWithTrips: async () => {
    const [fishers, trips] = await Promise.all([
      api.getAllFishers(),
      fetchAllPages(
        (skip, limit) => request(`/trips/?skip=${skip}&limit=${limit}`),
        100,
      ).catch(() => []),
    ]);
    const tripsByFisher = new Map();
    trips.forEach((t) => {
      const list = tripsByFisher.get(t.fisher_id) || [];
      list.push({
        trip_id: t.trip_id,
        check_in_time: t.checkin_at,
        check_out_time: t.checkout_at,
        fisher_count: t.total_fishers,
        status: t.status,
      });
      tripsByFisher.set(t.fisher_id, list);
    });
    return fishers.map((f) => ({
      ...f,
      trips: tripsByFisher.get(f.fisher_id) || [],
    }));
  },
  createFisher: (payload) =>
    request("/api/fishers/", { method: "POST", body: JSON.stringify(payload) }),

  updateFisherPhone: (fisherId, phone_number) =>
    request(`/api/fishers/${encodeURIComponent(fisherId)}`, {
      method: "PATCH",
      body: JSON.stringify({ phone_number }),
    }),
  confirmFisherPhone: (fisherId, otp) =>
    request(`/api/fishers/${encodeURIComponent(fisherId)}/confirm-phone`, {
      method: "POST",
      body: JSON.stringify({ otp }),
    }),

  getWristbands: (skip = 0, limit = 100) =>
    request(`/api/v1/wristbands/?skip=${skip}&limit=${limit}`),
  getAllWristbands: () =>
    fetchAllPages((skip, limit) => api.getWristbands(skip, limit), 100),
  assignWristband: (wristbandId, fisherId) =>
    request("/api/v1/wristbands/assign", {
      method: "POST",
      body: JSON.stringify({ wristband_id: wristbandId, fisher_id: fisherId }),
    }),
  unassignWristband: (wristbandId) =>
    request("/api/v1/wristbands/unassign", {
      method: "POST",
      body: JSON.stringify({ wristband_id: wristbandId }),
    }),

  getTrips: () => request("/trips/"),
  getLocationLogs: () => request("/locations/"),
  getLocations: (skip = 0, limit = 500) =>
    request(`/locations?skip=${skip}&limit=${limit}`),
  getLocation: (locationId) =>
    request(`/locations/${encodeURIComponent(locationId)}`),

  getAlerts: (status, skip = 0, limit = 100) => {
    const params = new URLSearchParams({ skip, limit });
    if (status) params.set("status_filter", status);
    return request(`/api/v1/alerts/?${params}`);
  },
  getAllAlerts: (status) =>
    fetchAllPages((skip, limit) => api.getAlerts(status, skip, limit), 100),
  getAlert: (alertId) =>
    request(`/api/v1/alerts/${encodeURIComponent(alertId)}`),

  getResponders: (alertId) =>
    request(`/api/v1/alert-responders/alert/${encodeURIComponent(alertId)}`),
  getRespondersByAlert: (alertId) =>
    request(`/api/v1/alert-responders/alert/${encodeURIComponent(alertId)}`),
  getAlertResponders: (alertId) => api.getRespondersByAlert(alertId),
  getAlertRespondersForAlert: (alertId) =>
    api.getRespondersByAlert(alertId).catch(() => []),

  acknowledgeAlert: (alertId) =>
    request(`/api/v1/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
      method: "POST",
    }),
  resolveAlert: (alertId) =>
    request(`/api/v1/alerts/${encodeURIComponent(alertId)}/resolve`, {
      method: "POST",
    }),
  markResponderArrived: (alertResponderId) =>
    request(
      `/api/v1/alert-responders/${encodeURIComponent(alertResponderId)}/arrived`,
      { method: "POST" },
    ),

  getCurrentOperator: () => request("/operators/me"),
  getAllOperators: () => request("/operators"),
  createOperator: (payload) =>
    request("/operators", { method: "POST", body: JSON.stringify(payload) }),
  deleteOperator: (operatorId) =>
    request(`/operators/${encodeURIComponent(operatorId)}`, {
      method: "DELETE",
    }),

  getReports: async () => {
    const [alerts, fishers, locations] = await Promise.all([
      api.getAllAlerts(),
      api.getAllFishers(),
      fetchAllPages((skip, limit) => api.getLocations(skip, limit), 500),
    ]);
    const knownLocationIds = new Set(locations.map((l) => l.location_id));
    const missingLocationIds = [
      ...new Set(
        alerts
          .map((a) => a.location_id)
          .filter((id) => id && !knownLocationIds.has(id)),
      ),
    ];
    const missingLocations = await Promise.allSettled(
      missingLocationIds.map((id) => api.getLocation(id)),
    );
    const allLocations = [
      ...locations,
      ...missingLocations.flatMap((r) =>
        r.status === "fulfilled" && r.value ? [r.value] : [],
      ),
    ];
    const fisherById = new Map(fishers.map((f) => [f.fisher_id, f]));
    const locationById = new Map(allLocations.map((l) => [l.location_id, l]));
    const respondersByAlert = await Promise.all(
      alerts.map((a) => api.getAlertRespondersForAlert(a.alert_id)),
    );
    return alerts
      .map((alert, index) => {
        const fisher = fisherById.get(alert.fisher_id);
        const location = locationById.get(alert.location_id);
        const responderRecords = Array.isArray(respondersByAlert[index])
          ? respondersByAlert[index]
          : [];
        const triggeredAt = Date.parse(alert.triggered_at);
        const arrivalTimes = responderRecords
          .map((r) => Date.parse(r.arrived_at))
          .filter((t) => Number.isFinite(t) && t >= triggeredAt);
        const firstArrival = arrivalTimes.length
          ? Math.min(...arrivalTimes)
          : null;
        const responseMinutes =
          firstArrival === null
            ? null
            : Math.max(0, Math.round((firstArrival - triggeredAt) / 60000));
        const recordedAt = location?.recorded_at ?? alert.triggered_at;
        return {
          id: alert.alert_id,
          date: recordedAt,
          when: Number.isNaN(Date.parse(recordedAt))
            ? "Time unavailable"
            : new Date(recordedAt).toLocaleString(),
          fisher: fisher?.full_name ?? "Fisher details unavailable",
          fisherPhone: fisher?.phone_number ?? "",
          location:
            Number.isFinite(location?.latitude) &&
            Number.isFinite(location?.longitude)
              ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
              : "Location unavailable",
          status: alert.resolved_at
            ? "Resolved"
            : alert.acknowledged_at
              ? "Acknowledged"
              : "Active",
          response:
            responseMinutes !== null
              ? `${responseMinutes} min`
              : responderRecords.length
                ? "In Progress"
                : "—",
        };
      })
      .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  },

  getIslands: () => request("/api/islands/"),
};
