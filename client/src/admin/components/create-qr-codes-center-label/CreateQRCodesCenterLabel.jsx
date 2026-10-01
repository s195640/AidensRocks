import axios from "axios";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import Job from "../job/Job";
import ToggleSwitch from "../../../components/simple-components/toggle-switch/ToggleSwitch";
import ColorPickerField from "../../../components/simple-components/color-picker-field/ColorPickerField";
import styles from "./CreateQRCodesCenterLabel.module.css";

// Experimental sibling of "Create QR Codes" -- same printed sheet, plus the
// rock number punched into the middle of each code and controls to tune
// everything. The original job is intentionally left untouched.

// Approximate share of damaged codewords each level can recover from.
const EC_LEVELS = [
  { value: "L", label: "L (~7%)", recovery: 0.07 },
  { value: "M", label: "M (~15%)", recovery: 0.15 },
  { value: "Q", label: "Q (~25%)", recovery: 0.25 },
  { value: "H", label: "H (~30%)", recovery: 0.3 },
];

const SHAPES = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "circle", label: "Circle" },
  { value: "rectangle", label: "Rectangle" },
  { value: "oval", label: "Oval" },
];

// These shapes get independent width/height controls; the rest are square
// and use the single box size.
const isFreeAspect = (shape) => shape === "rectangle" || shape === "oval";

const BORDER_RADIUS = {
  square: "0",
  rounded: "20%",
  circle: "50%",
  rectangle: "0",
  oval: "50%",
};

// `google` is the Google Fonts css2 family spec (null = system font). Each
// lists only weights that family actually has -- css2 rejects the whole
// request if any requested weight doesn't exist. Fonts lacking a weight
// fall back to the nearest one the browser has.
const FONTS = {
  barlowCondensed: {
    label: "Barlow Condensed",
    css: "'Barlow Condensed', Arial, sans-serif",
    google: "Barlow+Condensed:wght@100;200;300;400;500;600;700;800;900",
  },
  robotoCondensed: {
    label: "Roboto Condensed",
    css: "'Roboto Condensed', Arial, sans-serif",
    google: "Roboto+Condensed:wght@100..900",
  },
  oswald: { label: "Oswald", css: "'Oswald', Arial, sans-serif", google: "Oswald:wght@200..700" },
  bebasNeue: { label: "Bebas Neue (one weight)", css: "'Bebas Neue', Arial, sans-serif", google: "Bebas+Neue" },
  montserrat: { label: "Montserrat", css: "'Montserrat', Arial, sans-serif", google: "Montserrat:wght@100..900" },
  roboto: { label: "Roboto", css: "'Roboto', Arial, sans-serif", google: "Roboto:wght@100..900" },
  robotoMono: { label: "Roboto Mono", css: "'Roboto Mono', monospace", google: "Roboto+Mono:wght@100..700" },
  arial: { label: "Arial", css: "Arial, sans-serif", google: null },
  verdana: { label: "Verdana", css: "Verdana, Arial, sans-serif", google: null },
};

// Only links the fonts actually in use, so a sheet doesn't pull down every
// family on the list.
const fontLink = (s) => {
  const used = [s.showCenter && s.centerFont, s.showTop && s.topFont, s.showBottom && s.bottomFont];
  const specs = [...new Set(used.filter(Boolean).map((f) => FONTS[f].google).filter(Boolean))];
  if (!specs.length) return "";
  return `<link href="https://fonts.googleapis.com/css2?${specs.map((f) => `family=${f}`).join("&")}&display=swap" rel="stylesheet">`;
};

// On-screen preview of a single code is zoomed up to this size (inches) so
// tiny print sizes are actually inspectable.
const PREVIEW_INCHES = 3;

// Single source of truth for every control's starting value -- both the
// initial useState and the Reset button read from here. Label/gap defaults
// reproduce the original "Create QR Codes" sheet (0.75in codes, 11 per row,
// labels tucked into the quiet zone).
const DEFAULTS = {
  count: 110,
  sizeInches: 0.75,
  errorCorrection: "H",
  quietZone: 4,
  qrColor: "#000000",
  colGap: -0.05,
  rowGap: 0.2,
  showCenter: true,
  centerPct: 24,
  centerWidthPct: 32,
  centerHeightPct: 18,
  centerShape: "rounded",
  centerPrefix: "",
  centerFontSize: 7,
  centerFontWeight: 600,
  centerTextColor: "#000000",
  centerCornerPct: 0,
  centerBorder: false,
  centerBorderColor: "#000000",
  centerBorderWidth: 0.5,
  centerFont: "barlowCondensed",
  showTop: true,
  topText: "aidensrocks.com",
  topFont: "barlowCondensed",
  topFontSize: 7,
  topFontWeight: 400,
  topColor: "#000000",
  topOffset: -0.05,
  showBottom: false,
  bottomText: "rock: {n}",
  bottomFont: "barlowCondensed",
  bottomFontSize: 7,
  bottomFontWeight: 400,
  bottomColor: "#000000",
  bottomOffset: -0.05,
};

// Labels are free text embedded into a raw HTML string (written via
// document.write / srcDoc, not React) -- escape so a stray `<`/`&`/quote
// can't break the page's markup.
const escapeHtml = (str) =>
  String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const rockUrl = (n) => `https://aidensrocks.com/qr?r=${n}`;

// Builds one code as an SVG data URL (crisp at any print size, unlike a
// small PNG scaled up) plus the grid geometry the center box needs.
const buildCode = async (n, s) => {
  const url = rockUrl(n);
  const opts = { errorCorrectionLevel: s.errorCorrection, margin: s.quietZone };
  const { modules, version } = QRCode.create(url, opts);
  // Transparent light modules (8-digit hex, "00" alpha) so overlapping
  // quiet zones don't paint white over a neighboring code.
  const svg = await QRCode.toString(url, {
    ...opts,
    type: "svg",
    color: { dark: `${s.qrColor}ff`, light: "#ffffff00" },
  });
  const moduleCount = modules.size;
  const moduleInches = s.sizeInches / (moduleCount + 2 * s.quietZone);

  // Snaps each side of the center box to a whole, odd number of modules so
  // it sits exactly on the grid around the (odd-sized) code's center
  // module, instead of slicing modules in half along its edges.
  const snap = (pct) => {
    const m = Math.max(1, Math.round((pct / 100) * moduleCount));
    return m % 2 === 0 ? m + 1 : m;
  };
  const freeAspect = isFreeAspect(s.centerShape);
  const boxWModules = snap(freeAspect ? s.centerWidthPct : s.centerPct);
  const boxHModules = snap(freeAspect ? s.centerHeightPct : s.centerPct);

  // Function patterns (finders, timing lines, alignment marks, format info)
  // are what a reader uses to locate the code at all -- error correction
  // can't repair them, so covering any is flagged separately. Only data
  // modules count toward coverage. Uses the bounding box even for
  // circle/oval: modules clipped by the curve are still damaged.
  const x0 = Math.max(0, (moduleCount - boxWModules) / 2);
  const y0 = Math.max(0, (moduleCount - boxHModules) / 2);
  const x1 = Math.min(moduleCount, x0 + boxWModules);
  const y1 = Math.min(moduleCount, y0 + boxHModules);
  let coveredData = 0;
  let coveredFunction = 0;
  let totalData = 0;
  for (let i = 0; i < modules.reservedBit.length; i++) {
    const reserved = modules.reservedBit[i];
    if (!reserved) totalData++;
    const r = Math.floor(i / moduleCount);
    const c = i % moduleCount;
    if (r >= y0 && r < y1 && c >= x0 && c < x1) {
      if (reserved) coveredFunction++;
      else coveredData++;
    }
  }

  return {
    n,
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    version,
    moduleCount,
    moduleInches,
    boxWModules,
    boxHModules,
    boxWInches: boxWModules * moduleInches,
    boxHInches: boxHModules * moduleInches,
    coverage: coveredData / totalData,
    coversFunctionPatterns: coveredFunction > 0,
  };
};

const fillText = (template, n) => template.replaceAll("{n}", n);

// Shared by the on-screen preview (iframe srcDoc) and the print window, so
// the preview is the exact same markup/CSS that prints.
const buildStyles = (s) => `
  body {
    margin: .1in;
  }
  .qr-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }
  /* Entry width is size + column gap, which may be negative: quiet zones
     are blank (transparent), so neighboring codes can overlap them. The
     wrapper keeps its full size and overflows the entry evenly on both
     sides. Row gap is a bottom margin rather than CSS row-gap, which can't
     go negative -- a negative margin shrinks each flex line so the next
     row overlaps this one. */
  .qr-entry {
    width: ${Math.max(0.1, s.sizeInches + s.colGap)}in;
    margin-bottom: ${Math.max(-s.sizeInches + 0.1, s.rowGap)}in;
    display: flex;
    justify-content: center;
  }
  .qr-image-wrapper {
    position: relative;
    flex-shrink: 0;
    width: ${s.sizeInches}in;
    height: ${s.sizeInches}in;
  }
  .qr-image-wrapper img {
    display: block;
    width: 100%;
    height: 100%;
  }
  .qr-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    background: white;
    color: ${s.centerTextColor};
    ${s.centerBorder ? `border: ${s.centerBorderWidth}pt solid ${s.centerBorderColor};` : ""}
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${FONTS[s.centerFont].css};
    font-size: ${s.centerFontSize}pt;
    font-weight: ${s.centerFontWeight};
    line-height: 1;
    white-space: nowrap;
  }
  .qr-top-label,
  .qr-bottom-label {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    line-height: 1;
    padding: 1px 2px;
    white-space: nowrap;
  }
  .qr-top-label {
    top: ${s.topOffset}in;
    font-family: ${FONTS[s.topFont].css};
    font-size: ${s.topFontSize}pt;
    font-weight: ${s.topFontWeight};
    color: ${s.topColor};
  }
  .qr-bottom-label {
    bottom: ${s.bottomOffset}in;
    font-family: ${FONTS[s.bottomFont].css};
    font-size: ${s.bottomFontSize}pt;
    font-weight: ${s.bottomFontWeight};
    color: ${s.bottomColor};
  }
`;

// Rectangle corners are rounded by an absolute radius (a share of the
// shorter side) rather than a %, which would give lopsided elliptical
// corners on a non-square box. 50% of the shorter side = pill shape.
const centerRadius = (code, s) =>
  s.centerShape === "rectangle"
    ? `${(s.centerCornerPct / 100) * Math.min(code.boxWInches, code.boxHInches)}in`
    : BORDER_RADIUS[s.centerShape];

const buildEntry = (code, s) => {
  const center = s.showCenter
    ? `<div class="qr-center" style="width:${code.boxWInches}in;height:${code.boxHInches}in;border-radius:${centerRadius(
        code,
        s
      )}">${escapeHtml(
        `${s.centerPrefix}${code.n}`
      )}</div>`
    : "";
  const top = s.showTop ? `<div class="qr-top-label">${escapeHtml(fillText(s.topText, code.n))}</div>` : "";
  const bottom = s.showBottom
    ? `<div class="qr-bottom-label">${escapeHtml(fillText(s.bottomText, code.n))}</div>`
    : "";
  return `
    <div class="qr-entry">
      <div class="qr-image-wrapper">
        ${top}
        <img src="${code.dataUrl}" alt="QR ${code.n}" />
        ${center}
        ${bottom}
      </div>
    </div>
  `;
};

const buildDocument = (codes, s, { title, bodyStyle = "", script = "" }) => `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title}</title>
    ${fontLink(s)}
    <style>${buildStyles(s)}${bodyStyle}</style>
  </head>
  <body>
    <div class="qr-grid">
      ${codes.map((c) => buildEntry(c, s)).join("")}
    </div>
    ${script}
  </body>
  </html>
`;

// Row name in the generic `setting` table (server/src/routes/settingsAdmin.js)
// holding this job's last-used controls.
const SETTING_NAME = "qr-center-label";

// Choice-type controls, checked on load so a saved value that no longer
// exists (e.g. a font later removed from FONTS) can't crash the page.
const CHOICES = {
  errorCorrection: EC_LEVELS.map((l) => l.value),
  centerShape: SHAPES.map((sh) => sh.value),
  centerFont: Object.keys(FONTS),
  topFont: Object.keys(FONTS),
  bottomFont: Object.keys(FONTS),
};

// Starts from DEFAULTS and only takes saved values for known keys of the
// same type -- keys added since the last save keep their defaults, and
// anything stale or malformed is ignored.
const sanitizeSaved = (saved) => {
  const result = { ...DEFAULTS };
  if (!saved || typeof saved !== "object") return result;
  for (const key of Object.keys(DEFAULTS)) {
    const value = saved[key];
    if (typeof value !== typeof DEFAULTS[key]) continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    if (CHOICES[key] && !CHOICES[key].includes(value)) continue;
    if (key.endsWith("Color") && !/^#[0-9a-f]{6}$/i.test(value)) continue;
    result[key] = value;
  }
  return result;
};

const FontSelect = ({ id, value, onChange, disabled }) => (
  <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={styles.select}
    disabled={disabled}>
    {Object.entries(FONTS).map(([key, f]) => (
      <option key={key} value={key}>{f.label}</option>
    ))}
  </select>
);

// Top and bottom labels share this layout but read/write their own
// `${prefix}*` settings, so each is styled independently.
const LabelSection = ({ title, prefix, s, set, setNum }) => {
  const key = (name) => `${prefix}${name}`;
  const showKey = `show${prefix[0].toUpperCase()}${prefix.slice(1)}`;
  const shown = s[showKey];
  const id = (name) => `qrc-${prefix}-${name}`;
  return (
    <fieldset className={styles.section}>
      <legend>{title}</legend>
      <div className={styles.labelRow}>
        <ToggleSwitch checked={shown} onChange={() => set(showKey)(!shown)} title={`Show ${title.toLowerCase()}`} />
        <input type="text" value={s[key("Text")]} onChange={(e) => set(key("Text"))(e.target.value)}
          className={styles.textInput} disabled={!shown} aria-label={`${title} text`} />
      </div>
      <p className={styles.hint}>Use {"{n}"} for the rock number.</p>
      <div className={styles.grid}>
        <div>
          <label htmlFor={id("family")}>Font</label>
          <FontSelect id={id("family")} value={s[key("Font")]} onChange={set(key("Font"))} disabled={!shown} />
        </div>
        <div>
          <label htmlFor={id("size")}>Font size: {s[key("FontSize")]}pt</label>
          <input id={id("size")} type="range" min="3" max="24" step="0.5" value={s[key("FontSize")]}
            onChange={setNum(key("FontSize"))} className={styles.slider} disabled={!shown} />
        </div>
        <div>
          <label htmlFor={id("weight")}>Bold: {s[key("FontWeight")]}</label>
          <input id={id("weight")} type="range" min="100" max="900" step="100" value={s[key("FontWeight")]}
            onChange={setNum(key("FontWeight"))} className={styles.slider} disabled={!shown} />
        </div>
        <div>
          <label htmlFor={id("offset")}>Offset: {s[key("Offset")]}in</label>
          <input id={id("offset")} type="range" min="-0.5" max="0.25" step="0.01" value={s[key("Offset")]}
            onChange={setNum(key("Offset"))} className={styles.slider} disabled={!shown} />
        </div>
      </div>
      <div className={styles.colorRow}>
        <ColorPickerField id={id("color")} label="Color" value={s[key("Color")]} onChange={set(key("Color"))} />
      </div>
    </fieldset>
  );
};

const CreateQRCodesCenterLabel = () => {
  const [rangeStart, setRangeStart] = useState(101);
  const [s, setS] = useState(DEFAULTS);
  const [previewCode, setPreviewCode] = useState(null);
  const [gridCodes, setGridCodes] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const [printing, setPrinting] = useState(false);
  // Saving stays off until the stored settings have been loaded, so the
  // initial DEFAULTS never overwrite them during startup.
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const lastSavedJson = useRef(null);

  const set = (key) => (value) => setS((prev) => ({ ...prev, [key]: value }));
  const setNum = (key) => (e) => set(key)(Number(e.target.value));

  useEffect(() => {
    axios
      .get(`/api/admin/settings/${SETTING_NAME}`)
      .then(({ data }) => {
        const restored = sanitizeSaved(data.value);
        lastSavedJson.current = JSON.stringify(restored);
        setS(restored);
      })
      .catch(() => {
        // 404 = never saved yet; any other failure also just keeps DEFAULTS.
      })
      .finally(() => setLoaded(true));
  }, []);

  // Auto-saves 1s after the last change.
  useEffect(() => {
    if (!loaded) return undefined;
    const json = JSON.stringify(s);
    if (json === lastSavedJson.current) return undefined;

    const timer = setTimeout(() => {
      axios
        .put(`/api/admin/settings/${SETTING_NAME}`, {
          value: s,
          type: "admin-job",
          description: "Create QR Codes (Center Label) job controls",
        })
        .then(() => {
          lastSavedJson.current = json;
          setSaveStatus("Saved");
        })
        .catch(() => setSaveStatus("Couldn't save settings"));
    }, 1000);
    return () => clearTimeout(timer);
  }, [s, loaded]);

  useEffect(() => {
    const loadDefaultRangeStart = async () => {
      const res = await axios.get("/api/rocks");
      const maxRockNumber = res.data.reduce((max, rock) => Math.max(max, rock.rock_number), 0);
      setRangeStart(maxRockNumber + 1);
    };
    loadDefaultRangeStart();
  }, []);

  // Previews the *last* rock in the range: the longest number is the one
  // most likely to bump the code to a denser version or overflow the box.
  const rangeEnd = rangeStart + Math.max(1, s.count) - 1;

  useEffect(() => {
    let cancelled = false;
    buildCode(rangeEnd, s)
      .then((code) => {
        if (!cancelled) {
          setPreviewCode(code);
          setPreviewError("");
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewError("Failed to generate QR code.");
      });
    return () => {
      cancelled = true;
    };
  }, [rangeEnd, s]);

  // 3x3 block of the first rocks in the range, laid out exactly like the
  // printed sheet -- for judging the column/row gaps and label spacing.
  useEffect(() => {
    let cancelled = false;
    const numbers = Array.from({ length: 9 }, (_, i) => rangeStart + i);
    Promise.all(numbers.map((n) => buildCode(n, s)))
      .then((codes) => {
        if (!cancelled) setGridCodes(codes);
      })
      .catch(() => {
        if (!cancelled) setGridCodes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeStart, s]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const codes = [];
      for (let i = rangeStart; i <= rangeEnd; i++) {
        codes.push(await buildCode(i, s));
      }
      const htmlContent = buildDocument(codes, s, {
        title: "QR Code Sheet",
        // Waits for web fonts too, so labels don't print in the fallback font.
        script:
          "<script>window.onload = () => document.fonts.ready.then(() => setTimeout(() => window.print(), 250));</script>",
      });

      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      } else {
        alert("Popup blocked! Please allow popups and try again.");
      }
    } finally {
      setPrinting(false);
    }
  };

  const ecRecovery = EC_LEVELS.find((l) => l.value === s.errorCorrection).recovery;
  // Rule of thumb: keep the covered area under about half of what the
  // error correction can recover, leaving headroom for print/scan noise.
  const coverageRisk = !previewCode || !s.showCenter
    ? "ok"
    : previewCode.coversFunctionPatterns || previewCode.coverage > ecRecovery * 0.75
      ? "high"
      : previewCode.coverage > ecRecovery * 0.5
        ? "medium"
        : "ok";

  const previewZoom = PREVIEW_INCHES / s.sizeInches;
  const previewDoc = previewCode
    ? buildDocument([previewCode], s, {
        title: "Preview",
        // Margin is divided by the zoom so it stays ~0.3in on screen --
        // room for labels pushed outside the code by the offset slider.
        bodyStyle: `html, body { overflow: hidden; } body { zoom: ${previewZoom}; margin: ${0.3 / previewZoom}in; } .qr-grid { justify-content: flex-start; }`,
      })
    : "";

  // 3x3 spacing preview: the grid is pinned to exactly 3 entries wide, so
  // it wraps into 3 rows of 3. With a negative column gap the outer codes
  // overhang their entries by `overhang` on each side, so that's added as
  // grid margin to keep them inside the frame.
  const entryW = Math.max(0.1, s.sizeInches + s.colGap);
  const overhang = Math.max(0, (s.sizeInches - entryW) / 2);
  const gridContentW = 3 * entryW + 2 * overhang;
  const rowGapEff = Math.max(-s.sizeInches + 0.1, s.rowGap);
  const gridContentH = 3 * s.sizeInches + 2 * rowGapEff;
  const gridZoom = Math.min(4, PREVIEW_INCHES / Math.max(gridContentW, gridContentH));
  const gridFrameW = gridContentW * gridZoom + 0.7;
  const gridFrameH = gridContentH * gridZoom + 0.7;
  const gridDoc = gridCodes.length
    ? buildDocument(gridCodes, s, {
        title: "Spacing preview",
        bodyStyle: `html, body { overflow: hidden; } body { zoom: ${gridZoom}; margin: ${0.3 / gridZoom}in; }
          .qr-grid { width: ${3 * entryW}in; margin: 0 ${overhang}in; justify-content: flex-start; }`,
      })
    : "";

  return (
    <Job title="Create QR Codes (Center Label)">
      <div className={styles.layout}>
        <div className={styles.formColumn}>
          <fieldset className={styles.section}>
            <legend>Sheet</legend>
            <div className={styles.grid}>
              <div>
                <label htmlFor="qrc-start">Start rock</label>
                <input
                  id="qrc-start"
                  type="number"
                  min="1"
                  max="100000"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Number(e.target.value))}
                  className={styles.numberInput}
                />
              </div>
              <div>
                <label htmlFor="qrc-count">How many</label>
                <input
                  id="qrc-count"
                  type="number"
                  min="1"
                  max="500"
                  value={s.count}
                  onChange={setNum("count")}
                  className={styles.numberInput}
                />
              </div>
              <div>
                <label htmlFor="qrc-colgap">
                  Column gap: {s.colGap}in{s.colGap < 0 ? " (overlap)" : ""}
                </label>
                <input id="qrc-colgap" type="range" min="-1" max="0.5" step="0.01"
                  value={s.colGap} onChange={setNum("colGap")} className={styles.slider} />
              </div>
              <div>
                <label htmlFor="qrc-rowgap">
                  Row gap: {s.rowGap}in{s.rowGap < 0 ? " (overlap)" : ""}
                </label>
                <input id="qrc-rowgap" type="range" min="-1" max="0.5" step="0.01"
                  value={s.rowGap} onChange={setNum("rowGap")} className={styles.slider} />
              </div>
            </div>
            <p className={styles.hint}>Rocks {rangeStart} to {rangeEnd}</p>
          </fieldset>

          <fieldset className={styles.section}>
            <legend>QR Code</legend>
            <div className={styles.grid}>
              <div>
                <label htmlFor="qrc-size">Print size: {s.sizeInches}in</label>
                <input id="qrc-size" type="range" min="0.5" max="3" step="0.05"
                  value={s.sizeInches} onChange={setNum("sizeInches")} className={styles.slider} />
              </div>
              <div>
                <label htmlFor="qrc-ec">Error correction</label>
                <select id="qrc-ec" value={s.errorCorrection}
                  onChange={(e) => set("errorCorrection")(e.target.value)} className={styles.select}>
                  {EC_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="qrc-quiet">Quiet zone: {s.quietZone} modules</label>
                <input id="qrc-quiet" type="range" min="0" max="6" step="1"
                  value={s.quietZone} onChange={setNum("quietZone")} className={styles.slider} />
              </div>
            </div>
            <div className={styles.colorRow}>
              <ColorPickerField id="qrc-color" label="QR color" value={s.qrColor} onChange={set("qrColor")} />
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend>Center Label</legend>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Show rock number in center</span>
              <ToggleSwitch checked={s.showCenter} onChange={() => set("showCenter")(!s.showCenter)} />
            </div>
            <div className={styles.grid}>
              <div>
                <label htmlFor="qrc-center-shape">Shape</label>
                <select id="qrc-center-shape" value={s.centerShape}
                  onChange={(e) => set("centerShape")(e.target.value)} className={styles.select}
                  disabled={!s.showCenter}>
                  {SHAPES.map((sh) => (
                    <option key={sh.value} value={sh.value}>{sh.label}</option>
                  ))}
                </select>
              </div>
              {isFreeAspect(s.centerShape) ? (
                <>
                  <div>
                    <label htmlFor="qrc-center-w">Width: {s.centerWidthPct}% of code</label>
                    <input id="qrc-center-w" type="range" min="8" max="70" step="1"
                      value={s.centerWidthPct} onChange={setNum("centerWidthPct")} className={styles.slider}
                      disabled={!s.showCenter} />
                  </div>
                  <div>
                    <label htmlFor="qrc-center-h">Height: {s.centerHeightPct}% of code</label>
                    <input id="qrc-center-h" type="range" min="8" max="70" step="1"
                      value={s.centerHeightPct} onChange={setNum("centerHeightPct")} className={styles.slider}
                      disabled={!s.showCenter} />
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="qrc-center-pct">Box size: {s.centerPct}% of code</label>
                  <input id="qrc-center-pct" type="range" min="8" max="45" step="1"
                    value={s.centerPct} onChange={setNum("centerPct")} className={styles.slider}
                    disabled={!s.showCenter} />
                </div>
              )}
              <div>
                <label htmlFor="qrc-center-family">Font</label>
                <FontSelect id="qrc-center-family" value={s.centerFont} onChange={set("centerFont")}
                  disabled={!s.showCenter} />
              </div>
              <div>
                <label htmlFor="qrc-center-font">Font size: {s.centerFontSize}pt</label>
                <input id="qrc-center-font" type="range" min="3" max="36" step="0.5"
                  value={s.centerFontSize} onChange={setNum("centerFontSize")} className={styles.slider}
                  disabled={!s.showCenter} />
              </div>
              <div>
                <label htmlFor="qrc-center-weight">Bold: {s.centerFontWeight}</label>
                <input id="qrc-center-weight" type="range" min="100" max="900" step="100"
                  value={s.centerFontWeight} onChange={setNum("centerFontWeight")} className={styles.slider}
                  disabled={!s.showCenter} />
              </div>
              <div>
                <label htmlFor="qrc-center-prefix">Prefix (e.g. #)</label>
                <input id="qrc-center-prefix" type="text" value={s.centerPrefix}
                  onChange={(e) => set("centerPrefix")(e.target.value)} className={styles.textInput}
                  disabled={!s.showCenter} />
              </div>
              {s.centerShape === "rectangle" && (
                <div>
                  <label htmlFor="qrc-center-corner">Corner rounding: {s.centerCornerPct}%</label>
                  <input id="qrc-center-corner" type="range" min="0" max="50" step="1"
                    value={s.centerCornerPct} onChange={setNum("centerCornerPct")} className={styles.slider}
                    disabled={!s.showCenter} />
                </div>
              )}
            </div>
            <div className={styles.colorRow}>
              <ColorPickerField id="qrc-center-text-color" label="Text color" value={s.centerTextColor}
                onChange={set("centerTextColor")} />
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Border</span>
              <ToggleSwitch checked={s.centerBorder} onChange={() => set("centerBorder")(!s.centerBorder)}
                disabled={!s.showCenter} />
            </div>
            {s.centerBorder && (
              <div className={styles.colorRow}>
                <ColorPickerField id="qrc-center-border-color" label="Border color" value={s.centerBorderColor}
                  onChange={set("centerBorderColor")} />
                <div className={styles.colorRowSlider}>
                  <label htmlFor="qrc-center-border-width">Thickness: {s.centerBorderWidth}pt</label>
                  <input id="qrc-center-border-width" type="range" min="0.25" max="4" step="0.25"
                    value={s.centerBorderWidth} onChange={setNum("centerBorderWidth")} className={styles.slider}
                    disabled={!s.showCenter} />
                </div>
              </div>
            )}
          </fieldset>

          <LabelSection title="Top Label" prefix="top" s={s} set={set} setNum={setNum} />
          <LabelSection title="Bottom Label" prefix="bottom" s={s} set={set} setNum={setNum} />

          <div className={styles.actions}>
            <button onClick={handlePrint} className={styles.button} disabled={printing || !previewCode}>
              {printing ? "Building..." : "Print Preview"}
            </button>
            <button onClick={() => setS(DEFAULTS)} className={`${styles.button} ${styles.resetButton}`}>
              Reset
            </button>
            {saveStatus && (
              <span className={saveStatus === "Saved" ? styles.saveStatus : styles.saveError}>{saveStatus}</span>
            )}
          </div>
        </div>

        <div className={styles.previewColumn}>
          <h3 className={styles.previewTitle}>Preview (rock {rangeEnd}, enlarged)</h3>
          {previewError && <p className={styles.previewError}>{previewError}</p>}
          {previewCode && (
            <>
              <iframe title="QR preview" srcDoc={previewDoc}
                className={styles.previewFrame}
                style={{ width: `${PREVIEW_INCHES + 0.7}in`, height: `${PREVIEW_INCHES + 0.7}in` }}
              />
              <ul className={styles.stats}>
                <li>
                  Version {previewCode.version} &middot; {previewCode.moduleCount}&times;{previewCode.moduleCount} modules
                </li>
                <li>Module size: {(previewCode.moduleInches * 25.4).toFixed(2)}mm</li>
                {s.showCenter && (
                  <li className={styles[`risk_${coverageRisk}`]}>
                    Center box: {previewCode.boxWModules}&times;{previewCode.boxHModules} modules, covers ~
                    {(previewCode.coverage * 100).toFixed(1)}% of data (level {s.errorCorrection} recovers ~
                    {Math.round(ecRecovery * 100)}%)
                    {previewCode.coversFunctionPatterns && " - overlaps the code's fixed patterns (corner squares/timing lines/alignment mark)"}
                    {coverageRisk === "high" && " - likely won't scan"}
                    {coverageRisk === "medium" && " - may be unreliable"}
                  </li>
                )}
                {previewCode.moduleInches * 25.4 < 0.4 && (
                  <li className={styles.risk_medium}>Modules under 0.4mm may not print cleanly.</li>
                )}
              </ul>
            </>
          )}
          {gridCodes.length > 0 && (
            <>
              <h3 className={styles.previewTitle}>Spacing (3&times;3)</h3>
              <iframe title="QR spacing preview" srcDoc={gridDoc} className={styles.previewFrame}
                style={{ width: `${gridFrameW}in`, height: `${gridFrameH}in` }} />
              <p className={styles.hint}>Shown at {gridZoom.toFixed(1)}&times; actual size.</p>
            </>
          )}
        </div>
      </div>
    </Job>
  );
};

export default CreateQRCodesCenterLabel;
