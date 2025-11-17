// src/components/RockMap.jsx
import { useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import styles from "./RockMap.module.css";
import RockMapPopup from "./rock-map-popup/RockMapPopup";

// Fix default marker icons (needed for React + Webpack/Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function RockMap({ pins = [] }) {
  const [selectedRock, setSelectedRock] = useState(null);
  const mapURL = ["https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png"
  ];

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className={styles.map}
        attributionControl={false}
        zoomControl={true}
        worldCopyJump={false} // Prevents infinite horizontal panning
        maxBounds={[[-90, -180], [90, 180]]} // Keeps inside the world bounds
      >
        <TileLayer
          url={mapURL[1]}
          noWrap={true} // Stops repeating tiles horizontally
        />

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={pin.coords}
            eventHandlers={{
              click: () => setSelectedRock(pin.label),
            }}
          />
        ))}
      </MapContainer>

      {selectedRock && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedRock(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <RockMapPopup rockNumber={selectedRock} />
            <button
              className={styles.closeBtn}
              onClick={() => setSelectedRock(null)}
            >
              ✖
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
