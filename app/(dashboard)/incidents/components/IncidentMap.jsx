"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { INCIDENT_STATUS, MAP_CENTER, MAP_ZOOM } from "../lib/constants";
import { hasCoordinates } from "../lib/incidents";
import "./IncidentMap.css";

const MAX_BOUNDS = [
  [-8.0, 28.0],
  [5.0, 42.0],
];

const pinIcons = new Map();

function getPinIcon(color, isSelected) {
  const key = `${color}-${isSelected}`;
  let icon = pinIcons.get(key);
  if (!icon) {
    const width = isSelected ? 38 : 28;
    const height = isSelected ? 52 : 38;
    icon = L.divIcon({
      className: "",
      iconSize: [width, height],
      iconAnchor: [width / 2, height],
      html: `<svg width="${width}" height="${height}" viewBox="0 0 28 38"><path d="M14 0C6.3 0 0 6.2 0 13.8 0 24 14 38 14 38s14-14 14-24.2C28 6.2 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="5" fill="#fff" opacity=".6"/></svg>`,
    });
    pinIcons.set(key, icon);
  }
  return icon;
}

export function IncidentMap({ incidents, selectedId, onSelect }) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      minZoom={6}
      maxZoom={18}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={1.0}
      scrollWheelZoom
      className="incident-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {incidents.filter(hasCoordinates).map((incident) => (
        <Marker
          key={incident.id}
          position={[incident.latitude, incident.longitude]}
          icon={getPinIcon(
            INCIDENT_STATUS[incident.status].color,
            incident.id === selectedId,
          )}
          eventHandlers={{ click: () => onSelect(incident.id) }}
        />
      ))}
    </MapContainer>
  );
}
