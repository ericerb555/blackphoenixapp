-- Recovered from the project's applied migration history on 2026-09-20.
-- This file did not exist in the repository, which meant the repo could not
-- rebuild the table the application stores everything in.
CREATE TABLE IF NOT EXISTS kv_store_12c91054 (
  key   TEXT  NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
ALTER TABLE kv_store_12c91054 ENABLE ROW LEVEL SECURITY;

-- NAMED, AND ONLY IF IT IS NOT ALREADY THERE.
--
-- This read `CREATE INDEX ON <table> (key text_pattern_ops);` — no name and no
-- IF NOT EXISTS. Postgres then invents a name, so every replay of this
-- migration built ANOTHER copy of the same index rather than recognising the
-- one already there.
--
-- On the live table that reached 1,162 byte-identical copies: 237 MB of index
-- on 927 rows, every write having to update all of them, and prefix reads
-- timing out. It is what made approving a vendor take 21 seconds and fail to
-- write the vendor record at all.
--
-- Naming it is the whole fix: a second run now finds it and does nothing.
CREATE INDEX IF NOT EXISTS kv_store_12c91054_key_prefix_idx
  ON kv_store_12c91054 (key text_pattern_ops);
