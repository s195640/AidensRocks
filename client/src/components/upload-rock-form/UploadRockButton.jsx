import { useState } from "react";
import UploadRockForm from "./UploadRockForm";

const UploadRockButton = () => {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button onClick={() => setShowForm(true)} className="upload-btn">
        Upload Your Rock
      </button>

      {showForm && <UploadRockForm onClose={() => setShowForm(false)} />}
    </>
  );
};

export default UploadRockButton;
