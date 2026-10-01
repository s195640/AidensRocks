# QR Center Label — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase.

## Phase 1 — Experimental "Create QR Codes (Center Label)" job (2026-10-01)
**Status:** Complete (awaiting manual print/scan testing)
**Files changed:**
- New: `client/src/admin/components/create-qr-codes-center-label/CreateQRCodesCenterLabel.jsx` (+ `.module.css`), this file
- Changed: `client/src/admin/pages/jobs/Jobs.jsx`, `VERSION`

**Summary:**
- New Jobs-page widget placed directly under "Create QR Codes", which is left untouched so the two can be compared side by side.
- Same sheet output as the original (`https://aidensrocks.com/qr?r=N`, default range starts at max rock + 1), plus the rock number in a white box in the middle of each code.
- Controls: start rock, count, column and row gap; print size, error correction level (default H), quiet zone; center label on/off, box size, font size and weight, shape, prefix; top and bottom labels on/off with `{n}` template text, font size, offset; Reset.
- Codes are rendered as SVG (crisp at any print size) rather than the original's small default PNG.
- The center box snaps to an odd whole number of modules so it lines up with the code's grid.
- Live preview shows the *last* rock in the range, enlarged, using the exact same HTML/CSS as the print window (iframe `srcDoc`). It also shows the version, module size, and an estimate of how much of the code the center box covers compared with what the error correction level can recover.
- Defaults reproduce the original sheet's layout: 0.75in codes, an effective 0.7in column pitch via a −0.05in column gap (overlapping quiet zones), and a 0.2in row gap. The bottom `rock: {n}` label is off by default because the number is now in the center.
- **VERSION:** `0.5.20` → `0.6.0` (new feature folder).

**Issues/gotchas encountered:**
- At level H, the URL needs a version 4 code (33×33 modules) instead of version 3 (29×29) at the default M level. At 0.75in with a 4-module quiet zone, each module is about 0.46mm.
- The preview iframe relies on CSS `zoom` (supported in Chrome and Firefox 126+).

**Open questions for human review:**
1. Once testing settles on good values, should the original job adopt them, or should this job replace it?

## Phase 2 — Rectangle and oval center shapes (2026-10-01)
**Status:** Complete (awaiting manual print/scan testing)
**Files changed:**
- Changed: `client/src/admin/components/create-qr-codes-center-label/CreateQRCodesCenterLabel.jsx`, `VERSION`, this file

**Summary:**
- Added Rectangle and Oval center shapes. Each has separate Width and Height sliders (8–70% of the code, defaults 32% × 18%). Square, Rounded and Circle keep the single Box size slider. The Shape dropdown now comes first, so the size controls below it match the chosen shape.
- Each side snaps to an odd whole number of modules.
- The coverage estimate now counts only the data modules under the box, using the library's function-pattern map (`modules.reservedBit`). It was previously the box area as a share of the whole code.
- A box that overlaps any function pattern (finder squares, timing lines, alignment mark, format info) is flagged as high risk with its own message, because error correction can't repair those. Wide rectangles and ovals hit the vertical timing line first; for example, a 70% × 18% box covers 7 timing modules.
- **VERSION:** `0.6.0` → `0.6.1`.

**Issues/gotchas encountered:** None.

## Phase 3 — Center text color, border, rectangle corner rounding (2026-10-01)
**Status:** Complete (awaiting manual print/scan testing)
**Files changed:**
- Changed: `client/src/admin/components/create-qr-codes-center-label/CreateQRCodesCenterLabel.jsx` (+ `.module.css`), `VERSION`, this file

**Summary:**
- Center text color picker (default black), using the shared `ColorPickerField`.
- Border toggle (default off). When on, it shows a border color picker and a thickness slider (0.25–4pt, default 0.5pt). The border is drawn *inside* the box (`box-sizing: border-box`), so turning it on doesn't grow the box or change the coverage numbers.
- Rectangle-only "Corner rounding" slider, 0–50% of the box's shorter side; 50% gives a pill shape. It uses an absolute radius instead of a CSS %, which would give lopsided elliptical corners on a non-square box. The border-radius moved from the shared stylesheet to each entry's inline style because it now depends on that code's box size.
- **VERSION:** `0.6.1` → `0.6.2`.

**Issues/gotchas encountered:** None.

## Phase 4 — Independent label font, size, color, boldness (2026-10-01)
**Status:** Complete (awaiting manual print/scan testing)
**Files changed:**
- Changed: `client/src/admin/components/create-qr-codes-center-label/CreateQRCodesCenterLabel.jsx`, `VERSION`, this file

**Summary:**
- The shared "Top / Bottom Labels" section is split into separate "Top Label" and "Bottom Label" sections (one `LabelSection` component used twice). Each has its own on/off switch, text, font, size, bold, offset and color. Offset is now per-label too.
- Added a Font dropdown to the center label as well, so all three labels pick their fonts the same way.
- Font choices: Barlow Condensed (default, matches the original job), Roboto Condensed, Oswald, Bebas Neue (one weight only), Montserrat, Roboto, Roboto Mono, Arial, Verdana. The Google Fonts link only requests fonts that are actually in use. Each family's weight spec was checked against the css2 API (all return 200).
- The print window now waits for `document.fonts.ready` before opening the print dialog, so web fonts don't print as the fallback font.
- **VERSION:** `0.6.2` → `0.6.3`.

**Issues/gotchas encountered:**
- Google Fonts css2 rejects the whole request if any requested weight doesn't exist for a family, so each font lists only its real weights.

## Phase 5 — 3×3 spacing preview (2026-10-01)
**Status:** Complete (awaiting manual review)
**Files changed:**
- Changed: `client/src/admin/components/create-qr-codes-center-label/CreateQRCodesCenterLabel.jsx`, `VERSION`, this file

**Summary:**
- Removed the "Print a test sheet..." hint under the preview stats.
- Added a "Spacing (3×3)" preview below the stats, showing the first 9 rocks of the range. It uses the same `buildDocument` markup and CSS as the print sheet, so the column gap, row gap, overlapping quiet zones and label positions look the same as on paper.
  - The grid is pinned to 3 entries wide so it wraps into 3 rows.
  - With a negative column gap, the outer codes stick out past their slots, so that amount is added as margin to keep them inside the frame.
  - The preview is scaled to fit about 3in (never more than 4× zoom), and the zoom factor is shown under it, e.g. "Shown at 1.6× actual size".
- **VERSION:** `0.7.0` → `0.7.1` (Z bump, continuing this feature).

**Issues/gotchas encountered:** None.

## Phase 6 — Transparent code background, deeper negative gaps (2026-10-01)
**Status:** Complete (awaiting manual review)
**Files changed:**
- Changed: `client/src/admin/components/create-qr-codes-center-label/CreateQRCodesCenterLabel.jsx`, `VERSION`, this file

**Summary:**
- The QR SVGs are now generated with a transparent light color (`#ffffff00`), so the code has no white background layer. When gaps overlap, one code's quiet zone no longer paints white over its neighbor. The center label box keeps its white fill so the number stays readable.
- Column gap slider minimum: −0.25in → −1in.
- Row gap slider minimum: 0 → −1in.
  - CSS `row-gap` can't be negative, so the row gap is now each entry's `margin-bottom`. A negative margin shrinks each flex line, so the next row overlaps.
  - Both gaps are clamped so a code's slot never goes below 0.1in. The 3×3 preview uses the same clamped value for its frame height.
- **VERSION:** `0.7.1` → `0.7.2`.

**Issues/gotchas encountered:**
- With a transparent background, codes print on whatever the paper or sticker color is. Scanners need a light background behind the code, so dark or colored stock needs a test print.

## Phase 7 — QR code color (2026-10-01)
**Status:** Complete (awaiting manual review)
**Files changed:**
- Changed: `client/src/admin/components/create-qr-codes-center-label/CreateQRCodesCenterLabel.jsx`, `VERSION`, this file

**Summary:**
- Added a "QR color" picker to the QR Code section (default black). It sets the color of the code's dark squares; the background stays transparent.
- `sanitizeSaved` now also rejects any saved `*Color` value that isn't a 6-digit hex color, so a bad stored value can't break code generation or the CSS.
- **VERSION:** `0.7.2` → `0.7.3`.

**Issues/gotchas encountered:**
- Scanners need strong contrast. Light or low-saturation colors (yellow, pastels) may not scan, so test-print any color other than dark ones.
