-- Dumped from database version 17.6 (Debian 17.6-2.pgdg13+1)
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pglogical; Type: SCHEMA; Schema: -; Owner: postgres
--

-- CREATE SCHEMA pglogical;


ALTER SCHEMA pglogical OWNER TO postgres;

--
-- Name: pglogical; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pglogical WITH SCHEMA pglogical;


--
-- Name: EXTENSION pglogical; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pglogical IS 'PostgreSQL Logical Replication';


SET default_tablespace = '';

SET default_table_access_method = heap;

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
-- Name: artist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.artist (
    ra_key integer NOT NULL,
    display_name character varying(255) NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    relation character varying(255),
    dob date
);


ALTER TABLE public.artist OWNER TO postgres;

--
-- Name: artist_link; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.artist_link (
    ral_key integer NOT NULL,
    ra_key integer NOT NULL,
    rc_key integer NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.artist_link OWNER TO postgres;

--
-- Name: artist_link_ral_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.artist_link_ral_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.artist_link_ral_key_seq OWNER TO postgres;

--
-- Name: artist_link_ral_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.artist_link_ral_key_seq OWNED BY public.artist_link.ral_key;


--
-- Name: artist_ra_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.artist_ra_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.artist_ra_key_seq OWNER TO postgres;

--
-- Name: artist_ra_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.artist_ra_key_seq OWNED BY public.artist.ra_key;


--
-- Name: catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.catalog (
    rc_key integer NOT NULL,
    rock_number integer NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    comment text
);


ALTER TABLE public.catalog OWNER TO postgres;

--
-- Name: catalog_rc_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.catalog_rc_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.catalog_rc_key_seq OWNER TO postgres;

--
-- Name: catalog_rc_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.catalog_rc_key_seq OWNED BY public.catalog.rc_key;


--
-- Name: rock_count_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rock_count_summary (
    rcs_key integer NOT NULL,
    rock_qr_number character varying(50) NOT NULL,
    create_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    update_dt timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.rock_count_summary OWNER TO postgres;

--
-- Name: rock_count_summary_rcs_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rock_count_summary_rcs_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rock_count_summary_rcs_key_seq OWNER TO postgres;

--
-- Name: rock_count_summary_rcs_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rock_count_summary_rcs_key_seq OWNED BY public.rock_count_summary.rcs_key;


--
-- Name: rock_count_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rock_count_tracking (
    rct_key integer NOT NULL,
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


ALTER TABLE public.rock_count_tracking OWNER TO postgres;

--
-- Name: rock_count_tracking_rct_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rock_count_tracking_rct_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rock_count_tracking_rct_key_seq OWNER TO postgres;

--
-- Name: rock_count_tracking_rct_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rock_count_tracking_rct_key_seq OWNED BY public.rock_count_tracking.rct_key;


--
-- Name: rock_post_image; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rock_post_image (
    rpi_key integer NOT NULL,
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


ALTER TABLE public.rock_post_image OWNER TO postgres;

--
-- Name: rock_post_image_rpi_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rock_post_image_rpi_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rock_post_image_rpi_key_seq OWNER TO postgres;

--
-- Name: rock_post_image_rpi_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rock_post_image_rpi_key_seq OWNED BY public.rock_post_image.rpi_key;


--
-- Name: rock_post_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rock_post_summary (
    rps_key integer NOT NULL,
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


ALTER TABLE public.rock_post_summary OWNER TO postgres;

--
-- Name: rock_post_summary_rps_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rock_post_summary_rps_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rock_post_summary_rps_key_seq OWNER TO postgres;

--
-- Name: rock_post_summary_rps_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rock_post_summary_rps_key_seq OWNED BY public.rock_post_summary.rps_key;


--
-- Name: rock_post_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rock_post_tracking (
    rpt_key integer NOT NULL,
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


ALTER TABLE public.rock_post_tracking OWNER TO postgres;

--
-- Name: rock_post_tracking_rpt_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rock_post_tracking_rpt_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rock_post_tracking_rpt_key_seq OWNER TO postgres;

--
-- Name: rock_post_tracking_rpt_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rock_post_tracking_rpt_key_seq OWNED BY public.rock_post_tracking.rpt_key;


--
-- Name: photoalbums pa_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photoalbums ALTER COLUMN pa_key SET DEFAULT nextval('public.photoalbums_pa_key_seq'::regclass);


--
-- Name: photos p_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos ALTER COLUMN p_key SET DEFAULT nextval('public.photos_p_key_seq'::regclass);


--
-- Name: artist ra_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.artist ALTER COLUMN ra_key SET DEFAULT nextval('public.artist_ra_key_seq'::regclass);


--
-- Name: artist_link ral_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.artist_link ALTER COLUMN ral_key SET DEFAULT nextval('public.artist_link_ral_key_seq'::regclass);


--
-- Name: catalog rc_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalog ALTER COLUMN rc_key SET DEFAULT nextval('public.catalog_rc_key_seq'::regclass);


--
-- Name: rock_count_summary rcs_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_count_summary ALTER COLUMN rcs_key SET DEFAULT nextval('public.rock_count_summary_rcs_key_seq'::regclass);


--
-- Name: rock_count_tracking rct_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_count_tracking ALTER COLUMN rct_key SET DEFAULT nextval('public.rock_count_tracking_rct_key_seq'::regclass);


--
-- Name: rock_post_image rpi_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_post_image ALTER COLUMN rpi_key SET DEFAULT nextval('public.rock_post_image_rpi_key_seq'::regclass);


--
-- Name: rock_post_summary rps_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_post_summary ALTER COLUMN rps_key SET DEFAULT nextval('public.rock_post_summary_rps_key_seq'::regclass);


--
-- Name: rock_post_tracking rpt_key; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_post_tracking ALTER COLUMN rpt_key SET DEFAULT nextval('public.rock_post_tracking_rpt_key_seq'::regclass);


--
-- Name: artist display_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.artist
    ADD CONSTRAINT display_name_unique UNIQUE (display_name);


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
-- Name: rock_count_summary rock_count_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_count_summary
    ADD CONSTRAINT rock_count_summary_pkey PRIMARY KEY (rcs_key);


--
-- Name: rock_count_tracking rock_count_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_count_tracking
    ADD CONSTRAINT rock_count_tracking_pkey PRIMARY KEY (rct_key);


--
-- Name: catalog rock_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalog
    ADD CONSTRAINT rock_number_unique UNIQUE (rock_number);


--
-- Name: rock_post_image rock_post_image_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_post_image
    ADD CONSTRAINT rock_post_image_pkey PRIMARY KEY (rpi_key);


--
-- Name: rock_post_summary rock_post_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_post_summary
    ADD CONSTRAINT rock_post_summary_pkey PRIMARY KEY (rps_key);


--
-- Name: rock_post_tracking rock_post_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_post_tracking
    ADD CONSTRAINT rock_post_tracking_pkey PRIMARY KEY (rpt_key);


--
-- Name: artist_link unique_ra_rc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.artist_link
    ADD CONSTRAINT unique_ra_rc UNIQUE (ra_key, rc_key);


--
-- Name: photos fk_photo_album; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT fk_photo_album FOREIGN KEY (pa_key) REFERENCES public.photoalbums(pa_key) ON DELETE CASCADE;


--
-- Name: artist_link fk_ra_key; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.artist_link
    ADD CONSTRAINT fk_ra_key FOREIGN KEY (ra_key) REFERENCES public.artist(ra_key) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: artist_link fk_rc_key; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.artist_link
    ADD CONSTRAINT fk_rc_key FOREIGN KEY (rc_key) REFERENCES public.catalog(rc_key) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rock_count_tracking fk_rcs_key; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_count_tracking
    ADD CONSTRAINT fk_rcs_key FOREIGN KEY (rcs_key) REFERENCES public.rock_count_summary(rcs_key) ON DELETE CASCADE;


--
-- Name: rock_post_image fk_rps_key; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_post_image
    ADD CONSTRAINT fk_rps_key FOREIGN KEY (rps_key) REFERENCES public.rock_post_summary(rps_key) ON DELETE CASCADE;


--
-- Name: rock_post_tracking fk_rps_key; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rock_post_tracking
    ADD CONSTRAINT fk_rps_key FOREIGN KEY (rps_key) REFERENCES public.rock_post_summary(rps_key) ON DELETE CASCADE;
