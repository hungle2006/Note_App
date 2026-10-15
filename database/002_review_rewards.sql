-- Additive migration; never drops existing study data.
CREATE TABLE IF NOT EXISTS app_points_ledger (
  event_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, source_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('practice','redeem')), amount INTEGER NOT NULL,
  label TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id,source_key)
 );

CREATE INDEX IF NOT EXISTS app_points_owner ON app_points_ledger(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS app_redemptions (
  user_id TEXT NOT NULL, reward_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(user_id,reward_id)
 );
INSERT INTO app_migrations(version) VALUES('turso-002') ON CONFLICT(version) DO NOTHING;
