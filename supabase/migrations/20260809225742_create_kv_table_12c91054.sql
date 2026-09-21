-- Recovered from the project's applied migration history on 2026-09-20.
-- This file did not exist in the repository, which meant the repo could not
-- rebuild the table the application stores everything in.
CREATE TABLE IF NOT EXISTS kv_store_12c91054 (
  key   TEXT  NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
ALTER TABLE kv_store_12c91054 ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON kv_store_12c91054 (key text_pattern_ops);
