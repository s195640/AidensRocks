// src/pages/Jobs.jsx
import CreateImages from "../../components/create-images/CreateImages";
import CreateQRCodes from "../../components/create-qr-codes/CreateQRCodes";
import "./Jobs.css";

const Jobs = () => {
  return (
    <div className="jobs-container">
      <div className="jobs-stack">
        <CreateImages />
        <CreateQRCodes />
      </div>
    </div>
  );
};
export default Jobs;
