-- Track cumulative quiz correct count for auto-removal
ALTER TABLE vocabulary ADD COLUMN quiz_correct_count INTEGER NOT NULL DEFAULT 0;
