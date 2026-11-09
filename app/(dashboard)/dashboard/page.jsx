"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import LakeMap from "@/components/LakeMap";
import { api } from "@/lib/api";

const ARRIVAL_RADIUS_M = 100;

function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

function hasArrived(responder, alert, latestByFisher) {
  if (responder.arrived_at) return true;
  const victim = latestByFisher[alert.fisher_id];
  const rescuer = latestByFisher[responder.responder_fisher_id];
  if (!victim || !rescuer) return false;
  if (Date.parse(rescuer.recorded_at) < Date.parse(responder.received_at)) {
    return false;
  }
  return (
    distanceMeters(
      rescuer.latitude,
      rescuer.longitude,
      victim.latitude,
      victim.longitude,
    ) <= ARRIVAL_RADIUS_M
  );
}

function ignoreConflict(err) {
  if (err?.status !== 409) throw err;
}

function Stat({ iconSrc, value, title, note, tone }) {
  return (
    <div className={`flex min-w-0 items-center gap-4 rounded-lg p-5 ${tone}`}>
      <Image
        src={iconSrc}
        alt={title}
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 object-contain"
      />
      <div className="flex min-w-0 flex-1 flex-row items-center gap-3">
        <span className="text-3xl md:text-4xl text-black font-semibold">
          {value}
        </span>
        <div className="flex min-w-0 flex-col text-black">
          <p className="font-semibold leading-tight break-words">{title}</p>
          <p className="text-sm leading-snug break-words">{note}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ incidents: 0, trips: 0, responders: 0 });
  const [markers, setMarkers] = useState([]);
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const handledRef = useRef(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => {
      clearTimeout(timer);
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let timeoutId;

    function autoResolve(alert, responder) {
      const id = alert.alert_id;
      if (handledRef.current.has(id)) return;
      handledRef.current.add(id);

      (async () => {
        try {
          if (!responder.arrived_at) {
            await api
              .markResponderArrived(responder.alert_responder_id)
              .catch(ignoreConflict);
          }
          if (!alert.acknowledged_at) {
            await api.acknowledgeAlert(id).catch(ignoreConflict);
          }
          await api.resolveAlert(id).catch(ignoreConflict);
        } catch (err) {
          console.error("Could not resolve alert:", err);
          handledRef.current.delete(id);
        }
      })();
    }

    async function loadData() {
      if (isCancelled) return;

      try {
        const [alertsRes, tripsRes, locationsRes] = await Promise.allSettled([
          api.getAlerts(),
          api.getTrips(),
          api.getLocationLogs(),
        ]);

        if (isCancelled) return;

        const alerts = alertsRes.status === "fulfilled" ? alertsRes.value : [];
        const trips = tripsRes.status === "fulfilled" ? tripsRes.value : [];
        const rawLocations =
          locationsRes.status === "fulfilled" ? locationsRes.value : [];

        const activeAlertsMap = alerts
          .filter((a) => !a.resolved_at && !handledRef.current.has(a.alert_id))
          .reduce((acc, alert) => {
            const existing = acc[alert.fisher_id];
            if (
              !existing ||
              new Date(alert.triggered_at) > new Date(existing.triggered_at)
            ) {
              acc[alert.fisher_id] = alert;
            }
            return acc;
          }, {});

        let activeAlerts = Object.values(activeAlertsMap);
        let activeAlertFisherIds = new Set(
          activeAlerts.map((a) => a.fisher_id),
        );

        const activeTrips = trips.filter((t) => t.status === "active");

        let totalResponders = 0;
        if (activeAlerts.length > 0) {
          const respondersArray = await Promise.all(
            activeAlerts.map((alert) =>
              api.getRespondersByAlert(alert.alert_id).catch(() => []),
            ),
          );
          if (isCancelled) return;

          const latestByFisher = {};
          rawLocations.forEach((loc) => {
            const existing = latestByFisher[loc.fisher_id];
            if (
              !existing ||
              new Date(loc.recorded_at) > new Date(existing.recorded_at)
            ) {
              latestByFisher[loc.fisher_id] = loc;
            }
          });

          const stillActive = [];
          const stillActiveResponders = [];
          activeAlerts.forEach((alert, i) => {
            const responders = respondersArray[i] || [];
            const arrived = responders.find((r) =>
              hasArrived(r, alert, latestByFisher),
            );
            if (arrived) {
              autoResolve(alert, arrived);
            } else {
              stillActive.push(alert);
              stillActiveResponders.push(...responders);
            }
          });

          activeAlerts = stillActive;
          activeAlertFisherIds = new Set(activeAlerts.map((a) => a.fisher_id));
          totalResponders = new Set(
            stillActiveResponders.map((r) => r.responder_fisher_id),
          ).size;
        }

        setStats({
          incidents: activeAlerts.length,
          trips: activeTrips.length,
          responders: totalResponders,
        });

        const latestLocationMap = rawLocations.reduce((acc, loc) => {
          const existing = acc[loc.fisher_id];
          if (
            !existing ||
            new Date(loc.recorded_at) > new Date(existing.recorded_at)
          ) {
            acc[loc.fisher_id] = loc;
          }
          return acc;
        }, {});

        let unmapped = 0;
        const newMarkers = [];

        activeAlerts.forEach((alert) => {
          const loc = latestLocationMap[alert.fisher_id];
          if (
            loc &&
            loc.latitude != null &&
            loc.longitude != null &&
            loc.latitude >= -90 &&
            loc.latitude <= 90 &&
            loc.longitude >= -180 &&
            loc.longitude <= 180
          ) {
            newMarkers.push({
              id: alert.alert_id,
              type: "distress",
              lat: loc.latitude,
              lng: loc.longitude,
              label: `Distressed: ${alert.fisher_id?.slice(0, 6)}`,
              status: "Action",
            });
          } else {
            unmapped++;
          }
        });

        activeTrips.forEach((trip) => {
          if (!activeAlertFisherIds.has(trip.fisher_id)) {
            const loc = latestLocationMap[trip.fisher_id];
            if (
              loc &&
              loc.latitude != null &&
              loc.longitude != null &&
              loc.latitude >= -90 &&
              loc.latitude <= 90 &&
              loc.longitude >= -180 &&
              loc.longitude <= 180
            ) {
              newMarkers.push({
                id: `safe-${trip.fisher_id}`,
                type: "nearby",
                lat: loc.latitude,
                lng: loc.longitude,
                label: `Checked In: ${trip.fisher_id?.slice(0, 6)}`,
                status: "Safe",
              });
            } else {
              unmapped++;
            }
          }
        });

        setMarkers(newMarkers);
        setUnmappedCount(unmapped);
      } catch (err) {
        console.error("Dashboard data error:", err);
      } finally {
        if (!isCancelled) {
          timeoutId = setTimeout(loadData, 1000);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Landing Site: Kisumu"
        back={false}
      />

      {unmappedCount > 0 && (
        <div className="mb-4 rounded bg-yellow-50 p-3 text-sm text-yellow-700 border border-yellow-200">
          {unmappedCount} fisher(s) are on the lake but haven&apos;t sent GPS
          data yet.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Stat
          iconSrc="/incident.svg"
          tone="bg-red-50"
          value={stats.incidents}
          title="Active Incidents"
          note="Requires immediate attention"
        />
        <Stat
          iconSrc="/fisher.svg"
          tone="bg-sky-100"
          value={stats.trips}
          title="Fishers on the Lake"
          note="Live wristband tracking"
        />
        <Stat
          iconSrc="/responder.svg"
          tone="bg-green-50"
          value={stats.responders}
          title="Assigned Responders"
          note="Currently responding to active alerts"
        />
      </div>
      <h2 className="sr-only">Lake overview</h2>

      {isMounted && (
        <LakeMap
          key="dashboard-map"
          legend
          className="mt-6 flex-1 min-h-[24rem]"
          markers={markers}
        />
      )}
    </>
  );
}
