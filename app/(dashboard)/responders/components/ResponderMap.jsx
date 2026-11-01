"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { MAP_CENTER, MAP_ZOOM } from "../lib/constants";
import { statusColor } from "../lib/responders";
import "./ResponderMap.css";

const MAX_BOUNDS = [
  [-8.0, 28.0],
  [5.0, 42.0],
];

const pinIcons = new Map();

function getPinIcon(color) {
  let icon = pinIcons.get(color);
  if (!icon) {
    icon = L.divIcon({
      className: "",
      iconSize: [28, 38],
      iconAnchor: [14, 38],
      html: `<svg width="28" height="38" viewBox="0 0 28 38"><path d="M14 0C6.3 0 0 6.2 0 13.8 0 24 14 38 14 38s14-14 14-24.2C28 6.2 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="5" fill="#fff" opacity=".35"/></svg>`,
    });
    pinIcons.set(color, icon);
  }
  return icon;
}

export function ResponderMap({ responders }) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      minZoom={6}
      maxZoom={18}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={1.0}
      scrollWheelZoom
      className="responder-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {responders.map((responder) =>
        responder.latitude != null && responder.longitude != null ? (
          <Marker
            key={responder.id}
            position={[responder.latitude, responder.longitude]}
            icon={getPinIcon(statusColor(responder.status))}
          >
            <Popup>
              <strong>{responder.name}</strong>
              <br />
              {responder.status}
              {responder.phone && (
                <>
                  <br />
                  {responder.phone}
                </>
              )}
            </Popup>
          </Marker>
        ) : null,
      )}
    </MapContainer>
  );
}
