"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const LAKE_VICTORIA = { center: [-1.3465, 36.7269], zoom: 19 };

const MAX_BOUNDS = [
  [-5.0, 33.0],
  [5.0, 42.0],
];

const COLORS = { distress: "#e11d1d", nearby: "#16a34a", pending: "#f5b50a" };

const pin = (type, large) =>
  L.divIcon({
    className: "",
    iconSize: large ? [32, 48] : [24, 36],
    iconAnchor: large ? [16, 48] : [12, 36],
    popupAnchor: [0, -34],
    html: `<svg viewBox="0 0 24 36" width="100%" height="100%"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${COLORS[type] ?? COLORS.nearby}"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`,
  });

export default function LakeMapInner({ markers = [], selectedId, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: LAKE_VICTORIA.center,
      zoom: LAKE_VICTORIA.zoom,
      minZoom: 6,
      maxZoom: 19,
      maxBounds: MAX_BOUNDS,
      maxBoundsViscosity: 1.0,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    markers.forEach((m) => {
      const icon = pin(m.type, m.id === selectedId);
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);

      if (!m.noPopup) {
        marker.bindPopup(
          `<strong>${m.label}</strong>${m.status ? `<div>Case status: ${m.status}</div>` : ""}`,
        );
      }

      marker.on("click", () => onSelect?.(m));
    });
  }, [markers, selectedId, onSelect]);

  return <div ref={containerRef} className="z-0 h-full w-full rounded-lg" />;
}
