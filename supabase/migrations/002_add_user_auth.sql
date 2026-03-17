-- Add user_id column to vocabulary table
ALTER TABLE vocabulary ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old unique constraint on word alone and create new one scoped to user
ALTER TABLE vocabulary DROP CONSTRAINT IF EXISTS vocabulary_word_key;
ALTER TABLE vocabulary ADD CONSTRAINT vocabulary_user_word_unique UNIQUE (user_id, word);

-- Create index for user_id queries
CREATE INDEX idx_vocabulary_user_id ON vocabulary (user_id);

-- Drop the old allow_all policy
DROP POLICY IF EXISTS "allow_all" ON vocabulary;

-- Users can only see their own words
CREATE POLICY "users_select_own" ON vocabulary
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own words
CREATE POLICY "users_insert_own" ON vocabulary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own words
CREATE POLICY "users_update_own" ON vocabulary
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own words
CREATE POLICY "users_delete_own" ON vocabulary
  FOR DELETE USING (auth.uid() = user_id);

-- Update the upsert function to include user_id
CREATE OR REPLACE FUNCTION upsert_vocabulary(
  p_user_id UUID,
  word_text TEXT,
  word_translation TEXT
)
RETURNS vocabulary AS $$
  INSERT INTO vocabulary (user_id, word, translation)
  VALUES (p_user_id, lower(trim(word_text)), word_translation)
  ON CONFLICT (user_id, word) DO UPDATE SET
    query_count = vocabulary.query_count + 1,
    last_queried = now()
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;
