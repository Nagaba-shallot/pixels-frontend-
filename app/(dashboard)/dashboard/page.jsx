"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import LakeMap from "@/components/LakeMap";
import { api } from "@/lib/api";

function Stat({ iconSrc, value, title, note, tone }) {
  return (
    <div className={`flex items-center gap-4 rounded-lg p-5 ${tone}`}>
      <Image
        src={iconSrc}
        alt={title}
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 object-contain"
      />
      <div className="flex min-w-0 flex-row items-center gap-3">
        <span className="text-3xl md:text-4xl text-black font-semibold">
          {value}
        </span>
        <div className="flex flex-col text-black">
          <p className="font-semibold truncate">{title}</p>
          <p className="text-sm truncate">{note}</p>
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
          .filter((a) => !a.resolved_at)
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

        const activeAlerts = Object.values(activeAlertsMap);
        const activeAlertFisherIds = new Set(
          activeAlerts.map((a) => a.fisher_id),
        );

        const activeTrips = trips.filter((t) => t.status === "active");

        let totalResponders = 0;
        if (activeAlerts.length > 0) {
          const responderPromises = activeAlerts.map((alert) =>
            api.getRespondersByAlert(alert.alert_id).catch(() => []),
          );
          const respondersArray = await Promise.all(responderPromises);
          const uniqueIds = new Set();
          respondersArray
            .flat()
            .forEach((r) => uniqueIds.add(r.responder_fisher_id));
          totalResponders = uniqueIds.size;
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

      <div className="grid gap-4 lg:grid-cols-3">
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
