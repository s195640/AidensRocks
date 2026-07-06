import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ComponentChipView from "./ComponentChipView";

// The TipTap-side counterpart to the registry's storage format
// (`<div data-component="..." data-props='{}'></div>`, per
// page-details-feature-plan.md). `inline` + `atom` lets one node type cover
// both current usages — sitting mid-sentence (upload-rock-link,
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

  parseHTML() {
    return [{ tag: "div[data-component]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ComponentChipView);
  },
});

export default ComponentChip;
