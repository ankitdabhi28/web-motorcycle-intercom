"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import { Icon, LatLngExpression } from "leaflet";
import { useRideStore } from "@/store";
import { useRiderPaths } from "@/lib/hooks/useRiderPaths";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with Leaflet + React
const createCustomIcon = (color: string) =>
  new Icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${encodeURIComponent(
      color,
    )}'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

export default function RiderMap() {
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);
  const [isClient, setIsClient] = useState(false);
  const { getLocalPath, getRemotePath } = useRiderPaths();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  const center: LatLngExpression = [
    localRider.gpsLocation.lat || 40.7128,
    localRider.gpsLocation.lng || -74.006,
  ];

  const localPath = getLocalPath();
  const localPathPositions: LatLngExpression[] = localPath.map((point) => [
    point.lat,
    point.lng,
  ]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Local rider path */}
      {localPathPositions.length > 1 && (
        <Polyline
          positions={localPathPositions}
          color="#3b82f6"
          weight={3}
          opacity={0.7}
        />
      )}

      {/* Local rider marker */}
      <Marker position={center} icon={createCustomIcon("#3b82f6")}>
        <Popup>
          <div className="text-sm">
            <strong>{localRider.name}</strong>
            <br />
            <span className="text-green-600">● You</span>
            <br />
            Battery: {localRider.batteryLevel}%
            <br />
            Path points: {localPath.length}
          </div>
        </Popup>
      </Marker>

      {/* Remote rider markers and paths */}
      {Object.values(remoteRiders).map((rider) => {
        const remotePath = getRemotePath(rider.riderId);
        const remotePathPositions: LatLngExpression[] = remotePath.map(
          (point) => [point.lat, point.lng],
        );

        return (
          <div key={rider.riderId}>
            {/* Remote rider path */}
            {remotePathPositions.length > 1 && (
              <Polyline
                positions={remotePathPositions}
                color={rider.isMuted ? "#ef4444" : "#22c55e"}
                weight={2}
                opacity={0.5}
              />
            )}

            {/* Remote rider marker */}
            <Marker
              position={[
                rider.gpsLocation.lat || 40.7128,
                rider.gpsLocation.lng || -74.006,
              ]}
              icon={createCustomIcon(rider.isMuted ? "#ef4444" : "#22c55e")}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{rider.name}</strong>
                  <br />
                  {rider.isOnline ? (
                    <span className="text-green-600">● Online</span>
                  ) : (
                    <span className="text-gray-500">● Offline</span>
                  )}
                  <br />
                  Signal: {rider.signalStrength} dBm
                  <br />
                  Battery: {rider.batteryLevel}%
                  <br />
                  Path points: {remotePath.length}
                  {rider.isMuted && (
                    <div>
                      <span className="text-red-600">🔇 Muted</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </div>
        );
      })}
    </MapContainer>
  );
}
