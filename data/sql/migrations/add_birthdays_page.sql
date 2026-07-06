-- Adds the Birthdays page (Birthdays feature, phase 1): a new nav entry
-- inserted immediately after Photos, with a CMS-editable body like
-- home/share-your-rock/sudc. page_content is an existing, already-replicated
-- table (no pglogical action needed).
--
-- Guarded by an existence check (not just ON CONFLICT DO NOTHING) because
-- this migration also renumbers track-the-rocks/map/sudc's order_num to make
-- room for birthdays at slot 3 — that renumbering must only run once, or a
-- second run would shift them again.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.page_content WHERE page_slug = 'birthdays') THEN
    UPDATE public.page_content
    SET order_num = order_num + 1
    WHERE page_slug IN ('track-the-rocks', 'map', 'sudc');

    INSERT INTO public.page_content (page_slug, nav_label, order_num, visible, draft_body, published_body)
    VALUES (
      'birthdays',
      'Birthdays',
      3,
      true,
      $html$<p>Every year, we celebrate Aiden’s birthday by sending more of his rocks out into the world in his memory. These are the albums from those celebrations.</p>$html$,
      $html$<p>Every year, we celebrate Aiden’s birthday by sending more of his rocks out into the world in his memory. These are the albums from those celebrations.</p>$html$
    );
  END IF;
END $$;
