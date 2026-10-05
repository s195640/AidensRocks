import axios from "axios";
import applyTemplateValues from "./applyTemplateValues";
import htmlToPlainText from "./htmlToPlainText";

// Loads a "default" email template (kind: "default" in emailTemplates.js)
// as plain text with `values` filled in, for pre-filling a freeform send
// dialog. Resolves to { subject, body }, or null when the template is
// missing/inactive/unreachable — callers keep their own fallback.
export default async function loadDefaultEmail(slug, values = {}) {
  try {
    const { data } = await axios.get(`/api/admin/pages/${slug}/template`);
    if (!data.visible) return null;
    return {
      subject: applyTemplateValues(data.subject || "", values),
      body: applyTemplateValues(htmlToPlainText(data.body), values),
    };
  } catch (err) {
    console.error(`Couldn't load the "${slug}" default email:`, err);
    return null;
  }
}
