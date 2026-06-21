import axios from "axios";
import { useEffect, useState } from "react";
import Job from "../job/Job";
import Dialog from "../../../components/simple-components/dialog/Dialog";
import styles from "./PrintMultiImages.module.css";

const PrintMultiImages = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imageName, setImageName] = useState("");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [customSize, setCustomSize] = useState({ width: 100, height: 100 });

  const [facesAlbum, setFacesAlbum] = useState(null);
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [albumPhotos, setAlbumPhotos] = useState([]);
  const [albumLoading, setAlbumLoading] = useState(false);

  useEffect(() => {
    const loadFacesAlbum = async () => {
      try {
        const res = await axios.get("/api/albums");
        const album = res.data.find((a) => a.name.toLowerCase() === "faces");
        setFacesAlbum(album || null);
      } catch (err) {
        console.error("Failed to load albums:", err);
      }
    };
    loadFacesAlbum();
  }, []);

  const loadImageFile = (file) => {
    setImageFile(file);
    setImageName(file.name);

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = URL.createObjectURL(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) loadImageFile(file);
  };

  const openAlbumDialog = async () => {
    if (!facesAlbum) return;
    setAlbumDialogOpen(true);
    setAlbumLoading(true);
    try {
      const res = await axios.get(`/api/albums/${facesAlbum.pa_key}/photos`);
      setAlbumPhotos(res.data);
    } catch (err) {
      console.error("Failed to load faces album photos:", err);
      setAlbumPhotos([]);
    } finally {
      setAlbumLoading(false);
    }
  };

  const handleSelectAlbumPhoto = async (photo) => {
    try {
      const res = await fetch(`/media/albums/${facesAlbum.name}/webp/${photo.name}`);
      const blob = await res.blob();
      loadImageFile(new File([blob], photo.name, { type: blob.type }));

      const sizeMatch = photo.desc?.match(/(\d+)\s*[x×]\s*(\d+)/i);
      if (sizeMatch) {
        setCustomSize({ width: Number(sizeMatch[1]), height: Number(sizeMatch[2]) });
      }

      setAlbumDialogOpen(false);
    } catch (err) {
      console.error("Failed to load selected album photo:", err);
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
            @page {
              size: auto;
              margin: 0;
            }
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
          <script>
            window.onload = () => setTimeout(() => window.print(), 250);
          </script>
        </body>
        </html>
      `);

      preview.document.close();
      preview.focus();
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
          {facesAlbum && (
            <button type="button" onClick={openAlbumDialog} className={styles.pmiButton}>
              Choose from Faces Album
            </button>
          )}
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

      <Dialog
        isOpen={albumDialogOpen}
        onClose={() => setAlbumDialogOpen(false)}
        title="Choose from Faces Album"
        closeOnOutsideClick
      >
        {albumLoading ? (
          <p>Loading...</p>
        ) : (
          <div className={styles.pmiAlbumGrid}>
            {albumPhotos.map((photo) => (
              <div key={photo.p_key} className={styles.pmiAlbumItem} onClick={() => handleSelectAlbumPhoto(photo)}>
                <img
                  src={`/media/albums/${facesAlbum.name}/webp300x300/${photo.name}`}
                  alt={photo.display_name || photo.name}
                  className={styles.pmiAlbumThumb}
                />
                {photo.desc && <span className={styles.pmiAlbumDesc}>{photo.desc}</span>}
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </Job>
  );
};

export default PrintMultiImages;
