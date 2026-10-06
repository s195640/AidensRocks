CREATE SEQUENCE public.artist_ra_key_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.artist_ra_key_seq OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: artist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.artist (
    ra_key integer DEFAULT nextval('public.artist_ra_key_seq'::regclass) NOT NULL,
    display_name character varying(255) NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    relation character varying(255),
    dob date
);


ALTER TABLE public.artist OWNER TO postgres;

--
-- Name: artist_link_ral_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.artist_link_ral_key_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.artist_link_ral_key_seq OWNER TO postgres;

--
-- Name: artist_link; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.artist_link (
    ral_key integer DEFAULT nextval('public.artist_link_ral_key_seq'::regclass) NOT NULL,
    ra_key integer NOT NULL,
    rc_key integer NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.artist_link OWNER TO postgres;

--
-- Name: catalog_rc_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.catalog_rc_key_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.catalog_rc_key_seq OWNER TO postgres;

--
-- Name: catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.catalog (
    rc_key integer DEFAULT nextval('public.catalog_rc_key_seq'::regclass) NOT NULL,
    rock_number integer NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    comment text,
    rq_key integer
);


ALTER TABLE public.catalog OWNER TO postgres;

--
-- Name: counter_rcs_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.counter_rcs_key_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.counter_rcs_key_seq OWNER TO postgres;

--
-- Name: counter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.counter (
    rcs_key integer DEFAULT nextval('public.counter_rcs_key_seq'::regclass) NOT NULL,
    rock_qr_number character varying(50) NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.counter OWNER TO postgres;

--
-- Name: counter_tracking_rct_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.counter_tracking_rct_key_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.counter_tracking_rct_key_seq OWNER TO postgres;

--
-- Name: counter_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.counter_tracking (
    rct_key integer DEFAULT nextval('public.counter_tracking_rct_key_seq'::regclass) NOT NULL,
    rcs_key integer NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45),
    user_agent text,
    "window" character varying(100),
    screen character varying(100),
    platform character varying(100),
    language character varying(50),
    timezone character varying(100),
    "timestamp" timestamp with time zone,
    page_url text,
    referrer text,
    cookies_enabled boolean,
    session_id character varying(100),
    geo jsonb
);


ALTER TABLE public.counter_tracking OWNER TO postgres;

--
-- Name: journey_rps_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.journey_rps_key_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.journey_rps_key_seq OWNER TO postgres;

--
-- Name: journey; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journey (
    rps_key integer DEFAULT nextval('public.journey_rps_key_seq'::regclass) NOT NULL,
    rock_qr_number integer NOT NULL,
    rock_number integer NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    location character varying(255),
    date timestamp without time zone,
    comment text,
    name character varying(255),
    email character varying(255),
    upload_timestamp timestamp with time zone,
    uuid character varying(50),
    show boolean DEFAULT false,
    latitude numeric(18,15),
    longitude numeric(18,15),
    country character varying(255),
    state character varying(255),
    email_sent boolean NOT NULL DEFAULT false,
    email_dt timestamp with time zone
);


ALTER TABLE public.journey OWNER TO postgres;

--
-- Name: journey_image_rpi_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.journey_image_rpi_key_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.journey_image_rpi_key_seq OWNER TO postgres;

--
-- Name: journey_image; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journey_image (
    rpi_key integer DEFAULT nextval('public.journey_image_rpi_key_seq'::regclass) NOT NULL,
    rps_key integer NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    original_name character varying(255) NOT NULL,
    current_name character varying(255) NOT NULL,
    upload_order integer,
    show boolean DEFAULT false,
    width integer,
    height integer,
    media_type character varying(10) NOT NULL DEFAULT 'photo',
    duration_seconds integer
);


ALTER TABLE public.journey_image OWNER TO postgres;

--
-- Name: journey_tracking_rpt_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.journey_tracking_rpt_key_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.journey_tracking_rpt_key_seq OWNER TO postgres;

--
-- Name: journey_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journey_tracking (
    rpt_key integer DEFAULT nextval('public.journey_tracking_rpt_key_seq'::regclass) NOT NULL,
    rps_key integer NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45),
    user_agent text,
    "window" character varying(100),
    screen character varying(100),
    platform character varying(100),
    language character varying(50),
    timezone character varying(100),
    "timestamp" timestamp with time zone,
    page_url text,
    referrer text,
    cookies_enabled boolean,
    session_id character varying(100),
    geo jsonb
);


ALTER TABLE public.journey_tracking OWNER TO postgres;

--
-- Name: photoalbums; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.photoalbums (
    pa_key integer NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(255),
    display_name character varying(255),
    "desc" text,
    order_num integer,
    show boolean DEFAULT true
);


ALTER TABLE public.photoalbums OWNER TO postgres;

--
-- Name: photoalbums_pa_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.photoalbums_pa_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.photoalbums_pa_key_seq OWNER TO postgres;

--
-- Name: photoalbums_pa_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.photoalbums_pa_key_seq OWNED BY public.photoalbums.pa_key;


--
-- Name: photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.photos (
    p_key integer NOT NULL,
    pa_key integer NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(255),
    display_name character varying(255),
    "desc" text,
    date date,
    order_num integer,
    show boolean DEFAULT true,
    width integer,
    height integer,
    media_type character varying(10) NOT NULL DEFAULT 'photo',
    duration_seconds integer
);


ALTER TABLE public.photos OWNER TO postgres;

--
-- Name: photos_p_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.photos_p_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.photos_p_key_seq OWNER TO postgres;

--
-- Name: photos_p_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.photos_p_key_seq OWNED BY public.photos.p_key;


--
-- Name: photoalbums pa_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photoalbums ALTER COLUMN pa_key SET DEFAULT nextval('public.photoalbums_pa_key_seq'::regclass);


--
-- Name: photos p_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos ALTER COLUMN p_key SET DEFAULT nextval('public.photos_p_key_seq'::regclass);


--
-- Name: artist_link artist_link_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.artist_link
    ADD CONSTRAINT artist_link_pkey PRIMARY KEY (ral_key);


--
-- Name: artist artist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.artist
    ADD CONSTRAINT artist_pkey PRIMARY KEY (ra_key);


--
-- Name: catalog catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalog
    ADD CONSTRAINT catalog_pkey PRIMARY KEY (rc_key);


--
-- Name: counter counter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.counter
    ADD CONSTRAINT counter_pkey PRIMARY KEY (rcs_key);


--
-- Name: counter_tracking counter_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.counter_tracking
    ADD CONSTRAINT counter_tracking_pkey PRIMARY KEY (rct_key);


--
-- Name: journey_image journey_image_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journey_image
    ADD CONSTRAINT journey_image_pkey PRIMARY KEY (rpi_key);


--
-- Name: journey journey_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journey
    ADD CONSTRAINT journey_pkey PRIMARY KEY (rps_key);


--
-- Name: journey_tracking journey_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journey_tracking
    ADD CONSTRAINT journey_tracking_pkey PRIMARY KEY (rpt_key);


--
-- Name: photoalbums photoalbums_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photoalbums
    ADD CONSTRAINT photoalbums_pkey PRIMARY KEY (pa_key);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (p_key);


--
-- Name: artist_link fk_artist; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.artist_link
    ADD CONSTRAINT fk_artist FOREIGN KEY (ra_key) REFERENCES public.artist(ra_key);


--
-- Name: artist_link fk_catalog; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.artist_link
    ADD CONSTRAINT fk_catalog FOREIGN KEY (rc_key) REFERENCES public.catalog(rc_key);


--
-- Name: photos fk_photo_album; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT fk_photo_album FOREIGN KEY (pa_key) REFERENCES public.photoalbums(pa_key) ON DELETE CASCADE;


-- Multi-value tags per album (e.g. "main"), so specific pages can filter to
-- just tagged albums. No seed data — every album starts with zero tags.
CREATE TABLE public.photoalbum_tags (
    pa_key    integer NOT NULL REFERENCES public.photoalbums(pa_key) ON DELETE CASCADE,
    tag       varchar(100) NOT NULL,
    create_dt timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pa_key, tag)
);

ALTER TABLE public.photoalbum_tags OWNER TO postgres;


CREATE TABLE music (
  m_key SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  writer VARCHAR(255) NOT NULL,
  lyrics TEXT NOT NULL,
  order_num integer,
  show BOOLEAN DEFAULT TRUE,
  create_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- see data/sql/migrations/add_music_play_count.sql
  play_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.music OWNER TO postgres;

-- (m_key SERIAL above already creates and owns public.music_m_key_seq — a
-- separate CREATE SEQUENCE for it here made a fresh install fail with
-- "relation music_m_key_seq already exists".)

CREATE TABLE public.page_content (
    page_slug       character varying(100) PRIMARY KEY,
    nav_label       character varying(255) NOT NULL,
    order_num       integer NOT NULL DEFAULT 0,
    visible         boolean NOT NULL DEFAULT true,
    draft_body      text NOT NULL DEFAULT '',
    published_body  text NOT NULL DEFAULT '',
    updated_at      timestamptz DEFAULT CURRENT_TIMESTAMP,
    published_at    timestamptz,
    -- Email-template subject (and account-page title) pair -- see
    -- data/sql/migrations/add_response_email_page.sql.
    draft_email_subject      text NOT NULL DEFAULT '',
    published_email_subject  text NOT NULL DEFAULT '',
    -- Email-template Sender / Reply-To / Send To pairs (NULL = default) --
    -- see data/sql/migrations/add_email_sender_columns.sql.
    draft_email_from          text,
    published_email_from      text,
    draft_email_reply_to      text,
    published_email_reply_to  text,
    draft_email_to            text,
    published_email_to        text
);

ALTER TABLE public.page_content OWNER TO postgres;

-- Seed rows match the current hardcoded copy for each page (see
-- data/sql/migrations/add_page_content_table.sql for the full rationale),
-- so a fresh install's admin editor opens with real content, not blank pages.

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
SELECT 'home', 'Home', 0, true, content, content FROM body;

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
<li>Send us an email at <span data-component="contact-email-link" data-props='{}'></span></li>
<li>Share and follow our Facebook: <div data-component="facebook-link" data-props='{}'></div></li>
</ul>
</ol>$html$::text AS content
)
INSERT INTO public.page_content (page_slug, nav_label, order_num, visible, draft_body, published_body)
SELECT 'share-your-rock', 'Share Your Rock', 1, true, content, content FROM body;

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
SELECT 'sudc', 'SUDC', 7, true, content, content FROM body;

-- Nav-only rows for pages with no rich-text content to convert — the navbar
-- now reads entirely from GET /api/pages, so these still need a row for
-- nav_label/order_num/visible even though draft_body/published_body stay
-- empty (these pages keep their existing hardcoded JSX untouched).
INSERT INTO public.page_content (page_slug, nav_label, order_num, visible)
VALUES
  ('photos', 'Photos', 2, true),
  ('track-the-rocks', 'Track The Rocks', 5, true),
  ('map', 'Map', 6, true);

-- Birthdays: CMS-editable body like home/share-your-rock/sudc, inserted
-- immediately after Photos (order_num 3) — track-the-rocks/map/sudc above
-- were shifted up one slot to make room.
WITH body AS (
  SELECT $html$<p>Every year, we celebrate Aiden’s birthday by sending more of his rocks out into the world in his memory. These are the albums from those celebrations.</p>$html$::text AS content
)
INSERT INTO public.page_content (page_slug, nav_label, order_num, visible, draft_body, published_body)
SELECT 'birthdays', 'Birthdays', 3, true, content, content FROM body;

-- Honoring Aiden: CMS-editable body like home/share-your-rock/sudc/birthdays,
-- inserted immediately after Birthdays (order_num 4) — track-the-rocks/map/
-- sudc above were shifted up one more slot to make room.
WITH body AS (
  SELECT $html$<p>More about Aiden, coming soon.</p>$html$::text AS content
)
INSERT INTO public.page_content (page_slug, nav_label, order_num, visible, draft_body, published_body)
SELECT 'honoring-aiden', 'Honoring Aiden', 4, true, content, content FROM body;

-- My Rocks (slug follow-rocks): nav-only row (hardcoded page, empty body), last in the nav.
-- The client only shows it to signed-in accounts (level >= 20) -- see
-- data/sql/migrations/add_account_tables.sql.
INSERT INTO public.page_content (page_slug, nav_label, order_num, visible)
VALUES ('follow-rocks', 'My Rocks', 8, true);

-- Response Email template row (Page Details → Emails). Copied from data/sql/migrations/add_response_email_page.sql.
INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT 'response-email', 'Response Email', COALESCE(MAX(order_num), 0) + 1, false, '', '', '', ''
FROM public.page_content
ON CONFLICT (page_slug) DO NOTHING;

-- Response Email Multi template row. Copied from data/sql/migrations/add_response_email_multi_page.sql.
INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT 'response-email-multi', 'Response Email Multi', COALESCE(MAX(order_num), 0) + 1, false, '', '', '', ''
FROM public.page_content
ON CONFLICT (page_slug) DO NOTHING;

-- Follow Rocks Email template row (seeded Active). Copied from data/sql/migrations/add_follow_rocks_email_page.sql.
WITH body AS (
  SELECT
    $html$<h2>Rock {ROCK_NUMBER} has a new adventure</h2>
<p>Rock {ROCK_NUMBER}, one of the rocks you follow, has traveled to {LOCATION} on {DATE}.</p>
<p>{ROCK_IMAGE}</p>
<p>{ROCK_JOURNEY_LINK}</p>
<p>You're receiving this because you turned on rock move emails on your My Rocks page.</p>$html$::text AS content,
    'Rock {ROCK_NUMBER} has a new adventure'::text AS subject
)
INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT 'follow-rocks-email', 'Follow Rocks Email',
       (SELECT COALESCE(MAX(order_num), 0) + 1 FROM public.page_content),
       true, content, content, subject, subject
FROM body
ON CONFLICT (page_slug) DO NOTHING;

-- Remaining site email templates (seeded Active). Copied from data/sql/migrations/add_email_templates.sql.
INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT t.slug, t.label,
       (SELECT COALESCE(MAX(order_num), 0) FROM public.page_content) + t.ord,
       true, t.body, t.body, t.subject, t.subject
FROM (VALUES
  (1, 'account-verify-email', 'Verify Account Email',
   'Verify your Aiden''s Rocks account',
   $html$<h2>Welcome to Aiden's Rocks</h2>
<p>Thank you for joining us in following Aiden's rocks around the world.</p>
<p>Please verify your email address (this link is valid for 24 hours):</p>
<p>{VERIFY_LINK}</p>
<p>If you didn't create an account, you can ignore this email.</p>$html$),

  (2, 'password-reset-email', 'Password Reset Email',
   'Reset your Aiden''s Rocks password',
   $html$<h2>Reset your password</h2>
<p>We received a request to reset your password.</p>
<p>Choose a new password using the link below (valid for 1 hour):</p>
<p>{RESET_LINK}</p>
<p>If you didn't ask for this, you can ignore this email.</p>$html$),

  (3, 'new-journey-email', 'New Rock Journey (to admin)',
   'New Rock Journey: Rock {ROCK_NUMBER}',
   $html$<h2>New Rock Journey Posted</h2>
<p><strong>Rock Number:</strong> {ROCK_NUMBER}</p>
<p><strong>Name:</strong> {NAME}</p>
<p><strong>Date:</strong> {DATE}</p>
<p><strong>Location:</strong> {LOCATION}</p>
<p><strong>Comment:</strong> {COMMENT}</p>
<p><strong>Email:</strong> {SUBMITTER_EMAIL}</p>
<p>This is an automated notification from Aidens Rocks.</p>$html$),

  (4, 'new-rock-request-email', 'New Rock Request (to admin)',
   'New Rock Request from {NAME}',
   $html$<h2>New Rock Request</h2>
<p><strong>Name:</strong> {NAME}</p>
<p><strong>Email:</strong> {EMAIL}</p>
<p><strong>Address:</strong><br>{ADDRESS}</p>
<p><strong>Rocks Requested:</strong> {ROCKS_REQUESTED}</p>
<p><strong>Need Rocks By:</strong> {NEEDED_BY}</p>
<p><strong>Message:</strong><br>{MESSAGE}</p>
<p>This is an automated notification from Aidens Rocks.</p>$html$),

  (5, 'rock-request-reply-email', 'Rock Request Reply (default)',
   'Your Aiden''s Rocks Are On The Way!',
   $html$<p>Hi {NAME},</p>
<p>We're so happy to let you know we've sent the rock(s) you requested out to you!</p>
<p>Rock number(s): {ROCK_NUMBERS}<br>Tracking Number: {TRACKING_NUMBER}</p>
<p>Thank you so much for helping us remember our son Aiden by giving these rocks a new adventure.</p>
<p>With love,<br>The Aiden's Rocks Family</p>$html$),

  (6, 'send-email-default', 'Send Email (default)',
   '',
   ''),

  (7, 'upload-files-failed-email', 'Upload Files Failed (to admin)',
   '[{FAILED_COUNT} FILE(S) FAILED] Rock upload: Rock {ROCK_NUMBER}',
   $html$<p><strong>{FAILED_COUNT} file(s) in this upload could not be processed</strong> and are hidden (journey #{JOURNEY_ID}).</p>
<p>{PUBLISH_STATUS}</p>
{FAILED_FILES}
<p>The originals are still on the server.</p>$html$),

  (8, 'upload-processing-failed-email', 'Upload Processing Failed (to admin)',
   'Rock upload processing FAILED: Rock {ROCK_NUMBER}',
   $html$<p>Processing the upload for rock {ROCK_NUMBER} (journey #{JOURNEY_ID}) failed, so it may still be hidden in Journey admin.</p>
<p>Error: {ERROR}</p>
<p>Folder: {FOLDER}</p>$html$)
) AS t(ord, slug, label, subject, body)
ON CONFLICT (page_slug) DO NOTHING;

-- Email templates' Sender / Reply-To / Send To. Copied from data/sql/migrations/add_email_sender_columns.sql.
UPDATE public.page_content p
SET draft_email_from = v.sender,     published_email_from = v.sender,
    draft_email_reply_to = v.reply,  published_email_reply_to = v.reply,
    draft_email_to = v.send_to,      published_email_to = v.send_to
FROM (VALUES
  ('new-rock-request-email',         'Aiden''s Rocks – Requests <requests@aidensrocks.com>', 'noreply@aidensrocks.com',      'requests@aidensrocks.com'),
  ('new-journey-email',              'Aiden''s Rocks – Journeys <journeys@aidensrocks.com>', 'noreply@aidensrocks.com',      'journeys@aidensrocks.com'),
  ('upload-files-failed-email',      'Aiden''s Rocks – Failures <failures@aidensrocks.com>', 'noreply@aidensrocks.com',      'failures@aidensrocks.com'),
  ('upload-processing-failed-email', 'Aiden''s Rocks – Failures <failures@aidensrocks.com>', 'noreply@aidensrocks.com',      'failures@aidensrocks.com'),
  ('follow-rocks-email',             'Aiden''s Rocks <noreply@aidensrocks.com>',            'aidensfamily@aidensrocks.com', NULL),
  ('rock-request-reply-email',       'Aiden''s Rocks <noreply@aidensrocks.com>',            'aidensfamily@aidensrocks.com', NULL),
  ('account-verify-email',           'Aiden''s Rocks <noreply@aidensrocks.com>',            'noreply@aidensrocks.com',      NULL),
  ('password-reset-email',           'Aiden''s Rocks <noreply@aidensrocks.com>',            'noreply@aidensrocks.com',      NULL),
  ('response-email',                 'Aiden''s Rocks <noreply@aidensrocks.com>',            'noreply@aidensrocks.com',      NULL),
  ('response-email-multi',           'Aiden''s Rocks <noreply@aidensrocks.com>',            'noreply@aidensrocks.com',      NULL),
  ('send-email-default',             'Aiden''s Rocks <noreply@aidensrocks.com>',            'noreply@aidensrocks.com',      NULL)
) AS v(slug, sender, reply, send_to)
WHERE p.page_slug = v.slug
  AND p.draft_email_from IS NULL AND p.published_email_from IS NULL
  AND p.draft_email_reply_to IS NULL AND p.published_email_reply_to IS NULL;

-- Account pages (Sign In / Create an Account / Reset Password). Copied from data/sql/migrations/add_account_pages.sql.
INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT t.slug, t.label,
       (SELECT COALESCE(MAX(order_num), 0) FROM public.page_content) + t.ord,
       true, t.body, t.body, t.title, t.title
FROM (VALUES
  (1, 'sign-in', 'Sign In', 'Sign In',
   $html$<p>Follow Aiden's rocks on their journeys.</p>$html$),
  (2, 'create-account', 'Create an Account', 'Create an Account',
   $html$<p>Follow rocks you care about and hear when they travel somewhere new.</p>$html$),
  (3, 'reset-password', 'Reset Password', 'Reset Password',
   $html$<p>Enter your email and we'll send you a link to choose a new password. This also unlocks a locked account.</p>$html$)
) AS t(ord, slug, label, title, body)
ON CONFLICT (page_slug) DO NOTHING;

-- Honoring Aiden entries: one entry per nav item/page — title, auto-slug
-- (see server/src/routes/honoringAidenAdmin.js), a visibility toggle
-- (published), and its whole page body as one `body_json` document (raw
-- Tiptap/ProseMirror JSON, authored via @s195640/content-editor's
-- ContentEditor). No seed data — every install starts with zero entries.
--
-- Was a 3-table entry -> journal_entry -> journal_entry_item content model
-- (ordered sections, each freely composed of text/image/gallery/video
-- blocks with a column-count layout) — collapsed to this single
-- `body_json` column once @s195640/content-editor's own editor could embed
-- images/video directly in one flowing document, making the separate
-- section/block/layout system redundant. See
-- data/sql/migrations/add_honoring_aiden_entries.sql (a consolidated
-- migration replacing 8 incremental ones — its own header comment lists
-- them) and summary-issue-log.md for the full history of that now-removed
-- model.
--
-- entry_date/cover_image: unused by any current UI (kept rather than
-- dropped — harmless, nullable, no migration risk either way; simplest to
-- leave for a possible future use than to churn the schema twice).
--
-- parent_id: self-referencing, enables the sidebar's two-level menu (main
-- entries + sub-entries) — NULL means top-level. Hard-capped at two levels
-- by application code (routes/honoringAidenAdmin.js's resolveParentId()),
-- not the schema.
--
-- view_count: incremented once per public page view only, never an admin
-- one — see data/sql/migrations/add_honoring_aiden_entries.sql's own
-- comment. Not surfaced in any UI yet (by request) — tracked only.

CREATE TABLE public.entry (
    id            serial PRIMARY KEY,
    slug          varchar(255) UNIQUE NOT NULL,
    title         varchar(255) NOT NULL,
    entry_date    date NULL,
    sort_order    integer NOT NULL DEFAULT 0,
    published     boolean NOT NULL DEFAULT false,
    archived      boolean NOT NULL DEFAULT false,
    cover_image   varchar(500) NULL,
    body_json     jsonb NULL,
    parent_id     integer NULL REFERENCES public.entry(id),
    view_count    integer NOT NULL DEFAULT 0,
    created_at    timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at    timestamptz DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.entry OWNER TO postgres;

-- app_version: per-node record of which app VERSION is currently running,
-- written by the server itself once at every process startup (see
-- server/src/utils/recordAppVersion.js). Deliberately NOT part of the
-- pglogical replication set -- see data/sql/migrations/add_app_version_table.sql
-- for the full rationale; do not add a replication_set_add_table line for it.

CREATE TABLE IF NOT EXISTS public.app_version (
    id          smallint PRIMARY KEY DEFAULT 1,
    version     character varying(50) NOT NULL,
    updated_dt  timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT app_version_singleton CHECK (id = 1)
);

ALTER TABLE public.app_version OWNER TO postgres;

-- unmatched_path_hit: one row per hit against a URL path that didn't match
-- any defined client route (e.g. "/f"), logged by the client-side catch-all
-- route (client/src/components/notfoundredirect/NotFoundRedirect.jsx) before
-- it redirects the visitor to "/". Insert-only, not an incrementing counter
-- column -- see data/sql/migrations/add_unmatched_path_hit_table.sql for why.
-- Per-path hit counts are computed via COUNT(*) at read time
-- (server/src/routes/unmatchedPath.js), shown on the admin Statistics panel.
-- full_url additionally captures the entire URL (pathname + query string)
-- for that hit -- see data/sql/migrations/add_full_url_to_unmatched_path_hit.sql.

CREATE TABLE IF NOT EXISTS public.unmatched_path_hit (
    id         serial PRIMARY KEY,
    path       character varying(2048) NOT NULL,
    full_url   character varying(2048),
    create_dt  timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unmatched_path_hit_path ON public.unmatched_path_hit (path);

ALTER TABLE public.unmatched_path_hit OWNER TO postgres;

-- setting: generic key/value store for admin-managed settings, one row per
-- name, value as jsonb -- see data/sql/migrations/add_setting_table.sql.

CREATE TABLE IF NOT EXISTS public.setting (
    id           serial PRIMARY KEY,
    name         character varying(100) NOT NULL UNIQUE,
    value        jsonb NOT NULL,
    type         character varying(50) NULL,
    description  text NULL,
    create_dt    timestamptz DEFAULT CURRENT_TIMESTAMP,
    update_dt    timestamptz DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.setting OWNER TO postgres;

-- Site-wide contact email shown to visitors (Contact Us, "email us" error
-- messages, the Contact Email chip and {CONTACT_EMAIL} in emails). Edited
-- in Admin → Settings.
INSERT INTO public.setting (name, value, type, description)
VALUES ('contact-email', '"aidensfamily@aidensrocks.com"', 'site',
        'Contact email shown to visitors (Contact Us, error messages, {CONTACT_EMAIL}).')
ON CONFLICT (name) DO NOTHING;


-- entry_media: tracks every image/video uploaded into a given Honoring
-- Aiden entry's ContentEditor document, independent of whether it's still
-- referenced in that entry's current body_json -- see
-- data/sql/migrations/add_entry_media_table.sql for the full rationale.

CREATE TABLE IF NOT EXISTS public.entry_media (
    id             serial PRIMARY KEY,
    entry_id       integer NOT NULL REFERENCES public.entry(id) ON DELETE CASCADE,
    item_type      character varying(10) NOT NULL,   -- 'image' | 'video'
    media_path     character varying(500) NOT NULL,
    thumbnail_path character varying(500),
    poster_path    character varying(500),
    original_name  character varying(500),
    width          integer,
    height         integer,
    duration       numeric,
    create_dt      timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entry_media_entry_id ON public.entry_media (entry_id);

ALTER TABLE public.entry_media OWNER TO postgres;

-- path_display_name: admin-managed lookup mapping a hit's full_url (or
-- bare path, for older rows with no full_url) to a display label shown on
-- the admin Path Hits widget in place of the raw URL, e.g.
-- "/treeHH?z=1" -> "Hocking Hills". url_pattern may use "*" as a wildcard
-- (e.g. "/qr?r=*" -> "Rock") -- see
-- server/src/utils/pathDisplayNameMatcher.js for the match/precedence
-- rules. A hit with no matching row shows as "Unknown" rather than being
-- omitted -- see server/src/routes/unmatchedPath.js. See
-- data/sql/migrations/add_path_display_name_table.sql for the full
-- rationale.

CREATE TABLE IF NOT EXISTS public.path_display_name (
    id            serial PRIMARY KEY,
    url_pattern   character varying(2048) NOT NULL UNIQUE,
    display_name  character varying(255) NOT NULL,
    create_dt     timestamptz DEFAULT CURRENT_TIMESTAMP,
    update_dt     timestamptz DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.path_display_name OWNER TO postgres;

-- rock_requests: visitor "Request A Rock" submissions (name/email/address/
-- # rocks requested), plus admin-managed shipped/tracking_number/comments/
-- rock_numbers fields -- see data/sql/migrations/add_rock_requests.sql for
-- the full rationale. catalog.rq_key (added to the catalog table above)
-- links a cataloged rock to the request it's currently assigned to.

CREATE TABLE IF NOT EXISTS public.rock_requests (
    rq_key           serial PRIMARY KEY,
    name             character varying(255) NOT NULL,
    email            character varying(255),
    address          text,
    rocks_requested  integer NOT NULL,
    needed_by        date,
    no_rush          boolean NOT NULL DEFAULT false,
    shipped          boolean NOT NULL DEFAULT false,
    tracking_number  character varying(255),
    comments         text,
    rock_numbers     text,
    message          text,
    create_dt        timestamptz DEFAULT CURRENT_TIMESTAMP,
    update_dt        timestamptz DEFAULT CURRENT_TIMESTAMP,
    sent_dt          timestamptz,
    email_dt         timestamptz,
    deleted          boolean NOT NULL DEFAULT false,
    deleted_dt       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rock_requests_shipped ON public.rock_requests (shipped);

ALTER TABLE public.rock_requests OWNER TO postgres;
-- account / account_token / account_follow: site sign-in accounts (visitors
-- and admin), single-use email verification + password reset tokens, and
-- the rocks each account follows -- see
-- data/sql/migrations/add_account_tables.sql for the full rationale.

CREATE TABLE IF NOT EXISTS public.account (
    id                  serial PRIMARY KEY,
    email               character varying(255) NOT NULL,
    first_name          character varying(100),
    last_name           character varying(100),
    ra_key              integer REFERENCES public.artist(ra_key) ON DELETE SET NULL,
    token_version       integer NOT NULL DEFAULT 0,
    password_hash       character varying(255) NOT NULL,
    access_level        smallint NOT NULL DEFAULT 10
                        CHECK (access_level IN (10, 20, 30, 50)),
    is_locked           boolean NOT NULL DEFAULT false,
    failed_login_count  integer NOT NULL DEFAULT 0,
    locked_dt           timestamptz,
    email_verified_dt   timestamptz,
    notify_rock_moves   boolean NOT NULL DEFAULT true,
    last_login_dt       timestamptz,
    last_seen_dt        timestamptz,
    create_dt           timestamptz DEFAULT CURRENT_TIMESTAMP,
    update_dt           timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_email_lower ON public.account (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_ra_key ON public.account (ra_key) WHERE ra_key IS NOT NULL;

ALTER TABLE public.account OWNER TO postgres;

CREATE TABLE IF NOT EXISTS public.account_token (
    id          serial PRIMARY KEY,
    account_id  integer NOT NULL REFERENCES public.account(id) ON DELETE CASCADE,
    token_hash  character(64) NOT NULL UNIQUE,
    purpose     character varying(20) NOT NULL,   -- 'verify' | 'reset'
    expires_dt  timestamptz NOT NULL,
    used_dt     timestamptz,
    create_dt   timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_token_account_id ON public.account_token (account_id);

ALTER TABLE public.account_token OWNER TO postgres;

CREATE TABLE IF NOT EXISTS public.account_follow (
    account_id   integer NOT NULL REFERENCES public.account(id) ON DELETE CASCADE,
    rock_number  integer NOT NULL,
    create_dt    timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, rock_number)
);

CREATE INDEX IF NOT EXISTS idx_account_follow_rock_number ON public.account_follow (rock_number);

ALTER TABLE public.account_follow OWNER TO postgres;
