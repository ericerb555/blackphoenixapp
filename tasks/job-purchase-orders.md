# Sending a job's purchase orders

## The complaint

"I am hoping we can send a PO list for each job as we want to." Purchase orders
raised from a job's materials list sit as drafts and nothing sends them.

## What is actually wrong — it is not a missing button

The button exists. `PurchaseOrders.tsx` calls `POST /purchase-orders/:id/send`,
and that route is complete: it posts to the vendor's order API if they
registered one, emails them otherwise, refuses a second send unless a resend is
asked for explicitly, and notifies them in their portal.

The orders raised from a job never reach it, for three separate reasons.

**1. The page hides them.** `fetchOrders` keeps only orders where
`Array.isArray(o.items)`. `POST /purchase-orders/from-materials` writes `items`
as a *count* — a number — and puts the lines in `lineItems`. So every purchase
order raised from a job's materials list is filtered out of the one screen that
can send it. They are not stuck as drafts; they are invisible.

**2. The field names differ.** from-materials writes `supplier`, `orderDate`
and `expectedDate`; the page reads `vendor`, `date` and `dueDate`. Made visible
without translating, the rows would show a blank supplier and blank dates.

**3. Send only appears on an approved order.** from-materials creates drafts, so
the path is Submit → Approve → Send.

And separately: the Jobs screen lists a job's purchase orders and its "Open"
link goes to the bare purchase-orders page, so you arrive at every order in the
company with no idea which three belonged to the job you were looking at.

## The work

- [x] **A. Read both shapes.** One `normalizeOrder` in `PurchaseOrders.tsx`
      that maps `lineItems` → `items`, `supplier` → `vendor`, `orderDate` →
      `date`, `expectedDate` → `dueDate`. The filter that excluded
      summary-only records from the supplier hub is kept in intent — an order
      still has to have lines to appear — but it now recognises lines in
      either place.
- [x] **B. Arrive on the job.** The Jobs screen's purchase-order "Open" passes
      `?job=<id>`; the purchase-orders page reads it, filters to that job, and
      says so with a way back to all orders.
- [ ] **C. Your decision: does a job's draft get a direct Send?** Today it is
      Submit → Approve → Send, three presses per vendor per job. Approving a
      spend is a real control and I have not removed it. If you want one press
      on a draft, say so and it is a small change — the server already requires
      administrator access to send, so the control would move from two clicks
      to who you are.

## Deliberately not built

A "send every order on this job" button. Sending twice is not a duplicate
message, it is potentially a second lorry of materials to a site, and a bulk
control over that is the kind of button you have told me not to put in the
interface. Filtering to the job puts them in one short list and each one is one
press.

## Review

A. and B. are done. The visibility bug is the one that mattered: it meant the
purchase orders a job produced could not be seen, sent, approved or deleted
from the purchase-orders screen at all — only from the Materials Center that
created them.
