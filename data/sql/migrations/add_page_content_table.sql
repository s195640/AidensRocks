-- Adds the page_content table (Page Details feature): editable public-page
-- body copy + per-page nav visibility. pglogical does not replicate DDL: run
-- everything above the "pglogical replication set" comment by hand,
-- identically, on the provider node first, then the subscriber node. Safe to
-- re-run (idempotent) if a deploy step fails partway through.

CREATE TABLE IF NOT EXISTS public.page_content (
    page_slug       character varying(100) PRIMARY KEY,
    nav_label       character varying(255) NOT NULL,
    order_num       integer NOT NULL DEFAULT 0,
    visible         boolean NOT NULL DEFAULT true,
    draft_body      text NOT NULL DEFAULT '',
    published_body  text NOT NULL DEFAULT '',
    updated_at      timestamptz DEFAULT CURRENT_TIMESTAMP,
    published_at    timestamptz
);

-- Seed rows: nav_label/order_num match the current hardcoded order in
-- client/src/App.jsx's publicNavItems (home=0, share-your-rock=1, sudc=5 —
-- photos/track-the-rocks/map keep their slots but aren't part of this
-- feature). draft_body/published_body are seeded with the exact current
-- hardcoded copy for each page, so nothing changes on the public site and
-- the admin editor opens with real content instead of a blank page.
-- share-your-rock's seed already has the upload-rock-button/upload-rock-link/
-- facebook-link chips placed at their current positions, per
-- page-details-feature-plan.md's component registry.

WITH body AS (
  SELECT $html$<h2>Journey Through the World With Aiden’s Rocks</h2>
<p>On September 14, 2022 at a mere 5lbs4oz at 3:02 pm, Aiden Asher Armitage was born into the world, our little AAA. This birthday was shared with his mommy; making her a first time mom on her 32nd birthday. He was loved deeply and utterly by mommy (Ashley) and daddy (Chris) Armitage and SOOOOO many others. He has a very large family in which he loved and adored.</p>
<p>The afternoon of May 20, 2025, appeared to be a normal day. Aiden (2.5 years old) went down for his normal nap. The difference was this day, he did not wake up. Our anchor to this world, our purpose, swiftly disintegrated as we will forever grief the loss of our perfect little boy; “the greatest baby of all the babies in all the lands in all the world’s.”</p>
<p>Aiden was a lover of all life. He was a true adventurer, a traveler, and a perfect little healthy boy. He loved “paddle paddle” (swimming), he loved “jump jump” (gymnastics, trampoline), he loved “rocks”, he loved “park”, he loved “hike”, he loved “outside.” He just loved all aspects of life. He loved finding rocks and throwing them at any tree or to any body of water.</p>
<p>At birth, we promised him a life of adventure, we promised to show him the world. Our first promises we whispered in his ear soon after he came out screaming. During his short 32 months of life he has seen 12 US national parks, 2 international national parks, 3 international countries stamped on his Passport plus an additional island, and undocumented amount of US states. He had 8 more national parks planned for him the year he passed. We did some sort of activity every single day with him to keep him engaged, nurtured, and exposed to all areas of life.</p>
<p>Not having him here to experience all we had planned for his life is the most unfathomable thought we live with every day.</p>
<p>Living FOR Aiden instead of WITH Aiden…no parent should have to say those words about their child.</p>
<p>So,</p>
<p>We created this site because even though Aiden’s adventurous physical presence is not with us, we want to keep Aiden’s adventurous spirit alive.</p>
<p>We want to keep our promise TO him and keep a purpose FOR him.</p>
<p>We cannot watch him grow, but we can watch his adventures grow with his rocks.</p>
<p>His daily experiences we promised him will be seen through the daily adventures of his rocks.</p>
<p>This will be something we will look forward to seeing upon each awaking day as we await our reunion through Heaven’s doors.</p>
<p>Aiden Asher Armitage, Mr. A …this is for you….we love you &amp; miss you more than words can say.</p>$html$::text AS content
)
INSERT INTO public.page_content (page_slug, nav_label, order_num, visible, draft_body, published_body)
SELECT 'home', 'Home', 0, true, content, content FROM body
ON CONFLICT (page_slug) DO NOTHING;

WITH body AS (
  SELECT $html$<h2>Aiden's Rocks</h2>
<div data-component="upload-rock-button" data-props='{}'></div>
<p>Aiden had a true passion for adventure. He just loved life. His best life was just being outside. He loved hiking, he loved traveling, he loved climbing, and he loved throwing rocks.</p>
<p>Honoring him will be honoring all those loves. So here we are, asking other adventurous people in all walks of life, in all parts of the world to share Aiden’s spirit with us.</p>
<p>Picturing Aiden’s smile, imagining his soul-grabbing laugh as these rocks travel…we thank you for the part you play in keeping his spirit alive.</p>
<br />
<p><strong>If you found a rock, we ask a couple things of you:</strong></p>
<ol>
<li>Relocate the rock. Wherever you found it, take it somewhere else. Take it with you on vacation, take it down the road, take it to your favorite public place, take it anywhere …just to help the rock TRAVEL. Please just leave it where someone else can find it. The hope is to watch and track the movements of these rocks throughout the world.</li>
<li>Take a picture of the rock in the new location BEFORE you leave it for the next person to find. Love to see where these rocks travel, show their whereabouts if possible in whatever creative way you can come up with :)</li>
<li>We want to give plenty of ways/options to share your rock</li>
<ul>
<li>Upload the images directly by clicking <div data-component="upload-rock-link" data-props='{}'></div> and filling out the form.</li>
<li>Send us an email at AidensRocks.AAA@gmail.com</li>
<li>Share and follow our Facebook: <div data-component="facebook-link" data-props='{}'></div></li>
</ul>
</ol>$html$::text AS content
)
INSERT INTO public.page_content (page_slug, nav_label, order_num, visible, draft_body, published_body)
SELECT 'share-your-rock', 'Share Your Rock', 1, true, content, content FROM body
ON CONFLICT (page_slug) DO NOTHING;

WITH body AS (
  SELECT $html$<p>Being a part of the medical community for over 15 years, I have never heard of Sudden Unexpected Death in Child. I wasn’t aware it was even a discussion amongst the medical community at all. So I wanted to share a few facts:</p>
<ul>
<li>SUDC is a category of death in children between the ages of 1–18 that remains unexplained after investigations, including autopsy.</li>
<li>It affects approximately 450+ children aged 1–18 years in the US annually (approximately 1 in every 100,000).</li>
<li>It is most common in toddlers; it is the 5th leading category of death in children ages 1–4.
<ul>
<li>Most are predominantly males (60%) born at term as singletons.</li>
<li>Some research has association with febrile seizures.</li>
<li>Most are unwitnessed during sleep period.</li>
<li>Most found prone.</li>
</ul>
</li>
</ul>
<p>Please, if possible, help us share and spread awareness to the communities. Our hope is that no parents will ever have to go through this agony. Hopefully this website will bring some awareness, but if you would like to impact the SUDC Foundation — who help other families directly impacted by SUDC and support research studies to stop it from happening — you can donate at the following website: <a href="https://sudc.org/donate/" target="_blank" rel="noopener noreferrer">https://sudc.org/donate/</a></p>$html$::text AS content
)
INSERT INTO public.page_content (page_slug, nav_label, order_num, visible, draft_body, published_body)
SELECT 'sudc', 'SUDC', 5, true, content, content FROM body
ON CONFLICT (page_slug) DO NOTHING;

-- pglogical replication set: run this once, on the PROVIDER node only, after
-- the CREATE TABLE above has been applied there (replication set membership
-- is a provider-side concept, not something to also run on the subscriber).
-- SELECT pglogical.replication_set_add_table('default', 'page_content');
