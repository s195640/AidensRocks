import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./TotalRocks.module.css";
import LabelValueDialog from "../simple-components/label-value-dialog/LabelValueDialog";

export default function TotalRocks() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/ar-details");
        setDetails(res.data);
      } catch (err) {
        console.error("Error fetching AR details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, []);

  if (loading || !details) return null;

  return (
    <div className={styles.totalRocks}>
      <div className={styles.summary}>
        Rocks found {details.rocksFound} of {details.rocks}
      </div>

      <div className={styles.statsColumn}>
        <LabelValueDialog
          name="Total stops"
          value={details.journeys}
        />
        <LabelValueDialog
          name="Countries visited"
          value={details.countries}
          title="Total Countries Visited"
          items={details.countriesTable}
        />
        <LabelValueDialog
          name="US States visited"
          value={details.usStates}
          title="Total States Visited"
          items={details.statesTable}
        />
      </div>
    </div>
  );
}
