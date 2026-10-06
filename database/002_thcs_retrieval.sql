ALTER TABLE app_notes ADD (grade NUMBER(1) DEFAULT 6 NOT NULL CHECK (grade BETWEEN 6 AND 9));
ALTER TABLE app_notes ADD (search_text CLOB);
CREATE INDEX app_notes_grade_idx ON app_notes(user_id,grade,updated_at DESC);
