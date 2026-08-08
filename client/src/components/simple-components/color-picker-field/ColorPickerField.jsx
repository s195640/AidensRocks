import { useEffect, useRef, useState } from "react";
import styles from "./ColorPickerField.module.css";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Pairs a native color-wheel picker (<input type="color">, always a valid
// 6-digit hex by construction) with a free-text hex field for manual entry.
// The text field tracks its own in-progress value so partial typing (e.g.
// "#12") doesn't get stomped on every keystroke -- `onChange` only fires
// once what's typed parses as a real color.
//
// The wheel is deliberately NOT a React-controlled input. The browser fires
// a native `input` event continuously (once per frame) while the user drags
// inside the color-wheel popup, and only fires `change` once, when the
// picker closes. React's onChange prop is wired to `input` for color
// inputs, so committing there meant every parent onChange -- including,
// for the QR color, a full QR regeneration -- ran dozens of times per drag.
// That's what made the picker feel laggy. We commit on `change` instead
// (attached manually via a ref, since React has no onChange-equivalent for
// it), and imperatively sync the element's value when `value` changes from
// elsewhere (e.g. the hex field) so the swatch still stays in sync without
// fighting the browser's own live display during an active drag.
export default function ColorPickerField({ id, label, value, onChange }) {
  const [text, setText] = useState(value);
  const wheelRef = useRef(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (wheelRef.current && wheelRef.current.value !== value) {
      wheelRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return undefined;
    const handleCommit = (e) => onChange(e.target.value);
    el.addEventListener("change", handleCommit);
    return () => el.removeEventListener("change", handleCommit);
  }, [onChange]);

  const handleTextChange = (e) => {
    const next = e.target.value;
    setText(next);
    const normalized = next.startsWith("#") ? next : `#${next}`;
    if (HEX_RE.test(normalized)) {
      onChange(normalized.toLowerCase());
    }
  };

  return (
    <div className={styles.row}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.controls}>
        <input ref={wheelRef} id={id} type="color" defaultValue={value} className={styles.wheel} />
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder="#000000"
          className={styles.hexInput}
        />
      </div>
    </div>
  );
}
