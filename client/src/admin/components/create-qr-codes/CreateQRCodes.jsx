import QRCode from "qrcode";
import { useState } from "react";
import Job from "../../components/job/Job";
import styles from "./CreateQRCodes.module.css";

const CreateQRCodes = () => {
  const [rangeStart, setRangeStart] = useState(101); // default value 101

  const handlePreview = async () => {
    const rangeEnd = rangeStart + 109; // automatically +109

    const qrHTMLChunks = [];

    for (let i = rangeStart; i <= rangeEnd; i++) {
      const url = `https://aidensrocks.com/qr?r=${i}`;
      const qrDataUrl = await QRCode.toDataURL(url);

      qrHTMLChunks.push(`
        <div class="qr-entry">
          <div class="qr-image-wrapper">
            <div class="qr-top-label">aidensrocks.com</div>
            <img src="${qrDataUrl}" alt="QR ${i}" />
            <div class="qr-bottom-label">rock: ${i}</div>
          </div>
        </div>
      `);
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code Sheet</title>
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: Verdana, Arial, sans-serif;
            margin: .1in;
          }
          .qr-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 0.2in;
            justify-content: center;
          }
          .qr-entry {
            width: .5in;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .qr-image-wrapper {
            position: relative;
            width: 0.75in;
            height: 0.75in;
          }
          .qr-image-wrapper img {
            width: 100%;
            height: 100%;
            margin: 0;
          }
          .qr-top-label,
          .qr-bottom-label {
            font-family: 'Barlow Condensed', Arial, sans-serif;
            font-size: 0.60rem;
            font-weight: 400;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            padding: 1px 2px;
            line-height: 1;
            color: black;
          }
          .qr-top-label {
            top: -5px;
          }
          .qr-bottom-label {
            bottom: -4px;
          }
        </style>
      </head>
      <body>
        <div class="qr-grid">
          ${qrHTMLChunks.join("")}
        </div>
        <script>
          window.onload = () => window.print();
        </script>
      </body>
      </html>
    `;

    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } else {
      alert("Popup blocked! Please allow popups and try again.");
    }
  };

  return (
    <Job title="Create QR Codes">
      <div className={styles.qrInputs}>
        <label>Rock Range ({rangeStart} to {rangeStart + 109}):</label>
        <div className={styles.rangeInputs}>
          <input
            type="number"
            min="1"
            max="100000"
            value={rangeStart}
            onChange={(e) => setRangeStart(Number(e.target.value))}
          />
        </div>
      </div>
      <button onClick={handlePreview} className={styles.button}>
        Print Preview
      </button>
    </Job>
  );
};

export default CreateQRCodes;
