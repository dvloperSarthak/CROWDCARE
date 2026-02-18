
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const alertIcon = L.divIcon({
  html: `<div class="w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg animate-bounce flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface TacticalMapProps {
  alerts: any[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (alertId: string) => void;
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function TacticalMap({ alerts, center = [0, 0], zoom = 2, onMarkerClick }: TacticalMapProps) {
  // If no center is provided, default to the first active alert
  const mapCenter = center[0] !== 0 ? center : (alerts.length > 0 ? [alerts[0].locationLatitude, alerts[0].locationLongitude] as [number, number] : [0, 0] as [number, number]);
  const mapZoom = center[0] !== 0 ? 18 : zoom;

  return (
    <div className="w-full h-full min-h-[400px] relative rounded-xl overflow-hidden border-4 border-slate-900 shadow-2xl">
      <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={mapCenter} zoom={mapZoom} />
        {alerts.map((alert) => (
          <Marker
            key={alert.id}
            position={[alert.locationLatitude, alert.locationLongitude]}
            icon={alert.status === 'Child Reunited' ? icon : alertIcon}
            eventHandlers={{
              click: () => onMarkerClick?.(alert.id),
            }}
          >
            <Popup className="font-bold">
              <div className="text-center p-2">
                <p className="text-primary font-black uppercase text-[10px] tracking-widest">Active Incident</p>
                <p className="text-lg font-black">{alert.childId}</p>
                <p className="text-[9px] uppercase font-bold text-slate-500">{alert.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
