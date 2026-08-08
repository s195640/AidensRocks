import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ComponentChipView from "./ComponentChipView";

// The TipTap-side counterpart to the registry's storage format. Rendered as
// a <span>, NOT <div> (see below) — `inline` + `atom` lets one node type
// cover both current usages — sitting mid-sentence (upload-rock-link,
// facebook-link) and standalone on its own line (upload-rock-button, which
// just ends up alone inside its own paragraph) — without needing two node
// types. `atom` also gives us "not text-editable" for free; ProseMirror atoms
// have no editable inner content.
const ComponentChip = Node.create({
  name: "componentChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      component: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-component"),
        renderHTML: (attributes) => ({
          "data-component": attributes.component,
        }),
      },
      props: {
        default: {},
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-props") || "{}");
          } catch {
            return {};
          }
        },
        renderHTML: (attributes) => ({
          "data-props": JSON.stringify(attributes.props || {}),
        }),
      },
    };
  },

  // Chips inserted mid-sentence sit inside a <p>, and <div> is not valid
  // HTML content inside <p> — browsers auto-close the paragraph right
  // before it and start a new one for whatever text follows, which is
  // exactly "the chip always jumps to the next line". <span> has no such
  // restriction. `div[data-component]` stays accepted on parse (not just
  // span) so already-stored content saved before this fix keeps loading;
  // it just gets re-serialized as <span> the next time that page is saved.
  parseHTML() {
    return [{ tag: "span[data-component]" }, { tag: "div[data-component]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ComponentChipView);
  },
});

export default ComponentChip;
