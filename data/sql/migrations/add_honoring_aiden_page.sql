-- Adds the "Honoring Aiden" page: a new nav entry inserted immediately after
-- Birthdays, with a CMS-editable body like home/share-your-rock/sudc/
-- birthdays. page_content is an existing, already-replicated table (no
-- pglogical action needed).
--
-- Guarded by an existence check (not just ON CONFLICT DO NOTHING) because
-- this migration also renumbers track-the-rocks/map/sudc's order_num to make
-- room for honoring-aiden at slot 4 — that renumbering must only run once,
-- or a second run would shift them again.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.page_content WHERE page_slug = 'honoring-aiden') THEN
    UPDATE public.page_content
    SET order_num = order_num + 1
    WHERE page_slug IN ('track-the-rocks', 'map', 'sudc');

    INSERT INTO public.page_content (page_slug, nav_label, order_num, visible, draft_body, published_body)
    VALUES (
      'honoring-aiden',
      'Honoring Aiden',
      4,
      true,
      $html$<p>More about Aiden, coming soon.</p>$html$,
      $html$<p>More about Aiden, coming soon.</p>$html$
    );
  END IF;
END $$;
