-- Atomic gift-card debit.
--
-- WHY THIS IS A DATABASE FUNCTION AND NOT APPLICATION CODE
--
-- Both gift-card paths did this:
--
--     read balance (100) → check 100 >= amount → write balance - amount
--
-- Two requests arriving together both read 100, both pass the check, and both
-- write 0. The card is spent twice. The idempotency key on the redemption route
-- does not help: it protects a retry of the *same* redemption, and a race is two
-- different ones. Store checkout's reservation has the same shape, so a card
-- could be double-spent by racing two orders — and that is the path in use.
--
-- `kv_store.tsx` offers get/set/del/mget/mset/mdel/getByPrefix and no
-- compare-and-set, so "decrement only if the balance is still what I read"
-- cannot be expressed above the database. Here it is one statement.
--
-- HOW THE GUARANTEE WORKS
--
-- A single UPDATE takes a row lock. A second transaction updating the same row
-- waits for the first to commit and then, under READ COMMITTED, re-evaluates its
-- WHERE clause against the new row. So the second caller sees the decremented
-- balance and its guard fails. The check and the write cannot be separated,
-- because they are the same statement.
--
-- WHY IT WRITES ALL THREE FIELDS
--
-- The first version moved only `balance`, which was worse than useless: the
-- caller would then have written the card back with its own `redeemedAmount` and
-- `redemptionHistory` from a stale read, overwriting the atomic balance with the
-- number this exists to prevent. Everything the redemption changes moves here,
-- in the same statement, and **the caller must not write the card back
-- afterwards**.
--
-- Returns the updated card, or no row when the debit was refused. The caller
-- treats "no row" as a refusal — never as an error to retry, never as success.
--
-- Tested on branch `giftcard-atomic-debit`: normal debit; exact-balance debit;
-- over-balance, negative, zero, cancelled-card, missing-balance and
-- missing-card all refused; rounding to two places; two full-balance debits in
-- one statement where the second is refused because the guard re-read.

drop function if exists public.gift_card_debit(text, numeric);

create or replace function public.gift_card_debit(
  card_key text,
  debit_amount numeric,
  redemption jsonb default '{}'::jsonb
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  update kv_store_57095a78
     set value = jsonb_set(
           jsonb_set(
             jsonb_set(
               value,
               '{balance}',
               to_jsonb(round(((value->>'balance')::numeric - debit_amount)::numeric, 2))
             ),
             '{redeemedAmount}',
             to_jsonb(round((coalesce((value->>'redeemedAmount')::numeric, 0) + debit_amount)::numeric, 2))
           ),
           '{redemptionHistory}',
           coalesce(
             case when jsonb_typeof(value->'redemptionHistory') = 'array'
                  then value->'redemptionHistory' else '[]'::jsonb end,
             '[]'::jsonb
           ) || jsonb_build_array(redemption)
         )
   where key = card_key
     -- Guard and write in one statement. This is the whole point of the file.
     and value ? 'balance'
     and (value->>'balance')::numeric >= debit_amount
     -- A non-positive debit would increase the balance. Refused here rather
     -- than trusted to the caller, because this function is the last line.
     and debit_amount > 0
     -- An inactive or cancelled card is not spendable.
     and coalesce(value->>'status', '') = 'active'
  returning value;
$$;

comment on function public.gift_card_debit(text, numeric, jsonb) is
  'Atomically debit a gift card: balance down, redeemedAmount up, and the redemption appended to history, all in one statement. Returns the updated card, or no row if the balance was insufficient, the debit was not positive, or the card was not active. The caller must NOT write the card back afterwards — doing so would overwrite this with its own stale read, which is the bug this exists to prevent.';

-- Only the server may spend a gift card.
--
-- `security definer` makes the function run as its owner, which is what lets it
-- write the kv table — so who may CALL it is the entire access control. Postgres
-- grants execute to PUBLIC by default on new functions, which would put this in
-- reach of the anon and authenticated roles the browser holds. Verified on the
-- branch: anon false, authenticated false, service_role true.
revoke execute on function public.gift_card_debit(text, numeric, jsonb) from public;
revoke execute on function public.gift_card_debit(text, numeric, jsonb) from anon;
revoke execute on function public.gift_card_debit(text, numeric, jsonb) from authenticated;
grant execute on function public.gift_card_debit(text, numeric, jsonb) to service_role;
