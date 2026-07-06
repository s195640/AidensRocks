import { NodeViewWrapper } from "@tiptap/react";
import componentRegistry from "./componentRegistry";
import styles from "./ComponentChipView.module.css";

// Shows a small labeled placeholder inside the editor rather than mounting
// the real component — clicking a live "Upload Your Rock" button while
// editing text would open the real modal, which isn't what an editor should
// do. The real component only ever mounts via RichText's hydration pass, on
// the actual public page / admin preview.
export default function ComponentChipView({ node, selected }) {
  const { component } = node.attrs;
  const entry = componentRegistry[component];
  const label = entry?.label || component || "Unknown component";

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      data-drag-handle
      className={`${styles.chip} ${selected ? styles.selected : ""}`}
    >
      {label}
    </NodeViewWrapper>
  );
}
