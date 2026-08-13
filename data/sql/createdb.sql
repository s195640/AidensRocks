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
    comment text
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
  update_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.music OWNER TO postgres;

CREATE SEQUENCE public.music_m_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.music_m_key_seq OWNER TO postgres;

ALTER TABLE ONLY public.music ALTER COLUMN m_key SET DEFAULT nextval('public.music_m_key_seq'::regclass);

CREATE TABLE public.page_content (
    page_slug       character varying(100) PRIMARY KEY,
    nav_label       character varying(255) NOT NULL,
    order_num       integer NOT NULL DEFAULT 0,
    visible         boolean NOT NULL DEFAULT true,
    draft_body      text NOT NULL DEFAULT '',
    published_body  text NOT NULL DEFAULT '',
    updated_at      timestamptz DEFAULT CURRENT_TIMESTAMP,
    published_at    timestamptz
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
<li>Send us an email at AidensRocks.AAA@gmail.com</li>
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