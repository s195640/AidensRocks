import { useSiteSettings } from "../../context/SiteSettingsContext";

// "Contact Email (link)" chip for page content: a mailto link to the
// contact email from Admin → Settings, so page text never has the address
// typed in. Renders nothing until the setting has loaded.
export default function ContactEmailLink() {
  const { contactEmail } = useSiteSettings();
  if (!contactEmail) return null;
  return <a href={`mailto:${contactEmail}`}>{contactEmail}</a>;
}
