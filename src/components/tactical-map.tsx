
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

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
  const lastCenterRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    // Only center the map if the coordinates are non-zero and have actually changed significantly
    // to prevent jitter during live updates
    if (center[0] !== 0 && center[1] !== 0) {
      const isNew = !lastCenterRef.current || 
                    Math.abs(lastCenterRef.current[0] - center[0]) > 0.0001 || 
                    Math.abs(lastCenterRef.current[1] - center[1]) > 0.0001;
      
      if (isNew) {
        map.setView(center, zoom);
        lastCenterRef.current = center;
      }
    }
  }, [center, zoom, map]);
  
  return null;
}

export default function TacticalMap({ alerts, center = [0, 0], zoom = 2, onMarkerClick }: TacticalMapProps) {
  // If no center is provided, default to the first active alert
  const mapCenter = center[0] !== 0 ? center : (alerts.length > 0 ? [alerts[0].locationLatitude, alerts[0].locationLongitude] as [number, number] : [0, 0] as [number, number]);
  const mapZoom = center[0] !== 0 ? 18 : zoom;

  return (
    <div className="w-full h-full min-h-[400px] relative rounded-xl overflow-hidden border-4 border-slate-900 shadow-2xl bg-slate-100">
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
                <p className="text-primary font-black uppercase text-[10px] tracking-widest leading-none mb-1">Active SITREP</p>
                <p className="text-lg font-black tracking-tight">{alert.childId}</p>
                <div className="flex flex-col gap-0.5 mt-1 border-t pt-1">
                  <p className="text-[9px] uppercase font-bold text-slate-500">{alert.status}</p>
                  <p className="font-mono text-[8px] text-slate-400 font-bold">{alert.locationLatitude.toFixed(6)}, {alert.locationLongitude.toFixed(6)}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
