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
    state character varying(255)
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
    height integer
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
    height integer
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