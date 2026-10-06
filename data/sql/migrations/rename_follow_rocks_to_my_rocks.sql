-- Renames the signed-in "Follow Rocks" page to "My Rocks". The page's slug
-- and URL (/follow-rocks) are unchanged; only the nav label shown in the
-- menu, and the follower email's mention of the page, change. The email
-- body is admin-editable, so only the exact default phrase is replaced and
-- any other edits are left alone. Safe to re-run.

UPDATE public.page_content
SET nav_label = 'My Rocks'
WHERE page_slug = 'follow-rocks' AND nav_label = 'Follow Rocks';

UPDATE public.page_content
SET draft_body = replace(draft_body, 'your Follow Rocks page', 'your My Rocks page'),
    published_body = replace(published_body, 'your Follow Rocks page', 'your My Rocks page')
WHERE page_slug = 'follow-rocks-email';
