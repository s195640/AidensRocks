// src/components/RockTable.jsx
import axios from "axios";
import { useEffect, useState } from "react";
import RockJourney from "../RockJourney";
import "./RockTable.css";

const RockTable = () => {
  const [groupedRocks, setGroupedRocks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/api/rock-posts");
        const data = res.data;
        const grouped = new Map();
        data.forEach((entry) => {
          if (!grouped.get(entry.rock_number)) {
            grouped.set(entry.rock_number, []);
          }
          grouped.get(entry.rock_number).push({ ...entry, path: `/media/rocks/${entry.rock_number}/${entry.uuid}` });
        });
        setGroupedRocks(Array.from(grouped).map(([key, value]) => ({ key, value })));
      } catch (error) {
        console.error("Error fetching rock post data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="rock-table">
      {
        groupedRocks.map(i => <RockJourney
          key={i.key}
          rockNumber={i.key}
          collections={i.value}
        />)
      }
    </div>
  );
};

export default RockTable;
