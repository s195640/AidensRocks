import UploadRockButton from "./components/UploadRockButton";
import UploadRockLinkTrigger from "./components/UploadRockLinkTrigger";
import FacebookLink from "./components/FacebookLink";

// Single source of truth for portable "chip" components embeddable in page
// body content: what shows up in the editor's Insert dropdown (filtered by
// `pages`), and what RichText's hydration pass mounts at render time.
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
