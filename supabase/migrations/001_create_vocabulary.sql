CREATE TABLE vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT UNIQUE NOT NULL,
    translation TEXT NOT NULL,
    query_count INTEGER NOT NULL DEFAULT 1,
    familiarity_score FLOAT NOT NULL DEFAULT 0.0,
    last_queried TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vocabulary_familiarity ON vocabulary (familiarity_score ASC);
CREATE INDEX idx_vocabulary_query_count ON vocabulary (query_count DESC);
CREATE INDEX idx_vocabulary_last_queried ON vocabulary (last_queried DESC);

ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

-- For MVP without auth, allow all operations
CREATE POLICY "allow_all" ON vocabulary FOR ALL USING (true) WITH CHECK (true);

-- Atomic upsert function (avoids read-then-write race condition)
CREATE OR REPLACE FUNCTION upsert_vocabulary(word_text TEXT, word_translation TEXT)
RETURNS vocabulary AS $$
  INSERT INTO vocabulary (word, translation)
  VALUES (lower(trim(word_text)), word_translation)
  ON CONFLICT (word) DO UPDATE SET
    query_count = vocabulary.query_count + 1,
    last_queried = now()
  RETURNING *;
$$ LANGUAGE sql;
