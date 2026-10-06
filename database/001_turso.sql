-- Generated from src/lib/server/turso-schema.ts. For Turso libSQL.
BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS app_migrations (
  version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
 );

CREATE TABLE IF NOT EXISTS app_notes (
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
 );

CREATE INDEX IF NOT EXISTS app_notes_owner_updated ON app_notes(user_id, updated_at DESC, note_id);

CREATE INDEX IF NOT EXISTS app_notes_owner_grade ON app_notes(user_id, grade, updated_at DESC);

CREATE INDEX IF NOT EXISTS app_notes_owner_subject ON app_notes(user_id, subject, chapter);

CREATE TABLE IF NOT EXISTS app_attempts (
  attempt_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, note_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('quiz','flashcards','match')),
  score INTEGER NOT NULL CHECK (score >= 0), total INTEGER NOT NULL CHECK (total > 0 AND score <= total),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  next_review_at TEXT NOT NULL,
  FOREIGN KEY (user_id, note_id) REFERENCES app_notes(user_id, note_id) ON DELETE CASCADE
 );

CREATE INDEX IF NOT EXISTS app_attempts_owner_created ON app_attempts(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_chats (
  user_id TEXT NOT NULL, context_id TEXT NOT NULL, note_id TEXT,
  messages_json TEXT NOT NULL CHECK (json_valid(messages_json)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, context_id),
  FOREIGN KEY (user_id, note_id) REFERENCES app_notes(user_id, note_id) ON DELETE CASCADE
 );

CREATE TABLE IF NOT EXISTS app_ai_usage (
  user_id TEXT NOT NULL, usage_day TEXT NOT NULL, used_count INTEGER NOT NULL CHECK (used_count >= 0),
  PRIMARY KEY (user_id, usage_day)
 );

INSERT INTO app_migrations(version) VALUES ('turso-001') ON CONFLICT(version) DO NOTHING;
COMMIT;
