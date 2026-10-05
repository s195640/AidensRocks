-- Adds site accounts (User Accounts feature, phase 1): sign-up/sign-in for
-- visitors and the admin alike, replacing the old single env-var admin
-- login. See data/ai-build-docs/user-accounts/user-accounts-feature-plan.md.
--
--   account        - one row per login. email is the username (unique,
--                    case-insensitive). access_level is 10 unverified,
--                    20 user, 30 creator, 50 admin. "Locked" (shown as 40
--                    in the admin UI) is the separate is_locked flag so
--                    locking never loses the account's real level; set
--                    after 5 bad logins, cleared by a password reset.
--   account_token  - single-use email verification / password reset
--                    tokens. Only a sha256 of the token is stored.
--   account_follow - rocks an account is following (Follow Rocks page,
--                    orange map pins, rock-moved emails).
--
-- Also seeds the 'follow-rocks' page_content row so the page gets a navbar
-- entry (the client only shows it to signed-in users, level >= 20).
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent) if a deploy step fails partway through.

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

ALTER TABLE public.account OWNER TO postgres;

-- New accounts get rock-move emails on by default (users can turn them off
-- on Follow Rocks). Repeated here for DBs where an earlier version of this
-- migration already created the table with DEFAULT false; only affects
-- accounts created from now on.
ALTER TABLE public.account ALTER COLUMN notify_rock_moves SET DEFAULT true;

-- First/last name (required at sign-up, enforced in routes/auth.js; nullable
-- here so admin accounts made by `npm run create-admin` and any rows from an
-- earlier version of this migration stay valid). Repeated as ADD COLUMN IF
-- NOT EXISTS for DBs where the table already existed.
ALTER TABLE public.account ADD COLUMN IF NOT EXISTS first_name character varying(100);
ALTER TABLE public.account ADD COLUMN IF NOT EXISTS last_name character varying(100);

-- Creator accounts can be linked to one artist (admin Accounts page); an
-- artist links to at most one account. Only kept while access_level = 30
-- (enforced in routes/accountsAdmin.js); cleared if the artist is deleted.
ALTER TABLE public.account ADD COLUMN IF NOT EXISTS ra_key integer REFERENCES public.artist(ra_key) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_ra_key ON public.account (ra_key) WHERE ra_key IS NOT NULL;

-- Sign-in version stamped into every JWT (`ver`). Bumping it (password
-- reset, account locked) signs the account out on every device at once —
-- see middleware/requireAuth.js.
ALTER TABLE public.account ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;

-- Last time the account used the site while signed in (any authenticated
-- request), updated at most every 5 minutes — see middleware/requireAuth.js.
ALTER TABLE public.account ADD COLUMN IF NOT EXISTS last_seen_dt timestamptz;

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

-- Follow Rocks nav entry, appended to the end of the public nav. Guarded by
-- an existence check so a re-run doesn't pick a new order_num.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.page_content WHERE page_slug = 'follow-rocks') THEN
    INSERT INTO public.page_content (page_slug, nav_label, order_num, visible)
    SELECT 'follow-rocks', 'Follow Rocks', COALESCE(MAX(order_num), 0) + 1, true
    FROM public.page_content;
  END IF;
END $$;

-- pglogical replication set: accounts should be identical on both nodes, so
-- these brand-new tables need a one-time registration, distinct from the
-- CREATE TABLE step above. Run once, on the PROVIDER node only, after
-- CREATE TABLE has been applied on both nodes. page_content is already
-- replicated (no action needed for the seed row).
--
-- synchronize_data := false is explicit and intentional: these tables have
-- zero rows at creation time, so there's nothing to sync.
-- SELECT pglogical.replication_set_add_table('default', 'account', synchronize_data := false);
-- SELECT pglogical.replication_set_add_table('default', 'account_token', synchronize_data := false);
-- SELECT pglogical.replication_set_add_table('default', 'account_follow', synchronize_data := false);
