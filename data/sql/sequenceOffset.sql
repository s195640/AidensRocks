-- Photo Albums
ALTER SEQUENCE photoalbums_pa_key_seq RESTART WITH 1000000;
ALTER SEQUENCE photos_p_key_seq RESTART WITH 1000000;

-- Rock / Artist
ALTER SEQUENCE catalog_rc_key_seq RESTART WITH 1000000;
ALTER SEQUENCE artist_ra_key_seq RESTART WITH 1000000;
ALTER SEQUENCE artist_link_ral_key_seq RESTART WITH 1000000;

-- Rock Posts
ALTER SEQUENCE rock_post_summary_rps_key_seq RESTART WITH 1000000;
ALTER SEQUENCE rock_post_image_rpi_key_seq RESTART WITH 1000000;
ALTER SEQUENCE rock_post_tracking_rpt_key_seq RESTART WITH 1000000;

-- Counter
ALTER SEQUENCE rock_count_summary_rcs_key_seq RESTART WITH 1000000;
ALTER SEQUENCE rock_count_tracking_rct_key_seq RESTART WITH 1000000;
