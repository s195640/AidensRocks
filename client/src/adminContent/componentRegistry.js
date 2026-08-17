import UploadRockButton from "./components/UploadRockButton";
import UploadRockLinkTrigger from "./components/UploadRockLinkTrigger";
import FacebookLink from "./components/FacebookLink";

// Single source of truth for portable "chip" components embeddable in page
// body content: what shows up in the editor's Insert dropdown (filtered by
// `pages`), and what RichText's hydration pass mounts at render time.
//
// Used to also carry a "honoring-aiden-embedded-image" entry for the old
// in-house TipTap embedded-image widget (EmbeddedImageComponent.js/
// EmbeddedImageDisplay.jsx) — removed along with that whole editor when
// journal_entry_item 'text' items switched to the @s195640/content-editor
// package, which has its own image node (resize/align/crop) and doesn't
// use this chip/portal mechanism at all. See summary-issue-log.md.
const componentRegistry = {
  "upload-rock-button": {
    label: "Upload Your Rock (button)",
    component: UploadRockButton,
    pages: ["share-your-rock"],
    configFields: [],
  },
  "upload-rock-link": {
    label: "Upload Your Rock (text link)",
    component: UploadRockLinkTrigger,
    pages: ["share-your-rock"],
    configFields: [],
  },
  "facebook-link": {
    label: "Facebook Link",
    component: FacebookLink,
    pages: ["share-your-rock"],
    configFields: [],
  },
};

export default componentRegistry;
