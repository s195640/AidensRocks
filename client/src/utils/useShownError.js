// Reports an error message to site activity when it's shown to the visitor
// (Site Tracking, error tracking: error_shown). Pass the spot's fixed code
// and the message state the component already renders; it reports each
// time a new message appears.
import { useEffect } from "react";
import { reportShownError } from "./activity";

export default function useShownError(code, message) {
  useEffect(() => {
    if (message) reportShownError(code, typeof message === "string" ? message : String(message));
  }, [code, message]);
}
