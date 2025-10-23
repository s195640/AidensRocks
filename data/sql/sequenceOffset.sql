-- Photo Albums
DO $$
BEGIN
    EXECUTE format('ALTER SEQUENCE photoalbums_pa_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(pa_key), 0) + 1 FROM photoalbums), 100000));
    EXECUTE format('ALTER SEQUENCE photos_p_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(p_key), 0) + 1 FROM photos), 100000));
END $$;

-- Rock / Artist
DO $$
BEGIN
    EXECUTE format('ALTER SEQUENCE catalog_rc_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(rc_key), 0) + 1 FROM catalog), 100000));
    EXECUTE format('ALTER SEQUENCE artist_ra_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(ra_key), 0) + 1 FROM artist), 100000));
    EXECUTE format('ALTER SEQUENCE artist_link_ral_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(ral_key), 0) + 1 FROM artist_link), 100000));
END $$;

-- Rock Posts
DO $$
BEGIN
    EXECUTE format('ALTER SEQUENCE journey_rps_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(rps_key), 0) + 1 FROM journey), 100000));
    EXECUTE format('ALTER SEQUENCE journey_image_rpi_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(rpi_key), 0) + 1 FROM journey_image), 100000));
    EXECUTE format('ALTER SEQUENCE journey_tracking_rpt_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(rpt_key), 0) + 1 FROM journey_tracking), 100000));
END $$;

-- Counter
DO $$
BEGIN
    EXECUTE format('ALTER SEQUENCE counter_rcs_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(rcs_key), 0) + 1 FROM counter), 100000));
    EXECUTE format('ALTER SEQUENCE counter_tracking_rct_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(rct_key), 0) + 1 FROM counter_tracking), 100000));
END $$;

-- Music
DO $$
BEGIN
    EXECUTE format('ALTER SEQUENCE music_m_key_seq RESTART WITH %s;',
        GREATEST((SELECT COALESCE(MAX(rcs_key), 0) + 1 FROM counter), 100000));
END $$;

/*
SELECT 'photoalbums_pa_key_seq' AS sequence_name, last_value, is_called FROM photoalbums_pa_key_seq
UNION ALL
SELECT 'photos_p_key_seq', last_value, is_called FROM photos_p_key_seq
UNION ALL
SELECT 'catalog_rc_key_seq', last_value, is_called FROM catalog_rc_key_seq
UNION ALL
SELECT 'artist_ra_key_seq', last_value, is_called FROM artist_ra_key_seq
UNION ALL
SELECT 'artist_link_ral_key_seq', last_value, is_called FROM artist_link_ral_key_seq
UNION ALL
SELECT 'journey_rps_key_seq', last_value, is_called FROM journey_rps_key_seq
UNION ALL
SELECT 'journey_image_rpi_key_seq', last_value, is_called FROM journey_image_rpi_key_seq
UNION ALL
SELECT 'journey_tracking_rpt_key_seq', last_value, is_called FROM journey_tracking_rpt_key_seq
UNION ALL
SELECT 'counter_rcs_key_seq', last_value, is_called FROM counter_rcs_key_seq
UNION ALL
SELECT 'counter_tracking_rct_key_seq', last_value, is_called FROM counter_tracking_rct_key_seq;
*/