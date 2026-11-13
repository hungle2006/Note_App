import type {Client} from "@libsql/client";

export const schemaVersion = "turso-006";
// Additive, idempotent bootstrap. No existing database is dropped or cleared.
export const schemaStatements = [
 `CREATE TABLE IF NOT EXISTS app_migrations (
  version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
 )`,
 `CREATE TABLE IF NOT EXISTS app_notes (
  note_id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 6 AND 9),
  title TEXT NOT NULL, subject TEXT NOT NULL, chapter TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '', search_text TEXT NOT NULL,
  tags_json TEXT NOT NULL CHECK (json_valid(tags_json)),
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  images_json TEXT NOT NULL CHECK (json_valid(images_json)),
  study_json TEXT CHECK (study_json IS NULL OR json_valid(study_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, note_id)
 )`,
 `CREATE INDEX IF NOT EXISTS app_notes_owner_updated ON app_notes(user_id, updated_at DESC, note_id)`,
 `CREATE INDEX IF NOT EXISTS app_notes_owner_grade ON app_notes(user_id, grade, updated_at DESC)`,
 `CREATE INDEX IF NOT EXISTS app_notes_owner_subject ON app_notes(user_id, subject, chapter)`,
 `CREATE TABLE IF NOT EXISTS app_attempts (
  attempt_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, note_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('quiz','flashcards','match')),
  score INTEGER NOT NULL CHECK (score >= 0), total INTEGER NOT NULL CHECK (total > 0 AND score <= total),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  next_review_at TEXT NOT NULL,
  FOREIGN KEY (user_id, note_id) REFERENCES app_notes(user_id, note_id) ON DELETE CASCADE
 )`,
 `CREATE INDEX IF NOT EXISTS app_attempts_owner_created ON app_attempts(user_id, created_at DESC)`,
 `CREATE TABLE IF NOT EXISTS app_chats (
  user_id TEXT NOT NULL, context_id TEXT NOT NULL, note_id TEXT,
  messages_json TEXT NOT NULL CHECK (json_valid(messages_json)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, context_id),
  FOREIGN KEY (user_id, note_id) REFERENCES app_notes(user_id, note_id) ON DELETE CASCADE
 )`,
 `CREATE TABLE IF NOT EXISTS app_chat_threads (
  thread_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, note_id TEXT,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 6 AND 9),
  title TEXT NOT NULL DEFAULT 'Cuộc trò chuyện mới',
  messages_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(messages_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id, note_id) REFERENCES app_notes(user_id, note_id) ON DELETE CASCADE
 )`,
 `CREATE INDEX IF NOT EXISTS app_chat_threads_owner ON app_chat_threads(user_id, grade, note_id, updated_at DESC)`,
 `CREATE TABLE IF NOT EXISTS app_ai_usage (
  user_id TEXT NOT NULL, usage_day TEXT NOT NULL, used_count INTEGER NOT NULL CHECK (used_count >= 0),
  PRIMARY KEY (user_id, usage_day)
 )`,
 `CREATE TABLE IF NOT EXISTS app_points_ledger (
  event_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, source_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('practice','redeem')), amount INTEGER NOT NULL,
  label TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id,source_key)
 )`,
 `CREATE INDEX IF NOT EXISTS app_points_owner ON app_points_ledger(user_id,created_at DESC)`,
 `CREATE TABLE IF NOT EXISTS app_fitness_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exercise TEXT NOT NULL CHECK (exercise IN ('squat','chair','pushup','jack','knees','press','arms')),
  reps INTEGER NOT NULL CHECK (reps BETWEEN 1 AND 500),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 0 AND 7200),
  points REAL NOT NULL CHECK (points >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id,session_id)
 )`,
 `CREATE INDEX IF NOT EXISTS app_fitness_owner_created ON app_fitness_sessions(user_id,created_at DESC)`,
 `CREATE TABLE IF NOT EXISTS app_redemptions (
  user_id TEXT NOT NULL, reward_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(user_id,reward_id)
 )`,
 `CREATE TABLE IF NOT EXISTS app_checkins (user_id TEXT NOT NULL, day TEXT NOT NULL, streak INTEGER NOT NULL, amount INTEGER NOT NULL, PRIMARY KEY(user_id,day))`,
 `CREATE TABLE IF NOT EXISTS app_peer_threads (id TEXT PRIMARY KEY, member_a TEXT NOT NULL, member_b TEXT NOT NULL, name_a TEXT NOT NULL, name_b TEXT NOT NULL, read_a INTEGER NOT NULL DEFAULT 0, read_b INTEGER NOT NULL DEFAULT 0, UNIQUE(member_a,member_b), CHECK(member_a<member_b))`,
 `CREATE TABLE IF NOT EXISTS app_peer_messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, thread_id TEXT NOT NULL REFERENCES app_peer_threads(id), sender_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
 `CREATE INDEX IF NOT EXISTS app_peer_message_thread ON app_peer_messages(thread_id,seq DESC)`,
 `CREATE TABLE IF NOT EXISTS app_peer_blocks (owner_id TEXT NOT NULL, blocked_id TEXT NOT NULL, PRIMARY KEY(owner_id,blocked_id))`,
 `CREATE TABLE IF NOT EXISTS app_peer_presence (user_id TEXT PRIMARY KEY, last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), show_online INTEGER NOT NULL DEFAULT 1 CHECK (show_online IN (0,1)))`,
];

export async function initializeSchema(client:Client) {
 // A write batch is atomic; competing cold starts can safely repeat IF NOT EXISTS.
 await client.batch([...schemaStatements, {
  sql:"INSERT INTO app_migrations(version) VALUES (?) ON CONFLICT(version) DO NOTHING",
  args:[schemaVersion],
 }], "write");
}
