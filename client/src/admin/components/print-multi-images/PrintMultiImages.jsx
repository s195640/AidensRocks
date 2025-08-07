import { useState } from "react";
import Job from "../job/Job";
import styles from "./PrintMultiImages.module.css";

const PrintMultiImages = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imageName, setImageName] = useState("");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [customSize, setCustomSize] = useState({ width: 100, height: 100 });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImageName(file.name);

      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomSize((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handlePrintPreview = () => {
    if (!imageFile) return;

    const imgURL = URL.createObjectURL(imageFile);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = customSize.width;
      canvas.height = customSize.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const scaledDataURL = canvas.toDataURL("image/png");

      const pageWidth = 768;
      const pageHeight = 1056;
      const margin = 20;
      const paddedWidth = customSize.width + 20;
      const paddedHeight = customSize.height + 20;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const cols = Math.floor(usableWidth / paddedWidth);
      const rows = Math.floor(usableHeight / paddedHeight);

      const preview = window.open("", "_blank", "width=800,height=1000");
      if (!preview) return;

      preview.document.write(`
        <html>
        <head>
          <title>Print Preview</title>
          <style>
            body {
              margin: 0;
              padding: 0;
            }
            .print-page {
              width: ${pageWidth}px;
              height: ${pageHeight}px;
              display: flex;
              flex-wrap: wrap;
              page-break-after: always;
              padding: ${margin}px;
              box-sizing: border-box;
            }
            .print-image {
              width: ${customSize.width}px;
              height: ${customSize.height}px;
              padding: 10px;
              box-sizing: content-box;
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            ${Array.from({ length: cols * rows })
              .map(() => `<img src="${scaledDataURL}" class="print-image" />`)
              .join("")}
          </div>
        </body>
        </html>
      `);

      preview.document.close();
      preview.focus();
      preview.print();
    };

    img.src = imgURL;
  };

  return (
    <Job title="Print Multi Images">
      <div className={styles.pmiContainer}>
        <div className={styles.pmiFileRow}>
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            onChange={handleImageChange}
            className={styles.pmiInputHidden}
          />
          <label htmlFor="imageUpload" className={styles.pmiButton}>
            Choose Image
          </label>
          <span className={styles.pmiFilename}>{imageName}</span>
        </div>

        {imageFile && (
          <div className={styles.pmiSizeRow}>
            <label className={styles.pmiSizeLabel}>
              Width:
              <input
                type="number"
                name="width"
                value={customSize.width}
                onChange={handleInputChange}
                className={styles.pmiSizeInput}
              />
            </label>
            <label className={styles.pmiSizeLabel}>
              Height:
              <input
                type="number"
                name="height"
                value={customSize.height}
                onChange={handleInputChange}
                className={styles.pmiSizeInput}
              />
            </label>
            <span className={styles.pmiOriginalSize}>
              Original: {imageSize.width} × {imageSize.height}
            </span>
          </div>
        )}

        <button
          onClick={handlePrintPreview}
          disabled={!imageFile}
          className={styles.button}
        >
          Print Preview
        </button>
      </div>
    </Job>
  );
};

export default PrintMultiImages;
