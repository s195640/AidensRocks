// src/components/RockMap.jsx
import { useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import styles from "./RockMap.module.css";
import RockMapPopup from "./rock-map-popup/RockMapPopup";
import Dialog from "../simple-components/dialog/Dialog";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filters, setFilters] = useState({ show2025: true, show2026: true });
  const [rockNumberQuery, setRockNumberQuery] = useState("");
  const mapURL = ["https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png"
  ];

  const toggleFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  console.log(pins)

  const visiblePins = pins.filter((pin) => {
    if (pin.year === 2025 && !filters.show2025) return false;
    if (pin.year === 2026 && !filters.show2026) return false;

    const trimmedQuery = rockNumberQuery.trim();
    if (trimmedQuery && !pin.label.includes(trimmedQuery)) return false;

    return true;
  });

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

        {visiblePins.map((pin) => (
          <Marker
            key={pin.id}
            position={pin.coords}
            eventHandlers={{
              click: () => setSelectedRock(pin.label),
            }}
          />
        ))}
      </MapContainer>

      <button
        type="button"
        className={styles.settingsBtn}
        aria-label="Map filter settings"
        onClick={() => setSettingsOpen(true)}
      >
        ⚙
      </button>

      <Dialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Map Filters"
        buttonPanel={
          <button onClick={() => setSettingsOpen(false)}>Close</button>
        }
      >
        <label className={styles.rockNumberRow}>
          <span>Rock Number</span>
          <input
            type="text"
            className={styles.rockNumberInput}
            placeholder="e.g. 123"
            value={rockNumberQuery}
            onChange={(e) => setRockNumberQuery(e.target.value)}
          />
        </label>

        <label className={styles.switchRow}>
          <span>Show 2025 Rocks</span>
          <span className={styles.switch}>
            <input
              type="checkbox"
              checked={filters.show2025}
              onChange={() => toggleFilter("show2025")}
            />
            <span className={styles.switchTrack} />
          </span>
        </label>
        <label className={styles.switchRow}>
          <span>Show 2026 Rocks</span>
          <span className={styles.switch}>
            <input
              type="checkbox"
              checked={filters.show2026}
              onChange={() => toggleFilter("show2026")}
            />
            <span className={styles.switchTrack} />
          </span>
        </label>
      </Dialog>

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
