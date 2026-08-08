-- Fixes a real, already-live bug in stored page_content HTML: component
-- chips (upload-rock-button, upload-rock-link, facebook-link — see
-- client/src/adminContent/componentRegistry.js) were serialized as
-- `<div data-component="..." data-props='...'></div>`. A <div> is not valid
-- HTML content inside a <p>, so wherever a chip sat mid-sentence (e.g.
-- share-your-rock's original seed: "clicking <div ...></div> and filling
-- out the form" inside a <p>), the browser's HTML parser auto-closes the
-- paragraph right before the <div> and starts a new one for the text that
-- follows — the chip silently jumps to its own line regardless of where it
-- was actually placed in the editor. Fixed going forward in
-- ComponentChip.js (now serializes/reads <span data-component="...">
-- instead); this migration repairs already-stored draft_body/published_body
-- so existing pages (share-your-rock in particular) don't need a manual
-- re-save + re-publish to pick up the fix. Scoped by content match, not a
-- hardcoded page_slug, so it covers any row with a chip, not just the ones
-- known about today. Safe to re-run: the pattern no longer matches once
-- converted.

UPDATE public.page_content
SET draft_body = regexp_replace(draft_body, '<div([^>]*data-component[^>]*)></div>', '<span\1></span>', 'g'),
    published_body = regexp_replace(published_body, '<div([^>]*data-component[^>]*)></div>', '<span\1></span>', 'g'),
    updated_at = CURRENT_TIMESTAMP
WHERE draft_body ~ '<div[^>]*data-component'
   OR published_body ~ '<div[^>]*data-component';
