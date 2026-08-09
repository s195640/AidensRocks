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

// Single source of truth for every control's starting value -- both the
// initial useState calls and the Reset button read from here, so the two
// can never drift apart.
const DEFAULTS = {
  url: "aidensrocks.com",
  sizeInches: 6,
  header: "",
  footer: "",
  headerGap: 0.25,
  footerGap: 0.25,
  headerShiftX: 0,
  footerShiftX: 0,
  headerFontSize: 18,
  footerFontSize: 14,
  // Standard CSS font-weight scale (100=thin .. 900=black); matches this
  // job's previous fixed values (header bold, footer normal) as defaults.
  headerFontWeight: 700,
  footerFontWeight: 400,
  // Transparent by default -- most printed uses paste this onto colored
  // paper/signage, where a stray white square looks worse than nothing.
  transparentBackground: true,
  qrColor: "#000000",
  qrBackgroundColor: "#ffffff",
  headerColor: "#333333",
  footerColor: "#333333",
};

export default function CreateSingleQRCode() {
  const [url, setUrl] = useState(DEFAULTS.url);
  const [sizeInches, setSizeInches] = useState(DEFAULTS.sizeInches);
  const [header, setHeader] = useState(DEFAULTS.header);
  const [footer, setFooter] = useState(DEFAULTS.footer);
  const [headerGap, setHeaderGap] = useState(DEFAULTS.headerGap);
  const [footerGap, setFooterGap] = useState(DEFAULTS.footerGap);
  const [headerShiftX, setHeaderShiftX] = useState(DEFAULTS.headerShiftX);
  const [footerShiftX, setFooterShiftX] = useState(DEFAULTS.footerShiftX);
  const [headerFontSize, setHeaderFontSize] = useState(DEFAULTS.headerFontSize);
  const [footerFontSize, setFooterFontSize] = useState(DEFAULTS.footerFontSize);
  const [headerFontWeight, setHeaderFontWeight] = useState(DEFAULTS.headerFontWeight);
  const [footerFontWeight, setFooterFontWeight] = useState(DEFAULTS.footerFontWeight);
  const [transparentBackground, setTransparentBackground] = useState(DEFAULTS.transparentBackground);
  const [qrColor, setQrColor] = useState(DEFAULTS.qrColor);
  const [qrBackgroundColor, setQrBackgroundColor] = useState(DEFAULTS.qrBackgroundColor);
  const [headerColor, setHeaderColor] = useState(DEFAULTS.headerColor);
  const [footerColor, setFooterColor] = useState(DEFAULTS.footerColor);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrError, setQrError] = useState("");

  // Regenerates when the URL, size, dark-module color, background color, or
  // background transparency changes -- header/footer text, spacing, font
  // size, and color are pure overlay styling applied at render time, so
  // they update the preview instantly without needing the (async) QR image
  // rebuilt.
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
    // actually makes the background transparent, not just visually
    // whatever color is picked. The dark modules (qrColor) always stay
    // fully opaque -- only the background ever goes transparent.
    const color = {
      dark: `${qrColor}ff`,
      light: `${qrBackgroundColor}${transparentBackground ? "00" : "ff"}`,
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
  }, [url, sizeInches, qrColor, qrBackgroundColor, transparentBackground]);

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const trimmedHeader = header.trim();
    const trimmedFooter = footer.trim();
    const qrPx = Math.round(sizeInches * PRINT_DPI);
    // 1pt = 1/72in, so this converts a pt font size into px at PRINT_DPI --
    // keeps header/footer text sized consistently with the QR raster.
    const ptToPx = PRINT_DPI / 72;

    // The composed PNG is built on an offscreen canvas rather than just
    // downloading `qrDataUrl` as-is, so the header/footer text -- and the
    // transparent/solid background behind them -- are baked into the file
    // itself instead of only existing in the on-screen preview/print.
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Word-wraps text to the QR's width (mirrors the print template's
      // `width: 100%` header/footer boxes) and reports the space it'll
      // need, so the canvas can be sized to fit it before anything is drawn.
      const measure = (text, fontSize, fontWeight) => {
        if (!text) return { lines: [], lineHeight: 0, height: 0, fontPx: 0 };
        const fontPx = fontSize * ptToPx;
        const lineHeight = fontPx * 1.2;
        ctx.font = `${fontWeight} ${fontPx}px Verdana, Arial, sans-serif`;
        const words = text.split(/\s+/).filter(Boolean);
        const lines = [];
        let current = words[0];
        for (let i = 1; i < words.length; i++) {
          const attempt = `${current} ${words[i]}`;
          if (ctx.measureText(attempt).width <= qrPx) {
            current = attempt;
          } else {
            lines.push(current);
            current = words[i];
          }
        }
        lines.push(current);
        return { lines, lineHeight, height: lines.length * lineHeight, fontPx };
      };

      const headerInfo = measure(trimmedHeader, headerFontSize, headerFontWeight);
      const footerInfo = measure(trimmedFooter, footerFontSize, footerFontWeight);
      const headerGapPx = headerGap * PRINT_DPI;
      const footerGapPx = footerGap * PRINT_DPI;
      const headerShiftPx = headerShiftX * PRINT_DPI;
      const footerShiftPx = footerShiftX * PRINT_DPI;

      // Vertical extent of the composite, measured from the QR's own
      // top-left (0,0) -- mirrors the print template's
      // `bottom: calc(100% + gap)` / `top: calc(100% + gap)`. Only expands
      // past the QR's own bounds when there's actual text to draw, so an
      // empty header/footer with a leftover gap value doesn't add blank
      // canvas space.
      let minY = 0;
      let maxY = qrPx;
      let headerTop = 0;
      let footerTop = qrPx;
      if (headerInfo.lines.length) {
        headerTop = -headerGapPx - headerInfo.height;
        minY = Math.min(minY, headerTop);
      }
      if (footerInfo.lines.length) {
        footerTop = qrPx + footerGapPx;
        maxY = Math.max(maxY, footerTop + footerInfo.height);
      }

      const originY = -minY;
      canvas.width = qrPx;
      canvas.height = Math.ceil(maxY - minY);

      // Extends the transparent/solid background across the full canvas --
      // including the header/footer space -- not just the QR square.
      if (!transparentBackground) {
        ctx.fillStyle = qrBackgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, originY, qrPx, qrPx);

      const drawLines = (info, color, fontWeight, top, shiftPx) => {
        if (!info.lines.length) return;
        ctx.font = `${fontWeight} ${info.fontPx}px Verdana, Arial, sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const x = qrPx / 2 + shiftPx;
        info.lines.forEach((line, i) => {
          // Centers the glyphs within their line box, approximating how
          // CSS line-height centers a single line of text.
          const y = originY + top + i * info.lineHeight + (info.lineHeight - info.fontPx) / 2;
          ctx.fillText(line, x, y);
        });
      };

      drawLines(headerInfo, headerColor, headerFontWeight, headerTop, headerShiftPx);
      drawLines(footerInfo, footerColor, footerFontWeight, footerTop, footerShiftPx);

      // Derives a readable filename from the URL rather than a generic
      // "qr-code.png" every time, e.g. "aidensrocks-com.png" -- falls back
      // to a fixed name if the URL doesn't leave anything usable.
      const safeName =
        url
          .trim()
          .replace(/^https?:\/\//i, "")
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase() || "qr-code";

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = qrDataUrl;
  };

  const handleReset = () => {
    setUrl(DEFAULTS.url);
    setSizeInches(DEFAULTS.sizeInches);
    setHeader(DEFAULTS.header);
    setFooter(DEFAULTS.footer);
    setHeaderGap(DEFAULTS.headerGap);
    setFooterGap(DEFAULTS.footerGap);
    setHeaderShiftX(DEFAULTS.headerShiftX);
    setFooterShiftX(DEFAULTS.footerShiftX);
    setHeaderFontSize(DEFAULTS.headerFontSize);
    setFooterFontSize(DEFAULTS.footerFontSize);
    setHeaderFontWeight(DEFAULTS.headerFontWeight);
    setFooterFontWeight(DEFAULTS.footerFontWeight);
    setTransparentBackground(DEFAULTS.transparentBackground);
    setQrColor(DEFAULTS.qrColor);
    setQrBackgroundColor(DEFAULTS.qrBackgroundColor);
    setHeaderColor(DEFAULTS.headerColor);
    setFooterColor(DEFAULTS.footerColor);
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
            text-align: center;
            z-index: 2;
          }
          .header {
            bottom: calc(100% + ${headerGap}in);
            transform: translateX(calc(-50% + ${headerShiftX}in));
            font-size: ${headerFontSize}pt;
            font-weight: ${headerFontWeight};
            color: ${headerColor};
          }
          .footer {
            top: calc(100% + ${footerGap}in);
            transform: translateX(calc(-50% + ${footerShiftX}in));
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
          <fieldset className={styles.section}>
            <legend>QR Code</legend>

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

            <div className={styles.colorToggleRow}>
              <ColorPickerField id="single-qr-color" label="Color" value={qrColor} onChange={setQrColor} />
              <ColorPickerField
                id="single-qr-bg-color"
                label="Background"
                value={qrBackgroundColor}
                onChange={setQrBackgroundColor}
              />
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Transparent background</span>
                <ToggleSwitch
                  checked={transparentBackground}
                  onChange={() => setTransparentBackground((v) => !v)}
                  title={
                    transparentBackground
                      ? "Transparent — click for solid background"
                      : "Solid background — click for transparent"
                  }
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend>Header</legend>

            <div className={styles.textColorRow}>
              <div className={styles.textField}>
                <label htmlFor="single-qr-header">Text (optional, printed above the code)</label>
                <input
                  id="single-qr-header"
                  type="text"
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  className={styles.urlInput}
                />
              </div>
              <ColorPickerField
                id="single-qr-header-color"
                label="Color"
                value={headerColor}
                onChange={setHeaderColor}
              />
            </div>

            <div className={styles.sliderGrid}>
              <div>
                <label htmlFor="single-qr-header-gap">
                  Gap: {headerGap}in{headerGap < 0 ? " (overlap)" : ""}
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
              </div>
              <div>
                <label htmlFor="single-qr-header-font">Size: {headerFontSize}pt</label>
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
              </div>
              <div>
                <label htmlFor="single-qr-header-weight">Bold: {headerFontWeight}</label>
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
              </div>
              <div>
                <label htmlFor="single-qr-header-shift">
                  Shift: {headerShiftX}in{headerShiftX ? (headerShiftX > 0 ? " (right)" : " (left)") : ""}
                </label>
                <input
                  id="single-qr-header-shift"
                  type="range"
                  min="-4"
                  max="4"
                  step="0.05"
                  value={headerShiftX}
                  onChange={(e) => setHeaderShiftX(Number(e.target.value))}
                  className={styles.slider}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend>Footer</legend>

            <div className={styles.textColorRow}>
              <div className={styles.textField}>
                <label htmlFor="single-qr-footer">Text (optional, printed below the code)</label>
                <input
                  id="single-qr-footer"
                  type="text"
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  className={styles.urlInput}
                />
              </div>
              <ColorPickerField
                id="single-qr-footer-color"
                label="Color"
                value={footerColor}
                onChange={setFooterColor}
              />
            </div>

            <div className={styles.sliderGrid}>
              <div>
                <label htmlFor="single-qr-footer-gap">
                  Gap: {footerGap}in{footerGap < 0 ? " (overlap)" : ""}
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
              </div>
              <div>
                <label htmlFor="single-qr-footer-font">Size: {footerFontSize}pt</label>
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
              </div>
              <div>
                <label htmlFor="single-qr-footer-weight">Bold: {footerFontWeight}</label>
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
              </div>
              <div>
                <label htmlFor="single-qr-footer-shift">
                  Shift: {footerShiftX}in{footerShiftX ? (footerShiftX > 0 ? " (right)" : " (left)") : ""}
                </label>
                <input
                  id="single-qr-footer-shift"
                  type="range"
                  min="-4"
                  max="4"
                  step="0.05"
                  value={footerShiftX}
                  onChange={(e) => setFooterShiftX(Number(e.target.value))}
                  className={styles.slider}
                />
              </div>
            </div>
          </fieldset>

          <div className={styles.actions}>
            <button onClick={handleDownload} className={styles.button} disabled={!qrDataUrl}>
              Download
            </button>
            <button onClick={handlePrint} className={styles.button} disabled={!qrDataUrl}>
              Print
            </button>
            <button onClick={handleReset} className={`${styles.button} ${styles.resetButton}`}>
              Reset
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
              {/* previewComposite stacks header/QR/footer as normal flow
                  items (gap = margin, which can go negative to overlap) so
                  the transparent-checkerboard/solid background painted on
                  *this* element -- not just the QR square -- visually
                  extends across the header/footer text, matching what
                  handleDownload/handlePrint actually produce. */}
              <div
                className={`${styles.previewComposite} ${transparentBackground ? styles.checkerboard : ""}`}
                style={{
                  width: `${previewSize}in`,
                  backgroundColor: transparentBackground ? undefined : qrBackgroundColor,
                }}
              >
                {header.trim() && (
                  <div
                    className={styles.previewLabel}
                    style={{
                      marginBottom: `${headerGap * previewScale}in`,
                      transform: `translateX(${headerShiftX * previewScale}in)`,
                      fontSize: `${headerFontSize * previewScale}pt`,
                      fontWeight: headerFontWeight,
                      color: headerColor,
                    }}
                  >
                    {header}
                  </div>
                )}
                <div
                  className={styles.previewImageWrapper}
                  style={{ width: `${previewSize}in`, height: `${previewSize}in` }}
                >
                  <img src={qrDataUrl} alt="QR code preview" className={styles.previewImage} />
                </div>
                {footer.trim() && (
                  <div
                    className={styles.previewLabel}
                    style={{
                      marginTop: `${footerGap * previewScale}in`,
                      transform: `translateX(${footerShiftX * previewScale}in)`,
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
