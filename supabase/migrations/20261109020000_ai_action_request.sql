-- Things the AI wants to do, and the human decision in front of each one.
--
-- WHY THIS EXISTS
--
-- Phoenix could read the business and not touch it. That is the right place
-- to start and the wrong place to stop: an assistant that can tell you three
-- invoices are overdue and cannot chase them is a very good search box.
--
-- Section 10 of the specification calls this Level 2 — supervised autonomy,
-- where the agent executes approved work and anything of consequence waits
-- for an authenticated human decision. This table is that waiting room.
--
-- THE PROPERTY THE WHOLE THING RESTS ON
--
-- The thing approved must be the thing executed.
--
-- `publishApproval.ts` already learned this the hard way for tenant content:
-- without it, somebody submits something inoffensive, waits for the tick, and
-- then edits it. Here the risk is sharper, because the proposer is a language
-- model and the executor is a server with the company's Stripe keys and mail
-- sender.
--
-- So `params` is written once, at proposal, and never updated — there is a
-- trigger below that refuses it. Execution reads `params` from this row and
-- nothing from the request that approved it. The model does not get a second
-- say between the decision and the act.
--
-- WHY A SEPARATE TABLE FROM ai_call_log
--
-- The ledger records what happened. This records what has been ASKED to
-- happen and has not happened yet. Mixing them would mean a row whose
-- meaning changes over time, and the first question after an incident —
-- "what did it do" — would need a filter to answer.

create table if not exists public.ai_action_request (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),

  -- WHO WANTS IT. `agent` is the capability that proposed it; `requested_by`
  -- is the person whose conversation produced the proposal. Both, because
  -- "the AI suggested it" and "Eric asked it to" are different facts.
  agent          text        not null,
  requested_by   text,

  -- WHAT. `action` names a handler in the server's registry; an action with
  -- no handler can be proposed and can never execute, which is the safe way
  -- round. `params` is the frozen argument set — see the trigger.
  action         text        not null,
  params         jsonb       not null default '{}'::jsonb,

  -- The sentence a person reads before deciding. Written at proposal by the
  -- caller, not by the model, so it describes what will actually run.
  summary        text        not null,

  /**
   * How much it matters, decided by the server from the action type — never
   * by the model proposing it.
   *
   * `low`    reversible and private. A draft nobody has seen.
   * `medium` reaches somebody outside the company, or changes a record.
   * `high`   money, credentials, or something that cannot be taken back.
   *
   * Only the routes read this, but it is stored so that a decision can be
   * audited against the risk as it stood at the time, rather than against
   * whatever the registry says months later.
   */
  risk           text        not null default 'medium',

  -- pending -> approved -> executed, or -> rejected, or -> expired.
  -- `failed` is a terminal state after an approved action threw.
  status         text        not null default 'pending',

  decided_by     text,
  decided_at     timestamptz,
  decision_note  text,

  executed_at    timestamptz,
  result         text,
  error          text,

  /**
   * A proposal goes stale.
   *
   * "Chase these three invoices" is a reasonable thing to approve ten
   * minutes later and an unreasonable thing to approve next week, by which
   * time two may have paid. Default 24 hours; the queue refuses to execute
   * anything past it.
   */
  expires_at     timestamptz not null default (now() + interval '24 hours')
);

comment on table public.ai_action_request is
  'Actions the AI has proposed and a human has not yet decided on. params is immutable after insert so the thing approved is the thing executed.';

create index if not exists ai_action_request_pending_idx
  on public.ai_action_request (created_at desc)
  where status = 'pending';

create index if not exists ai_action_request_status_idx
  on public.ai_action_request (status, created_at desc);

/**
 * The params cannot change after the row is written.
 *
 * This is the one rule that makes an approval mean anything. Without it, a
 * row could be approved while saying "email three leads" and executed
 * saying something else entirely, and the audit trail would show a clean
 * approval either way.
 *
 * `summary` is frozen with it, because the summary is what the human
 * actually read. `action` too — approving a draft is not approving a send.
 */
create or replace function public.ai_action_request_freeze()
returns trigger
language plpgsql
as $$
begin
  if new.params is distinct from old.params
     or new.action is distinct from old.action
     or new.summary is distinct from old.summary
     or new.agent is distinct from old.agent then
    raise exception
      'ai_action_request: action, params, summary and agent are immutable after proposal (id %)', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists ai_action_request_freeze_trg on public.ai_action_request;
create trigger ai_action_request_freeze_trg
  before update on public.ai_action_request
  for each row execute function public.ai_action_request_freeze();

/**
 * Nothing granted, same as the ledger and the kill switch.
 *
 * Written and read by the service role through routes that establish who is
 * asking. A table the AI could write to directly would be an approval queue
 * the AI could approve from.
 */
alter table public.ai_action_request enable row level security;

revoke all on function public.ai_action_request_freeze() from public, anon, authenticated;
