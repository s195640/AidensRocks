-- STEP 02 of 02 -- run on ONE server only (Node A), after step 01 is done
-- on both AND the 0.16 code is live on both. Do NOT run it on Node B:
-- page_content replicates, so Node B gets this row from Node A. Running it
-- on both would create the row twice and conflict.
--
-- Run it after the code: the old code doesn't know this slug isn't a nav
-- page, so it would show "Request A Rock" in the public navbar.
--
-- Adds the Request A Rock dialog to Page Details' "Dialogs" table, seeded
-- with the message the dialog already shows, no # Rocks note and no limit
-- of its own (the 100-rock ceiling still applies). Always on. Only adds the
-- row if it doesn't exist, so re-running never overwrites an admin's edits.

INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_settings, published_settings)
SELECT 'request-a-rock', 'Request A Rock',
       (SELECT COALESCE(MAX(order_num), 0) FROM public.page_content) + 1,
       true, t.body, t.body, t.settings, t.settings
FROM (VALUES
  ($html$<p>If you would like some rocks sent to you for your upcoming trips, or if you have a special location in mind where you’d like to place an Aiden Rock, please let us know how many you would like and where to send them. We will send them anywhere in the world for free; we just want to see them take off and travel!</p>$html$,
   '{"rocksNote": "", "maxRocks": null}'::jsonb)
) AS t(body, settings)
ON CONFLICT (page_slug) DO NOTHING;
