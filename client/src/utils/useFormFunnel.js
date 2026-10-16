// Form funnel for the two main forms (Site Tracking): Share Your Rock
// ("share_your_rock") and Request a Rock ("request_a_rock").
//
//   form_open    when the form mounts (meta.source: where it was opened from)
//   form_start   the first time any field changes (once per open)
//   form_submit  when the server accepted it
//   form_error   when a submit was rejected (meta.reason: a short code)
//   form_close   when it closes without a successful submit
//
// All linked by meta.open_id. "Abandoned" (opened, never submitted) is
// worked out at read time, so a tab closed with the form open still counts.
// No form contents are ever sent.
//
// Usage: const funnel = useFormFunnel("request_a_rock", source);
//   put funnel.onChangeCapture on the form's outer element, and call
//   funnel.submitted(meta) / funnel.failed(reason).
import { useEffect, useMemo, useRef } from "react";
import { newActivityId, track } from "./activity";

export default function useFormFunnel(formId, source = null) {
  const state = useRef(null);

  useEffect(() => {
    const s = { openId: newActivityId(), started: false, submitted: false };
    state.current = s;
    track("form_open", { targetId: formId, meta: { open_id: s.openId, source } });
    return () => {
      if (!s.submitted) {
        track("form_close", { targetId: formId, meta: { open_id: s.openId, started: s.started } });
      }
    };
  }, [formId]);

  return useMemo(
    () => ({
      onChangeCapture() {
        const s = state.current;
        if (!s || s.started) return;
        s.started = true;
        track("form_start", { targetId: formId, meta: { open_id: s.openId } });
      },
      submitted(meta = {}) {
        const s = state.current;
        if (!s) return;
        s.submitted = true;
        track("form_submit", { targetId: formId, meta: { ...meta, open_id: s.openId } });
      },
      failed(reason) {
        const s = state.current;
        if (!s) return;
        track("form_error", { targetId: formId, meta: { open_id: s.openId, reason: String(reason).slice(0, 100) } });
      },
    }),
    [formId]
  );
}
