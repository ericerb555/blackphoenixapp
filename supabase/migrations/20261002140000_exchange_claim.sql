-- ============================================================================
-- Phoenix Exchange — proving you own the listing
--
-- The directory is compiled from public records, so every row in it describes
-- a real business that never asked to be there. Claiming is how that row
-- becomes theirs. It is the only moment in the Exchange where getting it wrong
-- hands a stranger control of somebody's business identity, their leads and
-- their reputation.
--
-- WHY KNOWING THINGS CANNOT BE THE TEST
--
-- The name, the address and the phone number are printed on the very page an
-- attacker would be attacking. Anything a form could ask them to recite is
-- already public. So the test is never "do you know this business", it is "do
-- you CONTROL something only this business controls" — a phone, a domain, a
-- letterbox, a licence.
--
-- TWO FACTORS, FROM TWO DIFFERENT CATEGORIES
--
--   contact      a code to the phone or email already in the public record
--   web          a DNS record, a file on the domain, or an address at it
--   premises     a code posted by mail to the public-record address
--   credential   a licence that matches, or documents a person has read
--
-- Two proofs in the SAME category do not count. A domain-matched email and a
-- DNS token both prove only "controls the domain", and letting them stack
-- would admit anyone who registered a lookalike.
--
-- WHAT IS STORED, AND WHAT IS NOT
--
-- Never the code. Never the token. A challenge holds a SHA-256 of its secret
-- and a masked version of where it was sent, so a leak of this table is not a
-- pile of live claim codes, and nobody reading it learns a contact detail that
-- was not already public.
-- ============================================================================


-- ------------------------------------------------------------
-- 1. THE CLAIM
-- ------------------------------------------------------------
create table if not exists exchange_claim (
  id         uuid primary key default gen_random_uuid(),

  org_id     uuid not null references organizations(id) on delete cascade,

  -- Who is asking. A claim always belongs to a real account, because the
  -- whole point is to attach the listing to somebody we can hold responsible.
  claimant_user_id uuid not null references auth.users(id) on delete cascade,

  -- 'open'          factors outstanding
  -- 'needs_review'  everything possible was proven and it was not enough, or
  --                 the listing cannot reach two categories at all. A person
  --                 decides. Deliberately NOT a refusal: a business with only
  --                 a phone number must still be able to join.
  -- 'granted'       the listing is theirs
  -- 'refused'       decided against, with a reason
  -- 'disputed'      the listing was already claimed by somebody else
  -- 'withdrawn'     the claimant gave up, or a newer claim replaced it
  state      text not null default 'open',

  -- Why it ended the way it did, in words, for whoever reads this in a year.
  outcome_reason text,

  -- A claim against a listing somebody has ALREADY claimed. It never takes
  -- over on its own: the incumbent is told and a person rules.
  is_dispute boolean not null default false,

  -- The seven-day clock, STORED rather than computed at read time. If the
  -- policy changes later it must not retroactively decide a dispute that is
  -- already running.
  dispute_decides_after timestamptz,

  decided_at timestamptz,
  -- Null when the decision was automatic. A human decision names the human.
  decided_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meta       jsonb not null default '{}'::jsonb
);

alter table exchange_claim drop constraint if exists exchange_claim_state_known;
alter table exchange_claim add constraint exchange_claim_state_known check (
  state in ('open', 'needs_review', 'granted', 'refused', 'disputed', 'withdrawn')
);

-- A decision has to say who made it and when, or it is not a decision.
alter table exchange_claim drop constraint if exists exchange_claim_decided_together;
alter table exchange_claim add constraint exchange_claim_decided_together check (
  (state in ('open', 'needs_review', 'disputed') and decided_at is null)
  or (state in ('granted', 'refused', 'withdrawn') and decided_at is not null)
);

-- ONE LISTING, ONE GRANTED CLAIM, EVER.
--
-- Enforced here and not only in the route. Two requests arriving in the same
-- second is exactly how a double grant happens, and the second writer would
-- otherwise win silently.
create unique index if not exists exchange_claim_one_granted_idx
  on exchange_claim (org_id) where state = 'granted';

-- One live claim per person per listing, so refreshing the page does not
-- start a second attempt with its own fresh allowance of codes.
create unique index if not exists exchange_claim_one_open_idx
  on exchange_claim (org_id, claimant_user_id) where state in ('open', 'needs_review', 'disputed');

create index if not exists exchange_claim_org_idx on exchange_claim (org_id, created_at desc);
create index if not exists exchange_claim_claimant_idx on exchange_claim (claimant_user_id, created_at desc);
-- The review queue, which is a promise to somebody that a person will look.
create index if not exists exchange_claim_queue_idx
  on exchange_claim (state, created_at) where state in ('needs_review', 'disputed');


-- ------------------------------------------------------------
-- 2. THE CHALLENGES — one row per attempt to prove one thing
-- ------------------------------------------------------------
create table if not exists exchange_claim_challenge (
  id       uuid primary key default gen_random_uuid(),

  claim_id uuid not null references exchange_claim(id) on delete cascade,

  -- Denormalised from the claim ON PURPOSE. The issue cap asks "how many
  -- codes has this listing had today", across every claimant, and that
  -- question should not need a join to answer — a rate limit that is
  -- expensive to check is a rate limit somebody removes.
  org_id   uuid not null references organizations(id) on delete cascade,

  -- What was tried, and which category it belongs to. The category is stored
  -- rather than only derived in code so an audit can read this table on its
  -- own and still see why two proofs did or did not count as two.
  factor   text not null,
  category text not null,

  -- What the claimant is shown: '•••-•••-1234'. Never the full destination,
  -- because the registry contact is not always the public one and this screen
  -- must not become a way to read it.
  target_masked text,

  -- A hash of where it actually went, so a dispute can later establish which
  -- destination received the code even if the listing has been edited since.
  target_hash   text,

  -- SHA-256 of the code or token. Null for factors that carry no secret —
  -- documents a person reads, or a licence compared against a record.
  secret_hash   text,

  issued_at    timestamptz not null default now(),
  expires_at   timestamptz,

  -- Five tries and the challenge is dead. A six-digit code with unlimited
  -- attempts is a four-minute brute force.
  attempts     integer not null default 0,
  max_attempts integer not null default 5,

  satisfied_at timestamptz,
  -- Spent, expired-and-retired, or killed by too many attempts. A burned
  -- challenge can never be satisfied, whatever arrives afterwards.
  burned_at    timestamptz,

  meta         jsonb not null default '{}'::jsonb
);

alter table exchange_claim_challenge drop constraint if exists exchange_claim_challenge_category_known;
alter table exchange_claim_challenge add constraint exchange_claim_challenge_category_known check (
  category in ('contact', 'web', 'premises', 'credential')
);

alter table exchange_claim_challenge drop constraint if exists exchange_claim_challenge_attempts_sane;
alter table exchange_claim_challenge add constraint exchange_claim_challenge_attempts_sane check (
  attempts >= 0 and max_attempts between 1 and 10
);

-- A satisfied challenge is not a burned one. Allowing both would make
-- "is this proven" ambiguous, and the ambiguity would be resolved in whichever
-- direction the reading code happened to check first.
alter table exchange_claim_challenge drop constraint if exists exchange_claim_challenge_not_both;
alter table exchange_claim_challenge add constraint exchange_claim_challenge_not_both check (
  satisfied_at is null or burned_at is null
);

create index if not exists exchange_claim_challenge_claim_idx
  on exchange_claim_challenge (claim_id, issued_at desc);
-- The daily issue cap, per listing.
create index if not exists exchange_claim_challenge_rate_idx
  on exchange_claim_challenge (org_id, issued_at desc);
-- Answering a code looks it up by its hash, never by scanning.
create index if not exists exchange_claim_challenge_secret_idx
  on exchange_claim_challenge (secret_hash) where secret_hash is not null;


-- ------------------------------------------------------------
-- 3. ROW-LEVEL SECURITY — on, with no policies at all
--
-- Same posture as the two ledgers, for a sharper reason. These rows are the
-- credential material for taking over a business listing. Even a correct
-- select policy would let a claimant read their own challenge row, and that
-- row is one careless `select *` away from handing over the hash and the
-- destination of every code.
--
-- Everything goes through the server with the service role, which bypasses
-- RLS. Nothing here is ever served to a browser as rows: the claim screen is
-- told which factors are outstanding, and nothing else.
-- ------------------------------------------------------------
alter table exchange_claim           enable row level security;
alter table exchange_claim_challenge enable row level security;

revoke all on exchange_claim           from anon, authenticated;
revoke all on exchange_claim_challenge from anon, authenticated;
