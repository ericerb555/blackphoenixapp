-- Switch row-level security on for the KV archive.
--
-- M-7 in tasks/security-audit-2026-10-16.md. Of the 34 tables in the public
-- schema, this was the only one with `rowsecurity = false`.
--
-- It was not exposed. Neither `anon` nor `authenticated` holds SELECT on it,
-- so PostgREST refuses the request before a policy would ever be consulted —
-- and the audit confirmed that against production.
--
-- But "protected by the absence of a GRANT" is a materially weaker thing than
-- "protected by a policy", and the difference is one statement wide. A single
-- `GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon` — not an exotic thing
-- to type while debugging a permissions problem — is survivable by every other
-- table in this schema and not by this one. What it holds is an archive of the
-- entire KV store: invoices, customers, orders, applications. That is the
-- whole business in one table whose only defence is that nobody has run the
-- wrong GRANT yet.
--
-- NO POLICIES ARE CREATED, DELIBERATELY.
--
-- RLS with no policy means deny-all for every role that respects it, which is
-- exactly the posture the four live kv_store_* tables already have. The
-- service-role key bypasses RLS, so the server reads this table exactly as it
-- does today and nothing in the application changes. A table nobody should
-- reach from a browser does not need a policy; it needs the gate shut.
--
-- Idempotent so a replay is harmless.

ALTER TABLE IF EXISTS public.kv_archive_20261003 ENABLE ROW LEVEL SECURITY;

-- Belt and braces: say out loud that the untrusted roles hold nothing here,
-- rather than relying on them never having been granted it. REVOKE on a
-- privilege that was never granted is a no-op, so this is safe to run.
REVOKE ALL ON public.kv_archive_20261003 FROM anon, authenticated;
