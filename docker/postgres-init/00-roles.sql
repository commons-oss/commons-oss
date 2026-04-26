-- Local-dev roles for Commons OSS.
-- Two roles by design (per plan §4):
--   commons_admin → BYPASSRLS, used by migrations + seeds
--   commons_app   → no BYPASSRLS, used by the app at request time
-- Passwords are hard-coded for local dev only. Production sets these via secrets.

CREATE ROLE commons_admin WITH LOGIN PASSWORD 'commons_admin' BYPASSRLS CREATEDB;
CREATE ROLE commons_app   WITH LOGIN PASSWORD 'commons_app';

GRANT ALL PRIVILEGES ON DATABASE commons TO commons_admin;
GRANT CONNECT ON DATABASE commons TO commons_app;

-- Grant on the public schema. Future tables created by commons_admin will be
-- owned by commons_admin; the default-privileges block below grants commons_app
-- the table/sequence rights it needs at request time.
\connect commons
-- Postgres 16 removed CREATE on public from non-owners. Hand the schema to
-- commons_admin so migrations can create tables, and keep commons_app on USAGE.
ALTER SCHEMA public OWNER TO commons_admin;
GRANT USAGE ON SCHEMA public TO commons_app;
ALTER DEFAULT PRIVILEGES FOR ROLE commons_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO commons_app;
ALTER DEFAULT PRIVILEGES FOR ROLE commons_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO commons_app;

-- Optional: separate database for Logto (only used if you start the logto profile).
CREATE DATABASE commons_logto OWNER commons_admin;
