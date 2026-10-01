import axios from "axios";
import { useEffect, useState } from "react";
import Job from "../job/Job";
import styles from "./PrintMultiImages.module.css";

// Letter page at the browser's 96px/in, with a fixed outer margin -- all
// sizes in this job are CSS px.
const PAGE_WIDTH = 768;
const PAGE_HEIGHT = 1056;
const PAGE_MARGIN = 20;

// On-screen preview shows page 1 scaled to this width (px).
const PREVIEW_WIDTH = 340;

// Images are placed by explicit coordinates rather than flex/grid gaps so
// the column/row gaps can go negative (overlap), which CSS `gap` can't.
// Returns how many fit per page plus each page's image positions.
const computeLayout = (size, colGap, rowGap, count) => {
  const usableW = PAGE_WIDTH - PAGE_MARGIN * 2;
  const usableH = PAGE_HEIGHT - PAGE_MARGIN * 2;
  const stepX = Math.max(1, size.width + colGap);
  const stepY = Math.max(1, size.height + rowGap);
  const cols = size.width > usableW ? 1 : Math.floor((usableW - size.width) / stepX) + 1;
  const rows = size.height > usableH ? 1 : Math.floor((usableH - size.height) / stepY) + 1;
  const perPage = cols * rows;
  const total = count > 0 ? count : perPage;

  const pages = [];
  for (let i = 0; i < total; i++) {
    const pageIndex = Math.floor(i / perPage);
    const slot = i % perPage;
    if (!pages[pageIndex]) pages[pageIndex] = [];
    pages[pageIndex].push({
      x: PAGE_MARGIN + (slot % cols) * stepX,
      y: PAGE_MARGIN + Math.floor(slot / cols) * stepY,
    });
  }
  return { cols, rows, perPage, total, pages };
};

// Shared by the on-screen preview (iframe srcDoc) and the print window, so
// the preview is the exact same markup/CSS that prints.
const buildDocument = (dataUrl, size, pages, { bodyStyle = "", script = "" } = {}) => `
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
        position: relative;
        width: ${PAGE_WIDTH}px;
        height: ${PAGE_HEIGHT}px;
        overflow: hidden;
      }
      /* Break *before* every page but the first, rather than after every
         page: a trailing break on the last page (the old approach --
         ":last-child" never matched it because the print <script> comes
         after) printed an extra blank page. */
      .print-page + .print-page {
        page-break-before: always;
      }
      .print-image {
        position: absolute;
        width: ${size.width}px;
        height: ${size.height}px;
      }
      ${bodyStyle}
    </style>
  </head>
  <body>
    ${pages
      .map(
        (positions) => `
      <div class="print-page">
        ${positions
          .map((p) => `<img src="${dataUrl}" class="print-image" style="left:${p.x}px;top:${p.y}px" />`)
          .join("")}
      </div>`
      )
      .join("")}
    ${script}
  </body>
  </html>
`;

const PrintMultiImages = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imageName, setImageName] = useState("");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [customSize, setCustomSize] = useState({ width: 100, height: 100 });
  // Defaults match this job's original fixed layout: 10px padding on every
  // side of each image = 20px between neighbors.
  const [colGap, setColGap] = useState(20);
  const [rowGap, setRowGap] = useState(20);
  // Blank = fill one page; more than fit on a page spills onto extra pages.
  const [howMany, setHowMany] = useState("");
  const [scaledDataURL, setScaledDataURL] = useState(null);

  const [facesAlbum, setFacesAlbum] = useState(null);
  const [albumPhotos, setAlbumPhotos] = useState([]);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [selectedPhotoKey, setSelectedPhotoKey] = useState(null);

  useEffect(() => {
    const loadFacesAlbum = async () => {
      setAlbumLoading(true);
      try {
        const albumsRes = await axios.get("/api/albums");
        const album = albumsRes.data.find((a) => a.name.toLowerCase() === "faces");
        setFacesAlbum(album || null);

        if (album) {
          const photosRes = await axios.get(`/api/albums/${album.pa_key}/photos`);
          setAlbumPhotos(photosRes.data);
        }
      } catch (err) {
        console.error("Failed to load faces album:", err);
      } finally {
        setAlbumLoading(false);
      }
    };
    loadFacesAlbum();
  }, []);

  // Rescales the chosen image to the requested size whenever either
  // changes, so the live preview and the print use the same image.
  useEffect(() => {
    if (!imageFile || !(customSize.width > 0) || !(customSize.height > 0)) {
      setScaledDataURL(null);
      return undefined;
    }

    let cancelled = false;
    const imgURL = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(imgURL);
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = customSize.width;
      canvas.height = customSize.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setScaledDataURL(canvas.toDataURL("image/png"));
    };
    img.src = imgURL;

    return () => {
      cancelled = true;
    };
  }, [imageFile, customSize]);

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
    if (file) {
      setSelectedPhotoKey(null);
      loadImageFile(file);
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

      setSelectedPhotoKey(photo.p_key);
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

  const layout = computeLayout(customSize, colGap, rowGap, Number(howMany) || 0);

  const handlePrintPreview = () => {
    if (!scaledDataURL) return;

    const preview = window.open("", "_blank", "width=800,height=1000");
    if (!preview) return;

    preview.document.write(
      buildDocument(scaledDataURL, customSize, layout.pages, {
        script: "<script>window.onload = () => setTimeout(() => window.print(), 250);</script>",
      })
    );
    preview.document.close();
    preview.focus();
  };

  const previewZoom = PREVIEW_WIDTH / PAGE_WIDTH;
  const previewDoc = scaledDataURL
    ? buildDocument(scaledDataURL, customSize, layout.pages.slice(0, 1), {
        bodyStyle: `html, body { overflow: hidden; } body { zoom: ${previewZoom}; }`,
      })
    : "";

  return (
    <Job title="Print Multi Images">
      <div className={styles.layout}>
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

          {albumLoading && <p>Loading Faces Album...</p>}

          {!albumLoading && albumPhotos.length > 0 && (
            <div className={styles.pmiAlbumSection}>
              <span className={styles.pmiAlbumSectionLabel}>Or choose from Faces Album:</span>
              <div className={styles.pmiAlbumGrid}>
                {albumPhotos.map((photo) => (
                  <div
                    key={photo.p_key}
                    className={`${styles.pmiAlbumItem} ${
                      selectedPhotoKey === photo.p_key ? styles.pmiAlbumItemSelected : ""
                    }`}
                    onClick={() => handleSelectAlbumPhoto(photo)}
                  >
                    <img
                      src={`/media/albums/${facesAlbum.name}/webp300x300/${photo.name}`}
                      alt={photo.display_name || photo.name}
                      className={styles.pmiAlbumThumb}
                    />
                    {photo.desc && <span className={styles.pmiAlbumDesc}>{photo.desc}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {imageFile && (
            <>
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

              <div className={styles.pmiSizeRow}>
                <label className={styles.pmiSizeLabel}>
                  Column gap:
                  <input
                    type="number"
                    value={colGap}
                    onChange={(e) => setColGap(Number(e.target.value))}
                    className={styles.pmiSizeInput}
                  />
                </label>
                <label className={styles.pmiSizeLabel}>
                  Row gap:
                  <input
                    type="number"
                    value={rowGap}
                    onChange={(e) => setRowGap(Number(e.target.value))}
                    className={styles.pmiSizeInput}
                  />
                </label>
                <label className={styles.pmiSizeLabel}>
                  How many:
                  <input
                    type="number"
                    min="0"
                    value={howMany}
                    placeholder={`${layout.perPage}`}
                    onChange={(e) => setHowMany(e.target.value)}
                    className={styles.pmiSizeInput}
                  />
                </label>
                <span className={styles.pmiOriginalSize}>
                  px; negative gaps overlap. Leave &ldquo;How many&rdquo; blank to fill one page.
                </span>
              </div>
            </>
          )}

          <button onClick={handlePrintPreview} disabled={!scaledDataURL} className={styles.button}>
            Print Preview
          </button>
        </div>

        <div className={styles.previewColumn}>
          <h3 className={styles.previewTitle}>Preview (page 1)</h3>
          {previewDoc ? (
            <>
              <iframe
                title="Print multi images preview"
                srcDoc={previewDoc}
                className={styles.previewFrame}
                style={{ width: `${PREVIEW_WIDTH}px`, height: `${PAGE_HEIGHT * previewZoom}px` }}
              />
              <p className={styles.previewHint}>
                {layout.perPage} per page ({layout.cols} &times; {layout.rows}) &middot; {layout.total} total on{" "}
                {layout.pages.length} page{layout.pages.length === 1 ? "" : "s"}
              </p>
            </>
          ) : (
            <p className={styles.previewPlaceholder}>Choose an image to see a preview.</p>
          )}
        </div>
      </div>
    </Job>
  );
};

export default PrintMultiImages;
