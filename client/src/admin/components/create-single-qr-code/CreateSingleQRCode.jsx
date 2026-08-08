import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Job from "../job/Job";
import ToggleSwitch from "../../../components/simple-components/toggle-switch/ToggleSwitch";
import ColorPickerField from "../../../components/simple-components/color-picker-field/ColorPickerField";
import styles from "./CreateSingleQRCode.module.css";

// Raster resolution target for the underlying QR image, not just its
// printed physical size -- keeps it crisp at `sizeInches` instead of
// pixelated when the browser scales it up for print.
const PRINT_DPI = 300;

// On-screen preview is capped at this size (inches, using the browser's
// standard 96px/in) so a large requested code doesn't take over the admin
// page -- gaps and font sizes are scaled down by the same ratio so the
// preview stays proportionally accurate to what actually prints.
const MAX_PREVIEW_INCHES = 4;

// Header/footer are free text embedded directly into a raw HTML string
// (written via document.write, not React) -- escape so a stray `<`/`&`/
// quote can't break the printed page's markup.
const escapeHtml = (str) =>
  str.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

export default function CreateSingleQRCode() {
  const [url, setUrl] = useState("aidensrocks.com");
  const [sizeInches, setSizeInches] = useState(6);
  const [header, setHeader] = useState("");
  const [footer, setFooter] = useState("");
  const [headerGap, setHeaderGap] = useState(0.25);
  const [footerGap, setFooterGap] = useState(0.25);
  const [headerFontSize, setHeaderFontSize] = useState(18);
  const [footerFontSize, setFooterFontSize] = useState(14);
  // Standard CSS font-weight scale (100=thin .. 900=black); matches this
  // job's previous fixed values (header bold, footer normal) as defaults.
  const [headerFontWeight, setHeaderFontWeight] = useState(700);
  const [footerFontWeight, setFooterFontWeight] = useState(400);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [qrColor, setQrColor] = useState("#000000");
  const [headerColor, setHeaderColor] = useState("#333333");
  const [footerColor, setFooterColor] = useState("#333333");
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrError, setQrError] = useState("");

  // Regenerates when the URL, size, dark-module color, or background
  // transparency changes -- header/footer text, spacing, font size, and
  // color are pure overlay styling applied at render time, so they update
  // the preview instantly without needing the (async) QR image rebuilt.
  useEffect(() => {
    let cancelled = false;
    const trimmedUrl = url.trim();

    if (!trimmedUrl || !(sizeInches > 0)) {
      setQrDataUrl(null);
      return undefined;
    }

    // Most QR readers need an explicit scheme to treat this as a tappable
    // link rather than plain text -- add one if the entered URL lacks it,
    // without touching what's shown in the input itself.
    const encodedUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
    const pixelSize = Math.round(sizeInches * PRINT_DPI);

    // 8-digit hex (RRGGBBAA) is what tells the qrcode library to render
    // with an alpha channel -- "00" alpha on the light modules is what
    // actually makes the background transparent, not just visually white.
    // The dark modules (qrColor) always stay fully opaque -- only the
    // background is ever transparent.
    const color = {
      dark: `${qrColor}ff`,
      light: transparentBackground ? "#ffffff00" : "#ffffffff",
    };

    QRCode.toDataURL(encodedUrl, { width: pixelSize, color })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setQrError("");
        }
      })
      .catch(() => {
        if (!cancelled) setQrError("Failed to generate QR code.");
      });

    return () => {
      cancelled = true;
    };
  }, [url, sizeInches, qrColor, transparentBackground]);

  const handleDownload = () => {
    if (!qrDataUrl) return;

    // Derives a readable filename from the URL rather than a generic
    // "qr-code.png" every time, e.g. "aidensrocks-com.png" -- falls back to
    // a fixed name if the URL doesn't leave anything usable.
    const safeName =
      url
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "qr-code";

    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!qrDataUrl) {
      alert("Please enter a valid URL and size greater than 0.");
      return;
    }

    const trimmedHeader = header.trim();
    const trimmedFooter = footer.trim();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code</title>
        <style>
          @page { size: letter; margin: 0.5in; }
          body {
            margin: 0;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Verdana, Arial, sans-serif;
          }
          .qrWrapper {
            position: relative;
            width: ${sizeInches}in;
            height: ${sizeInches}in;
          }
          img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
          }
          /* Positioned (not margin-pushed) so header/footer always paint
             on top of the QR image (z-index 2 vs img's 1), regardless of
             how far the gap pulls them over it. */
          .header,
          .footer {
            position: absolute;
            left: 50%;
            width: 100%;
            transform: translateX(-50%);
            text-align: center;
            z-index: 2;
          }
          .header {
            bottom: calc(100% + ${headerGap}in);
            font-size: ${headerFontSize}pt;
            font-weight: ${headerFontWeight};
            color: ${headerColor};
          }
          .footer {
            top: calc(100% + ${footerGap}in);
            font-size: ${footerFontSize}pt;
            font-weight: ${footerFontWeight};
            color: ${footerColor};
          }
        </style>
      </head>
      <body>
        <div class="qrWrapper">
          <img src="${qrDataUrl}" alt="QR code" />
          ${trimmedHeader ? `<div class="header">${escapeHtml(trimmedHeader)}</div>` : ""}
          ${trimmedFooter ? `<div class="footer">${escapeHtml(trimmedFooter)}</div>` : ""}
        </div>
        <script>
          window.onload = () => setTimeout(() => window.print(), 250);
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

  // Scaled down (never up) so the preview stays a reasonable size in the
  // admin page while keeping gaps/font sizes proportionally accurate to
  // what will actually print.
  const previewScale = Math.min(1, MAX_PREVIEW_INCHES / (sizeInches || 1));
  const previewSize = sizeInches * previewScale;

  return (
    <Job title="Create Single QR Code">
      <div className={styles.layout}>
        <div className={styles.formColumn}>
          <label htmlFor="single-qr-url">URL</label>
          <input
            id="single-qr-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={styles.urlInput}
          />

          <label htmlFor="single-qr-size">Size: {sizeInches}in (square)</label>
          <input
            id="single-qr-size"
            type="range"
            min="1"
            max="11"
            step="0.25"
            value={sizeInches}
            onChange={(e) => setSizeInches(Number(e.target.value))}
            className={styles.slider}
          />

          <ColorPickerField
            id="single-qr-color"
            label="QR code color"
            value={qrColor}
            onChange={setQrColor}
          />

          <label htmlFor="single-qr-header">Header (optional, printed above the code)</label>
          <input
            id="single-qr-header"
            type="text"
            value={header}
            onChange={(e) => setHeader(e.target.value)}
            className={styles.urlInput}
          />

          <label htmlFor="single-qr-header-gap">
            Header spacing: {headerGap}in{headerGap < 0 ? " (overlapping the code)" : ""}
          </label>
          <input
            id="single-qr-header-gap"
            type="range"
            min="-2"
            max="2"
            step="0.05"
            value={headerGap}
            onChange={(e) => setHeaderGap(Number(e.target.value))}
            className={styles.slider}
          />

          <label htmlFor="single-qr-header-font">Header font size: {headerFontSize}pt</label>
          <input
            id="single-qr-header-font"
            type="range"
            min="8"
            max="48"
            step="1"
            value={headerFontSize}
            onChange={(e) => setHeaderFontSize(Number(e.target.value))}
            className={styles.slider}
          />

          <label htmlFor="single-qr-header-weight">Header boldness: {headerFontWeight}</label>
          <input
            id="single-qr-header-weight"
            type="range"
            min="100"
            max="900"
            step="100"
            value={headerFontWeight}
            onChange={(e) => setHeaderFontWeight(Number(e.target.value))}
            className={styles.slider}
          />

          <ColorPickerField
            id="single-qr-header-color"
            label="Header text color"
            value={headerColor}
            onChange={setHeaderColor}
          />

          <label htmlFor="single-qr-footer">Footer (optional, printed below the code)</label>
          <input
            id="single-qr-footer"
            type="text"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            className={styles.urlInput}
          />

          <label htmlFor="single-qr-footer-gap">
            Footer spacing: {footerGap}in{footerGap < 0 ? " (overlapping the code)" : ""}
          </label>
          <input
            id="single-qr-footer-gap"
            type="range"
            min="-2"
            max="2"
            step="0.05"
            value={footerGap}
            onChange={(e) => setFooterGap(Number(e.target.value))}
            className={styles.slider}
          />

          <label htmlFor="single-qr-footer-font">Footer font size: {footerFontSize}pt</label>
          <input
            id="single-qr-footer-font"
            type="range"
            min="8"
            max="48"
            step="1"
            value={footerFontSize}
            onChange={(e) => setFooterFontSize(Number(e.target.value))}
            className={styles.slider}
          />

          <label htmlFor="single-qr-footer-weight">Footer boldness: {footerFontWeight}</label>
          <input
            id="single-qr-footer-weight"
            type="range"
            min="100"
            max="900"
            step="100"
            value={footerFontWeight}
            onChange={(e) => setFooterFontWeight(Number(e.target.value))}
            className={styles.slider}
          />

          <ColorPickerField
            id="single-qr-footer-color"
            label="Footer text color"
            value={footerColor}
            onChange={setFooterColor}
          />

          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Transparent background</span>
            <ToggleSwitch
              checked={transparentBackground}
              onChange={() => setTransparentBackground((v) => !v)}
              title={transparentBackground ? "Transparent — click for white" : "White — click for transparent"}
            />
          </div>

          <div className={styles.actions}>
            <button onClick={handleDownload} className={styles.button} disabled={!qrDataUrl}>
              Download
            </button>
            <button onClick={handlePrint} className={styles.button} disabled={!qrDataUrl}>
              Print
            </button>
          </div>
        </div>

        <div className={styles.previewColumn}>
          <h3 className={styles.previewTitle}>Preview</h3>
          {qrError && <p className={styles.previewError}>{qrError}</p>}
          {qrDataUrl ? (
            // previewFrame clips (rather than lets escape) an extreme
            // negative gap: without a bound, a large pull-up could put the
            // header underneath the app's fixed navbar (z-index ~1100),
            // which no z-index on this component can ever out-rank, since
            // that's a different, globally-fixed stacking layer, not a
            // sibling within this component. Containing it here instead of
            // fighting that z-index is the reliable fix.
            <div className={styles.previewFrame}>
              <div
                className={`${styles.previewWrapper} ${transparentBackground ? styles.checkerboard : ""}`}
                style={{ width: `${previewSize}in`, height: `${previewSize}in` }}
              >
                <img src={qrDataUrl} alt="QR code preview" className={styles.previewImage} />
                {header.trim() && (
                  <div
                    className={`${styles.previewLabel} ${styles.previewHeader}`}
                    style={{
                      bottom: `calc(100% + ${headerGap * previewScale}in)`,
                      fontSize: `${headerFontSize * previewScale}pt`,
                      fontWeight: headerFontWeight,
                      color: headerColor,
                    }}
                  >
                    {header}
                  </div>
                )}
                {footer.trim() && (
                  <div
                    className={`${styles.previewLabel} ${styles.previewFooter}`}
                    style={{
                      top: `calc(100% + ${footerGap * previewScale}in)`,
                      fontSize: `${footerFontSize * previewScale}pt`,
                      fontWeight: footerFontWeight,
                      color: footerColor,
                    }}
                  >
                    {footer}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className={styles.previewPlaceholder}>Enter a URL to see a preview.</p>
          )}
        </div>
      </div>
    </Job>
  );
}
