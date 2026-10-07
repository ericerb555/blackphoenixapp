# Sending an unpriced quote is a decision, not an accident

## What Eric asked for

> "i want the option to send or not to"

So: not a block. A quote that was never priced against his catalogue or rates
can still go to a customer — he decides, at the moment of sending, with the
reason in front of him.

The previous change made the quote *say* what priced it. This makes the send
ask.

## Why the server is involved and not only the dialog

A confirmation dialog is a prompt, not an enforcement — anything that can call
the route can skip it. So the route refuses an unpriced send that does not
carry an explicit acknowledgement, and records the acknowledgement when it is
given. The dialog is how Eric gives it. That keeps the choice entirely his
while making "sent demo figures by accident" impossible and "sent them
deliberately" auditable.

This is the same reasoning as everywhere else in this codebase: the button is
not the check.

## What counts as unpriced

Only what is positively known to be unpriced:

    offline-demo       the local demo generator ran; demo figures
    server-heuristic   the server's deterministic fallback; never repriced

An `estimator` quote is not gated. It has been through `repriceEstimate`, and
its banner already states what proportion is real — gating it too would put a
confirmation in front of every send, which trains the click-through that makes
the whole mechanism worthless.

**A quote with no recorded basis is not gated either.** Every quote saved
before the field existed has none, and treating absence as "unpriced" would
make existing quotes unsendable without warning. Absence means unknown, and
unknown behaves exactly as it did before — the same choice the banner makes
when it stays silent on a legacy quote.

## Plan

- [x] 1. `normalizeDoc` in `quotes.tsx`: keep `pricingBasis` and
      `priceSummary`. This function rebuilds the record field by field, and
      the file already documents three fields silently lost this way — a basis
      that survives creation and vanishes on first edit would be worse than
      none, because the gate would quietly stop applying.
- [x] 2. `StartQuoteModal`: send both fields when it saves the quote.
- [x] 3. `POST /quotes/:id/send-to-customer`: refuse an unpriced send without
      `acknowledgedUnpriced`, with a distinct code the UI can act on; record
      who acknowledged and when on the sent quote.
- [x] 4. `QuoteToContractEditor`: on that refusal, show what is wrong and offer
      **Send anyway** or **Cancel**. Send anyway retries with the
      acknowledgement.
- [x] 5. Typecheck both halves, smoke, commit, push, deploy the function.

## Scope

One server route, one server normaliser, two frontend components. No pricing
figure changes. No schema change — the quote record is a KV document.

## Review

Five files. The quote is still sendable; it just cannot go out unnoticed.

**`quotes.tsx`.** `normalizeDoc` now keeps `pricingBasis` and `priceSummary`,
because the send gate reads the basis off the stored quote and this function
drops anything it does not name — the file already documents three fields lost
exactly that way. A basis that survived creation and vanished on the first edit
would have switched the gate off silently, and the quote most likely to be
edited before sending is the one somebody is tidying up.

`unpricedSendAcknowledged` is deliberately **not** readable from the
normaliser's argument. `normalizeDoc` is handed `{...existing, ...input}`, so a
value taken from there could have come from the request body — and this field
records a decision an administrator made. It is forced to null there and
restored from the stored record by the handler, so only
`send-to-customer` can ever write it.

**`index.tsx`.** `POST /quotes/:id/send-to-customer` — previously a single
dense line — refuses an unpriced send without `acknowledgedUnpriced` and
answers 409 `UNPRICED_QUOTE_NEEDS_ACKNOWLEDGEMENT` with the reason. With the
acknowledgement it sends and records who did it, when, and which basis it was.
Gated bases are `offline-demo` and `server-heuristic`; `estimator` is not gated
and neither is an absent basis, so no existing quote became unsendable.

**`QuoteToContractEditor.tsx`.** Turns that 409 into a question instead of an
error toast, and retries with the acknowledgement on **Send anyway**.

One bug caught while writing it, worth recording because it would have made the
whole feature inert: the button was `onClick={handleSendToCustomer}`, passing
the click event as the first argument. With the handler now taking
`acknowledgedUnpriced` as its first parameter, a MouseEvent is truthy — every
send would have arrived pre-acknowledged and the gate would never have fired
once. It is wrapped, with a comment saying why.

**`UnpricedSendDialog.tsx` (new).** In its own component rather than inlined,
specifically so it can be mounted by the harness: a dialog that appears only on
a 409 from a staff-authenticated route is otherwise unreachable by any check,
which is how an unrenderable dialog reaches production looking fine. It shows
the server's reason rather than composing its own.

### Verified by rendering it

Two fixtures, driven in a real browser. The first deliberately carries no
customer, because an unassigned quote has none and the sentence about who it
goes to has to survive that:

    modal:unpriced-send
      "Send this without real prices?"
      "…built by the demo generator, so none of its prices are real."
      "It will go to the customer as a quote they can approve…"
      buttons: Don't send — let me price it | Send anyway

    modal:unpriced-send-sending
      "It will go to Dana Whitfield at dana@example.com…"
      buttons: Don't send — let me price it | Sending… (disabled)

Typecheck app 316 / server 87, unchanged. Smoke 359 rendered (357 before, plus
the two fixtures), 0 threw.

## Not done

The gate fires on the basis recorded at creation. A quote whose prices were
edited by hand afterwards still carries whatever basis it was created with —
hand-correcting every line of a demo quote does not clear the flag, so it will
still ask. Asking once too often is the right way round for this, but if it
becomes annoying the fix is to clear the basis when a line's price is edited.
