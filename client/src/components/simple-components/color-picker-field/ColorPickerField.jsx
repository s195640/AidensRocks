import { useEffect, useState } from "react";
import styles from "./ColorPickerField.module.css";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Pairs a native color-wheel picker (<input type="color">, always a valid
// 6-digit hex by construction) with a free-text hex field for manual entry.
// The text field tracks its own in-progress value so partial typing (e.g.
// "#12") doesn't get stomped on every keystroke -- `onChange` only fires
// once what's typed parses as a real color. The color wheel itself always
// commits immediately.
export default function ColorPickerField({ id, label, value, onChange }) {
  const [text, setText] = useState(value);

  // Keep the text field in sync when the color changes from elsewhere (the
  // wheel, or a parent resetting/defaulting the value).
  useEffect(() => {
    setText(value);
  }, [value]);

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
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.wheel}
        />
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
