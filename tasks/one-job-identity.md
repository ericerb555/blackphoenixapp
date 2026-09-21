# One job, whatever door the work came in through

Eric: *"lets make sure we can keep all the work requests/quote and invoices link
to one job no matter what point we enter in the job."*

Written before building. Eric has settled the question that was blocking it: a document never matches
an existing job by looking similar to it. Same address, same customer, still a
separate job number. J1 and J2 are being built to that.

---

## 1. What is there now

Linking is **pairwise, optional and caller-supplied**. A record points at
whatever created it:

| Field | Uses in `index.tsx` | How it is set |
|---|---|---|
| `invoiceId` | 46 | by whichever flow raised the invoice |
| `workRequestId` | 34 | commonly `body.workRequestId \|\| null` |
| `quoteId` | 34 | passed by the caller |
| `projectId` | 2 | design projects |
| `jobId` | 6 | **a false friend — see below** |

`jobId` is not a job. It belongs to the subcontractor bid flow and names a
bid-room posting (`subcontractor_bid_job:{userId}:{jobId}`). Nothing in the
quote or invoice chain uses it.

### Why that fails the requirement

It works in the one direction you came in through and nowhere else.

- **Enter at a quote** with no work request and there is nothing upstream to
  attach to.
- **Enter at an invoice** and it may link to something else entirely. The plan
  proposal flow writes an invoice carrying `planProposalId` and `applicationId`
  and no quote or work request at all.
- **Enter at a purchase order** and the fields exist — `from-materials` accepts
  `quoteId`, `projectName`, `siteAddress` — but Materials Center never sends
  them, so every PO raised today is orphaned.
- **Ask "show me everything for the Sutton job"** and there is no question to
  ask, because no record names a job.

The nullable default is the part that guarantees the gap rather than merely
allowing it: `body.workRequestId || null` means a caller who forgets produces a
record that is silently unattached, and nothing ever reports it.

---

## 2. The shape

A **job** is a record of its own with a stable id, and every document carries
that id in addition to the pairwise links it already has. Nothing existing is
removed — `quoteId` on an invoice is still useful — the job id is added
alongside so there is one question that always has an answer.

    job:{id}
      ├─ work requests   (0..n — a job can gain a second request later)
      ├─ quotes          (0..n — revisions, change orders)
      ├─ invoices        (0..n — deposit, progress, final)
      ├─ purchase orders (0..n — grouped by vendor, raised when we choose)
      └─ design projects (0..n)

Each of those records gains `jobId`. The job record itself holds only what
identifies the job — customer, site address, what the work is, stage, and when
it opened. Totals stay on the documents and are read from them, never copied
onto the job, or the job becomes another island of numbers that disagree.

**Every door opens the same job.** Whichever record is created first opens a
job; every later one either resolves to that job or opens its own. That is a
single helper both sides call, not a rule each route implements for itself —
the current state is exactly what happens when each route decides for itself.

---

## 3. Order of work

- [x] **J1. The job record and the resolver.** `job:{id}`, plus one
      `resolveJob()` that every creation path calls: given a customer, a site
      and whatever ids the caller has, return the existing job or open one.
      Pure matching logic split out so it can be unit-tested, because this is
      the piece that decides whether two documents are the same job.
- [x] **J2. Stamp new records.** Work requests, quotes, invoices, POs and design
      projects call the resolver on creation and store `jobId`. Additive: no
      existing field changes meaning, so nothing that reads today breaks.
- [x] **J3. Read by job.** `GET /jobs/:id` returning the job with its documents,
      and `GET /jobs` for the list. This is the question that cannot be asked
      today.
- [x] **J4. Back-fill what exists.** A dry-run-first pass that walks existing
      records, follows the pairwise links it can, and proposes groupings —
      reporting what it cannot resolve rather than guessing. Same discipline as
      the catalogue importer: nothing overwritten, nothing invented.
- [x] **J5. The job view.** One screen showing a job with its requests, quotes,
      invoices and POs, and their stages. This is also where "raise the POs for
      this job" belongs — see `tasks/todo.md` for the purchase-order thread.
- [ ] **J6. Close the nullable default.** Once the resolver exists, a creation
      path that produces an unattached record should say so rather than write a
      silent orphan.

J1 and J2 are worth doing before anything else, because every day without them
adds more records that J4 has to guess about.

---

## 4. What needs deciding first

**a) ~~How is a document matched to an existing job?~~ ANSWERED — it is not.**

Eric: *"even if we have the same addresses and service address the documents
will create a separate job number per job or work request."*

So the address is **not a matching key**, and neither is the customer. A new
work request is a new job with its own job number, at the same address as ten
others if that is how the work came in. Nothing is ever merged by looking at
two records and judging them similar.

This removes the hardest part of the design and the only part that could have
done damage. There is no fuzzy matching to tune, no suggest-and-confirm step,
and — most importantly — no way for two genuinely separate jobs at one address
to be silently collapsed into one. A landlord with recurring work at the same
building gets a clean job per instruction, which is what the business actually
needs.

The resolver therefore has exactly two moves, and both are explicit:

1. The caller names a job, or names a parent document that already has one —
   follow it. This is how a quote raised from a work request, and an invoice
   raised from that quote, all land on the same job.
2. Otherwise open a new job. A document created cold starts its own.

Nothing is inferred from customer, address, service type or timing, in either
direction.

**b) What happens to records already written?**

Unchanged as a question, but much easier to answer now. The back-fill can
follow the pairwise links that exist — an invoice naming a quote, a quote
naming a work request — and group each chain under one job. Anything with no
link is its own job, which is the same rule applied to history and needs no
judgement about whether two old records "look like" the same work.

**c) ~~Is a job ever closed?~~ NO LONGER BLOCKING.**

It only mattered for bounding an address match, and there is no address match.
A closed stage may still be worth having for reporting; it is not needed for
any of the work below.

## 5. What this does NOT do

- It does not remove the existing links. `workRequestId` and `quoteId` keep
  working exactly as they do.
- It does not move totals onto the job. Documents own their numbers; the job
  reads them.
- It does not change any portal's look, and it is not a pipeline rewrite — the
  pipeline stays the spine, and this is what its records hang from.
- It does not touch the bid-room `jobId`, which is a different thing that
  happens to share a word.
