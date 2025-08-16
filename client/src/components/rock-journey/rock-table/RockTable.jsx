// src/components/RockTable.jsx
import axios from "axios";
import { useEffect, useState } from "react";
import RockJourney from "../RockJourney";
import "./RockTable.css";

const RockTable = () => {
  const [groupedRocks, setGroupedRocks] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/api/rock-posts");
        const data = res.data;

        const grouped = {};
        data.forEach((entry) => {
          const { rock_number, uuid, imagenames, location, date, comment, artists } =
            entry;
          const path = `/media/rocks/${rock_number}/${uuid}`;
          const collection = { path, imagenames, location, date, comment, artists };

          if (!grouped[rock_number]) {
            grouped[rock_number] = [];
          }
          grouped[rock_number].push(collection);
        });


        // Sort collections by date descending
        for (const key in grouped) {
          grouped[key].sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        setGroupedRocks(grouped);
      } catch (error) {
        console.error("Error fetching rock post data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="rock-table">
      {Object.entries(groupedRocks).map(([rockNumber, collections]) => (
        <RockJourney
          key={rockNumber}
          rockNumber={parseInt(rockNumber)}
          collections={collections}
        />
      ))}
    </div>
  );
};

export default RockTable;
