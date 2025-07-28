// src/components/CreateQRCodes.jsx
import QRCode from "qrcode";
import { useState } from "react";
import "./CreateQRCodes.css";

const CreateQRCodes = () => {
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(100);

  const handlePreview = async () => {
    if (rangeEnd < rangeStart) return alert("End must be >= Start");

    const qrHTMLChunks = [];

    for (let i = rangeStart; i <= rangeEnd; i++) {
      const url = `https://aidensrocks.com/qr?r=${i}`;
      const qrDataUrl = await QRCode.toDataURL(url);

      qrHTMLChunks.push(`
        <div class="qr-entry">
          <div class="qr-top-label">aidensrocks.com</div>
          <img src="${qrDataUrl}" alt="QR ${i}" />
          <div class="qr-bottom-label">rock: ${i}</div>
        </div>
      `);
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code Sheet</title>
        <style>
          body {
            font-family: Verdana, Arial, sans-serif;
            margin: 1in;
          }
          .qr-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5in;
            justify-content: center;
          }
          .qr-entry {
            width: 1in;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .qr-top-label,
          .qr-bottom-label {
            font-size: 0.5rem;
            font-weight: 600; /* slightly heavier */
            line-height: 1;
            margin: 0;
          }
          .qr-top-label {
            margin-bottom: 0;
          }
          .qr-entry img {
            width: 0.75in;
            height: 0.75in;
            margin: 0;
          }
          .qr-bottom-label {
            margin-top: 0;
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
    <div className="qr-box">
      <h2>Create QR Codes</h2>
      <div className="qr-inputs">
        <label>Rock Range:</label>
        <div className="range-inputs">
          <input
            type="number"
            min="1"
            max="100000"
            value={rangeStart}
            onChange={(e) => setRangeStart(Number(e.target.value))}
          />
          <span className="to-separator">to</span>
          <input
            type="number"
            min="1"
            max="100000"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(Number(e.target.value))}
          />
        </div>
      </div>
      <button onClick={handlePreview}>Print Preview</button>
    </div>
  );
};

export default CreateQRCodes;
