CREATE TABLE app_notes (
 note_id VARCHAR2(36) PRIMARY KEY,user_id VARCHAR2(128) NOT NULL,
 title VARCHAR2(160 CHAR) NOT NULL,subject VARCHAR2(160 CHAR) NOT NULL,chapter VARCHAR2(160 CHAR) NOT NULL,
 summary VARCHAR2(1000 CHAR),tags_json VARCHAR2(4000) DEFAULT '[]' NOT NULL CHECK(tags_json IS JSON),
 content_json CLOB NOT NULL CHECK(content_json IS JSON),images_json CLOB NOT NULL CHECK(images_json IS JSON),study_json CLOB CHECK(study_json IS JSON),
 created_at TIMESTAMP(3) DEFAULT SYS_EXTRACT_UTC(SYSTIMESTAMP) NOT NULL,updated_at TIMESTAMP(3) DEFAULT SYS_EXTRACT_UTC(SYSTIMESTAMP) NOT NULL
);
CREATE INDEX app_notes_owner_idx ON app_notes(user_id,updated_at DESC);
CREATE INDEX app_notes_subject_idx ON app_notes(user_id,subject,chapter);
CREATE TABLE app_attempts (
 attempt_id VARCHAR2(36) PRIMARY KEY,user_id VARCHAR2(128) NOT NULL,note_id VARCHAR2(36) NOT NULL REFERENCES app_notes(note_id) ON DELETE CASCADE,
 mode VARCHAR2(20) NOT NULL CHECK(mode IN ('quiz','flashcards','match')),score NUMBER(3) NOT NULL,total NUMBER(3) NOT NULL,
 next_review_at TIMESTAMP(3) NOT NULL,created_at TIMESTAMP(3) DEFAULT SYS_EXTRACT_UTC(SYSTIMESTAMP) NOT NULL,
 CONSTRAINT app_attempt_score_ck CHECK(score>=0 AND total>0 AND score<=total)
);
CREATE INDEX app_attempts_owner_idx ON app_attempts(user_id,created_at DESC);
CREATE TABLE app_chats (
 user_id VARCHAR2(128) NOT NULL,context_id VARCHAR2(36) NOT NULL,messages_json CLOB NOT NULL CHECK(messages_json IS JSON),
 updated_at TIMESTAMP(3) DEFAULT SYS_EXTRACT_UTC(SYSTIMESTAMP) NOT NULL,PRIMARY KEY(user_id,context_id)
);
CREATE TABLE app_ai_usage (
 user_id VARCHAR2(128) NOT NULL,usage_day DATE NOT NULL,used_count NUMBER DEFAULT 0 NOT NULL,PRIMARY KEY(user_id,usage_day)
);
