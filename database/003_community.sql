-- Additive migration; automatically applied at cold start.
CREATE TABLE IF NOT EXISTS app_checkins (user_id TEXT NOT NULL, day TEXT NOT NULL, streak INTEGER NOT NULL, amount INTEGER NOT NULL, PRIMARY KEY(user_id,day));
CREATE TABLE IF NOT EXISTS app_peer_threads (id TEXT PRIMARY KEY, member_a TEXT NOT NULL, member_b TEXT NOT NULL, name_a TEXT NOT NULL, name_b TEXT NOT NULL, read_a INTEGER NOT NULL DEFAULT 0, read_b INTEGER NOT NULL DEFAULT 0, UNIQUE(member_a,member_b), CHECK(member_a<member_b));
CREATE TABLE IF NOT EXISTS app_peer_messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, thread_id TEXT NOT NULL REFERENCES app_peer_threads(id), sender_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX IF NOT EXISTS app_peer_message_thread ON app_peer_messages(thread_id,seq DESC);
CREATE TABLE IF NOT EXISTS app_peer_blocks (owner_id TEXT NOT NULL, blocked_id TEXT NOT NULL, PRIMARY KEY(owner_id,blocked_id));
