/**
 * NH Landlord Operations Manual — `eb-landlord-ops`, $29.
 *
 * THE FLAGSHIP, AND THE MOST LEGALLY LOADED
 *
 * The listing promises an "RSA 540 and RSA 540-A compliance guide" and
 * "sample lease clauses". Both are delivered in substance and neither is
 * delivered as statutory citation or as ready-to-sign drafting, for two
 * reasons that are worth stating plainly.
 *
 * FIRST: THE NUMBERS MOVE AND THE PROCESS DOES NOT.
 *
 * Notice periods, deposit deadlines and filing requirements are amended, and a
 * deadline printed in a book somebody bought becomes a date they diary and
 * rely on. What is reliably true — and what landlords actually get wrong — is
 * the PROCESS: serving properly, documenting contemporaneously, not accepting
 * partial rent without a written agreement, never using self-help. So every
 * chapter teaches the sequence and marks the figures as things to confirm,
 * which is both honest and the part that prevents the expensive mistakes.
 *
 * SECOND: ERIC PARKED THE LEASE PACK.
 *
 * "Leave the lease pack for now" (2026-10-03). The lease chapter here is
 * therefore about what each clause must ACHIEVE rather than giving clause
 * language to sign — which keeps this out of the product he parked while still
 * delivering the listed feature in substance. Both departures are reported by
 * `selfCheck` on every run so the listing bullets get reworded rather than
 * quietly left wrong.
 */
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';

export const meta = {
  id: 'eb-landlord-ops',
  title: 'NH Landlord Operations Manual',
  subtitle: 'The complete legal and operational guide for NH landlords',
  price: 2900,
  files: ['pdf'],
};

/** Screening criteria that are defensible because they are written down first. */
const SCREENING = [
  ['Income', 'A stated multiple of the rent, verified by two recent pay stubs or an employment letter, or by bank statements for the self-employed.', 'The commonest criterion and the one most often applied inconsistently. Write the multiple down and apply it to everybody.'],
  ['Rental history', 'Two previous landlords contacted, with the questions asked written down and the answers recorded.', 'Ask whether they would rent to them again, and listen to the pause rather than the answer.'],
  ['Credit', 'A report obtained with written consent, read for pattern rather than score.', 'A thin file is not a bad file. Recent rent-related collections matter far more than an old medical debt.'],
  ['Employment', 'Verified independently of the applicant — call the employer, do not accept a number on the form.', 'Takes four minutes and is the check most often skipped.'],
  ['Identity', 'Photographic identification matched to the application.', 'Also the point at which most fabricated applications stop.'],
  ['Criminal history', 'Only if you apply it consistently and only where it is relevant to tenancy, considering how long ago and what it was.', 'A blanket exclusion is the most dangerous line a small landlord can draw — it has been treated as discriminatory in effect. Take advice before adopting one at all.'],
];

/** What each lease clause has to achieve. Not drafting — the job it does. */
const CLAUSE_JOBS = [
  ['Parties and premises', 'Names every adult occupant and identifies the unit precisely.', 'An occupant not named on the lease is somebody you have no agreement with and may not be able to hold to anything.'],
  ['Term', 'Start, end, and what happens at the end — holds over month to month, or terminates.', 'A lease silent on what follows the end date is the commonest source of an accidental tenancy on worse terms than you intended.'],
  ['Rent', 'Amount, when due, how paid, and where.', 'Specify the method. A landlord who has accepted cash for a year has no record of the one month that is disputed.'],
  ['Late charges', 'When a payment is late and what is charged, within whatever the law allows.', 'Confirm what is permitted before setting it. An unenforceable charge undermines the whole notice that relies on it.'],
  ['Deposit', 'Amount, what it may be applied to, and the return process.', 'Mirror the statutory requirements rather than inventing your own terms, because the statute governs regardless of what the lease says.'],
  ['Utilities', 'Which party pays which service, and who holds each account.', 'Heat is the one that matters most in New Hampshire. Ambiguity here produces a winter dispute with a habitability edge to it.'],
  ['Maintenance and repair', 'What the tenant must do, what they must report, and how to report it.', 'Create a channel and require its use. "I told you in the car park" is the beginning of most repair disputes.'],
  ['Alterations', 'What needs permission, and that the unit is restored.', 'Painting and mounting televisions are the two that recur.'],
  ['Entry', 'Notice and the reasons for entry, consistent with the law.', 'The clause that most often gets a landlord into trouble, because entering without notice feels harmless and is not.'],
  ['Occupancy and guests', 'Who may live there and for how long a guest may stay.', 'Without it, an additional long-term occupant is a fact you cannot address.'],
  ['Pets', 'Permitted or not, and on what terms.', 'Keep it separate from assistance animals, which are not pets and are governed by different law entirely.'],
  ['Smoking', 'Permitted or not, including on balconies and in common areas.', 'Far easier to enforce when written than when assumed.'],
  ['Subletting and assignment', 'Permitted only with written consent, if at all.', 'This is the clause that addresses short-term letting, and a lease written before that existed usually does not.'],
  ['Default and remedies', 'What constitutes a breach and what follows.', 'Keep it consistent with the statutory process, which it cannot override.'],
  ['Notices', 'How formal notice is given and to what address.', 'Dull, and decisive the one time it matters.'],
];

/** The eviction process, taught as a sequence with the figures to confirm. */
const EVICTION = [
  ['1', 'Be certain of the ground', 'Non-payment, breach of the lease, or another ground the statute recognises. Write down what happened and when. A case brought on a vague ground fails on the paperwork rather than the merits.'],
  ['2', 'Serve the correct notice, correctly', 'The form, the content and the method all matter, and the notice period depends on the ground — CONFIRM THE CURRENT PERIOD before you rely on it. Keep proof of service. A defective notice restarts the whole process, and that is the single commonest reason a landlord loses months.'],
  ['3', 'Let the notice period run without undermining it', 'Do not accept rent during it unless you intend to reinstate the tenancy, and if you do accept anything, agree in writing what it is for and that it does not waive the notice. Accepting rent silently is how a valid case evaporates.'],
  ['4', 'File with the court', 'The landlord-tenant action. Bring the lease, the ledger, the notice, proof of service and the correspondence — organised, dated, and in sequence.'],
  ['5', 'The hearing', 'Short, and decided on documents. The party with the organised file usually prevails. Bring two copies of everything.'],
  ['6', 'The writ, and the officer', 'If the court orders possession, enforcement is carried out by an official. NOT by you, not by a locksmith you hired, and not by removing their belongings.'],
  ['7', 'Afterwards', 'Deal with the deposit and any belongings left behind by the required process, and keep the records. This is where a won case can still produce a claim against you.'],
];

/** The self-help acts that turn a landlord's good case into their problem. */
const NEVER = [
  'Change the locks, or remove a door or window.',
  'Shut off heat, water or electricity, or allow an account to lapse to force somebody out.',
  'Remove the tenant\'s belongings, or put them outside.',
  'Enter without the notice the lease and the law require, outside a genuine emergency.',
  'Threaten any of the above, in writing or otherwise. A text message saying it will be read out in court.',
  'Refuse to make a repair because rent is owed. The two obligations are separate and trading one against the other forfeits the stronger position.',
];

/** Habitability: what a rental has to provide. */
const HABITABILITY = [
  ['Heat', 'A working heating system capable of keeping the unit at a reasonable temperature through a New Hampshire winter.', 'The most consequential item on the list. A no-heat complaint in January is an emergency, not a work order, and should be treated as one whatever the state of the rent account.'],
  ['Water', 'Running hot and cold water, and working drainage.', 'Includes hot water at a usable temperature, not merely the presence of a tank.'],
  ['Weathertight structure', 'Roof, walls, windows and doors that keep water and weather out.', 'Chronic damp is a habitability issue as well as a building one.'],
  ['Working plumbing and electrical', 'Fixtures that function, and wiring that is safe.', 'Amateur electrical work found in a rental is both a hazard and an insurance problem.'],
  ['Safe egress and stairs', 'A way out, lit, with sound treads and rails.', 'Check every rail by pushing it. This is the item most often found deficient after somebody falls.'],
  ['Smoke and carbon monoxide alarms', 'Present, working, and in the locations required.', 'Test at every turnover, record the date, and have the tenant acknowledge in writing that they were working. Removing or disabling one is the violation worth photographing every time.'],
  ['Freedom from infestation', 'Dealt with promptly, and the cause addressed rather than only the symptom.', 'In a multi-unit building, treating one unit is rarely the answer.'],
  ['Working locks', 'On every exterior door, re-keyed between tenancies.', 'Re-keying at turnover is cheap and is the kind of omission that becomes serious after an incident.'],
];

function chapters() {
  return [
    {
      title: 'The five things that decide whether this works',
      blocks: [
        { t: 'p', text: 'Most of what goes wrong for a small landlord is not bad luck and it is not a bad tenant. It is one of five things, and all five are within the landlord\'s control.' },
        { t: 'numbers', items: [
          'Screening, applied consistently from written criteria. The single highest-return activity available, and the one most often done on instinct.',
          'Documentation created at the time rather than reconstructed afterwards. Dated photographs, a written condition record, a repair log, a rent ledger.',
          'Process, followed exactly. Notices served properly, deposits handled on the statutory timetable, entry with notice. Landlords lose on procedure far more often than on substance.',
          'Habitability, treated as non-negotiable and separate from the rent account. Trading a repair against arrears forfeits the stronger position and can create a defence where none existed.',
          'Money modelled honestly, including vacancy, turnover and capital. A rental that works only at 100% occupancy with no repairs does not work.',
        ] },
        { t: 'callout', heading: 'The sentence this manual exists to prevent', body: '"I know I was right, but the judge threw it out." That is a procedural failure — a defective notice, rent accepted during the notice period, a deposit returned three days late, an entry without notice. Being right about the underlying facts is necessary and it is not sufficient, and the paperwork is the cheap half.' },
        { t: 'h2', text: 'How to use this manual' },
        { t: 'p', text: 'Read chapters two to four before letting a unit, chapter five before you need it, and chapter eight before you are angry. The checklists are meant to be worked through once and then kept — most of the value is in having decided your policy in advance rather than in the middle of a situation.' },
        { t: 'h2', text: 'About the law in this book' },
        { t: 'p', text: 'New Hampshire has statutes governing residential tenancies and security deposits, and they are the framework everything here sits inside. This manual teaches the PROCESS those statutes require and marks every figure — notice periods, deposit deadlines, limits — as something to confirm against the current law rather than printing a number.' },
        { t: 'p', text: 'That is deliberate, and it is not evasion. The figures are amended, and a date printed in a book becomes a date somebody diaries and relies on. The process does not change, and the process is what landlords actually get wrong. Where a specific figure matters to a decision you are about to take, confirm it — the state\'s own published materials, the court\'s self-help resources, or an hour with a New Hampshire attorney who does landlord-tenant work.' },
      ],
    },
    {
      title: 'Screening, fairly and defensibly',
      blocks: [
        { t: 'p', text: 'The best protection against almost every problem in this manual is the tenant you chose. The second best is being able to show that you chose them by a standard you applied to everybody.' },
        { t: 'h2', text: 'Write the criteria down before you advertise' },
        { t: 'p', text: 'Not after an application arrives. Criteria written in advance and applied uniformly are both fairer and far easier to defend; criteria applied from instinct, case by case, are how a landlord ends up explaining why two similar applicants were treated differently.' },
        { t: 'table', head: ['Criterion', 'What to require', 'What people get wrong'], rows: SCREENING, widths: [0.16, 0.42, 0.42] },
        { t: 'h2', text: 'Fair housing, stated simply' },
        { t: 'p', text: 'You may not select tenants on the basis of protected characteristics. That much is widely known. What catches small landlords is the less obvious version:' },
        { t: 'bullets', items: [
          'Advertising wording. "Ideal for a young professional" and "perfect for a single person" both describe who you want rather than what the unit is.',
          'Different questions to different applicants, or a different level of verification. The process has to be the same.',
          'A policy that is neutral on its face but excludes a protected group in effect — a blanket criminal-history bar is the usual example, and a minimum income multiple set unusually high can be another.',
          'Assistance animals, which are not pets. A no-pets policy does not apply to them and refusing one as though it did is among the most expensive errors available.',
          'Steering: suggesting one unit or building over another based on who somebody appears to be, however well meant.',
        ] },
        { t: 'callout', heading: 'The habit that protects you', body: 'Keep every application, the criteria you applied, and one line on the outcome, for everybody — including the ones you declined. A landlord who can produce a consistent record for eight applicants is in an entirely different position from one who remembers that they chose the best candidate. Keep them for a sensible period and apply the same retention to all.' },
        { t: 'h2', text: 'The conversation that tells you most' },
        { t: 'p', text: 'Ask the previous landlord: would you rent to them again? Then stop talking. The pause before the answer carries more information than the answer, and a landlord who hesitates and then says "yes, I suppose so" has told you something they will not put in writing.' },
      ],
    },
    {
      title: 'Letting the unit',
      blocks: [
        { t: 'p', text: 'A vacant month costs more than almost any decision in this manual, and most vacancies are longer than they need to be for three avoidable reasons: the rent was set by hope, the photographs were poor, and the landlord was slow to respond.' },
        { t: 'h2', text: 'Setting the rent' },
        { t: 'p', text: 'Not what you need it to be, and not what the last tenant paid. What comparable units actually rented for in the last six months — rented, not asked. Asking rents are what other landlords hope for, and a unit sitting empty at an asking rent is evidence against it rather than for it.' },
        { t: 'p', text: 'The arithmetic that settles most pricing arguments: a unit at $1,650 that sits empty one extra month to get $1,700 loses $1,650 to gain $600 over the following year. Twelve months at the lower figure beats eleven at the higher one, and it beats it by a wide margin — which is the whole case for pricing to let quickly.' },
        { t: 'bullets', items: [
          'Price to let within two or three weeks in a normal market.',
          'Adjust fast if there is no interest in the first week. Ten enquiries and no viewings is a photograph problem; ten viewings and no applications is a price or condition problem. The pattern tells you which.',
          'Avoid an end date in December or January. A unit coming empty in a New Hampshire winter re-lets slowly and at a discount, which is worth more than most increases.',
        ] },
        { t: 'h2', text: 'The listing itself' },
        { t: 'numbers', items: [
          'Photograph it empty, clean, in daylight, with the lights on. Eight to twelve pictures: every room, the kitchen properly, the bathroom, the exterior, the parking.',
          'Lead with the photograph of the best room, not the front door.',
          'State the facts people filter on: rent, bedrooms, bathrooms, whether heat is included, parking, pets, laundry, and the available date. A listing missing any of these generates enquiries that are all the same question.',
          'Describe the unit, never the tenant you want. "Ideal for a young professional" is a fair-housing problem and it is also a weaker advertisement than a description of the kitchen.',
          'Say what the heating system is and who pays for it. In New Hampshire this is the second thing a serious applicant asks.',
        ] },
        { t: 'h2', text: 'Showings and the application' },
        { t: 'bullets', items: [
          'Reply within a few hours. The best applicants are looking at several units and they take the one that answered.',
          'Group showings save hours and create useful urgency, as long as everyone gets the same information.',
          'Hand everybody the written criteria and the application at the viewing. It filters out the unsuitable before you spend time on them, and it starts the consistency record.',
          'Take a holding deposit only on terms you have written down — what it is for, and what happens to it if they withdraw or are declined.',
          'Decline in writing, briefly and without explanation beyond the criteria. A long explanation invites an argument about the criteria.',
        ] },
        { t: 'callout', heading: 'The turnover is the real cost', body: 'Cleaning, paint, repairs, re-keying, advertising, your time showing it, and the empty weeks — $800 to $2,000 plus the lost rent, every time. Which is why keeping a decent tenant at a slightly below-market rent is frequently the better financial decision, and why the renewal conversation deserves more attention than the letting one.' },
      ],
    },
    {
      title: 'The lease: what each clause has to achieve',
      blocks: [
        { t: 'p', text: 'This chapter is about the JOB each clause does, not language to sign. A lease is the document every later dispute is read against, and the useful skill is knowing what each clause has to accomplish — because then you can read the lease you already have and find the gap.' },
        { t: 'table', head: ['Clause', 'What it must achieve', 'Why it matters'], rows: CLAUSE_JOBS, widths: [0.18, 0.37, 0.45] },
        { t: 'h2', text: 'What a lease cannot do' },
        { t: 'p', text: 'A lease cannot waive a protection the statute gives a tenant, cannot shorten a statutory notice period, cannot permit self-help eviction, and cannot disclaim the obligation to provide a habitable dwelling. Clauses attempting these appear in old leases and in templates bought from other states, and they are unenforceable — worse, a lease visibly stuffed with unenforceable terms damages the landlord\'s credibility on the clauses that do hold.' },
        { t: 'h2', text: 'Before you sign it' },
        { t: 'numbers', items: [
          'Read it aloud with the tenant, or at least walk the key terms. Rent, due date, late charge, utilities, repairs channel, entry, pets, smoking, end of term. Twenty minutes, and it prevents most of the first year\'s friction.',
          'Complete the condition record at the same sitting, with the tenant present, and both sign it.',
          'Hand over the deposit receipt and whatever written statements are required, and record that you did.',
          'Give them a copy. A tenant without a copy of their own lease will dispute its terms, reasonably.',
          'Diary the end date, the renewal decision point and any notice deadline, the day you sign.',
        ] },
        { t: 'callout', heading: 'On lease templates', body: 'A template from another state is worse than no template, because it looks authoritative and contains the wrong law. If you use one, have a New Hampshire attorney read it once — that single hour covers every tenancy you ever grant on it, which makes it the cheapest legal work a landlord will ever buy.' },
      ],
    },
    {
      title: 'Security deposits',
      blocks: [
        { t: 'p', text: 'New Hampshire regulates deposits specifically, and the rules are procedural: what you may hold, where it is held, what you must give the tenant, and what has to happen within a set time at the end. Landlords lose deposit disputes almost entirely on procedure, having been substantively right about the damage.' },
        { t: 'h2', text: 'The sequence' },
        { t: 'numbers', items: [
          'Take no more than the permitted maximum. Confirm the current limit, and remember that a "pet deposit" or "cleaning deposit" is usually part of the same total rather than additional to it.',
          'Give the receipt and any written statement the law requires, at the time, and keep a copy signed by the tenant.',
          'Hold the money as required — and know whether you are obliged to hold it separately and to account for interest. Both depend on circumstances it is worth confirming for your situation.',
          'Record the condition at move-in, with the tenant, with dated photographs. This is the document the whole dispute turns on.',
          'At the end: inspect, ideally with the tenant, and record the condition on the same form.',
          'Within the required period, return the balance WITH an itemised statement of anything withheld, and keep proof of when and how you sent it.',
        ] },
        { t: 'callout', heading: 'The deadline is the thing', body: 'Deposit rules carry a time limit for returning the money and itemising deductions, and missing it can cost a landlord the right to withhold anything at all — regardless of how real the damage was. Confirm the current period, diary it the day the tenancy ends, and treat it as the hardest deadline in this manual. An extra day is not a small lapse here.' },
        { t: 'h2', text: 'What may be deducted' },
        { t: 'p', text: 'Damage beyond ordinary wear and tear, cleaning beyond ordinary, and unpaid rent and charges the lease permits. Everything contentious sits in the word "ordinary", and three tests settle most of it:' },
        { t: 'numbers', items: [
          'Was the condition recorded as better at move-in? If your record does not say so, the deduction is a claim rather than a comparison — and this is the test most deductions fail.',
          'Is the item still inside its useful life? A carpet rated for ten years and replaced at year eleven is a landlord cost whatever state it is in. Prorate a part-worn item: a $1,000 floor six years into a ten-year life supports at most the four years remaining.',
          'Is the cost evidenced? An invoice or a written quote. An estimated figure is the easiest thing in the file to challenge.',
        ] },
        { t: 'h2', text: 'Ordinarily not chargeable, and ordinarily chargeable' },
        { t: 'table', head: ['Usually not', 'Usually yes'], rows: [
          ['Faded paint and nail holes from hanging pictures', 'Holes needing patching rather than filling'],
          ['Carpet worn along the traffic path', 'Carpet burned, torn or stained beyond cleaning'],
          ['Grout and silicone discolouring in a shower', 'Pet damage of any kind, including odour treatment'],
          ['Appliances that failed by age', 'Missing items — keys, blinds, shelves, alarm covers'],
          ['Loose hinges and tired weatherstripping', 'Cleaning beyond ordinary, and rubbish left behind'],
          ['Anything already recorded as worn at move-in', 'A removed or disabled smoke or CO alarm'],
        ], widths: [0.5, 0.5] },
        { t: 'p', text: 'Itemise, attach the invoices, and show any proration. An itemised sheet with evidence settles in one exchange; a single figure labelled "damages" invites a demand for detail, and the detail then looks assembled after the fact.' },
      ],
    },
    {
      title: 'Habitability, and the repair process',
      blocks: [
        { t: 'p', text: 'A landlord must provide a dwelling fit to live in, and the obligation does not pause because rent is owed. Treating those as linked is the single most damaging mistake in this manual, because it converts a straightforward arrears case into a dispute where the tenant has a defence.' },
        { t: 'table', head: ['What must be provided', 'What that means', 'The practical point'], rows: HABITABILITY, widths: [0.2, 0.36, 0.44] },
        { t: 'h2', text: 'A repair process that protects both sides' },
        { t: 'numbers', items: [
          'One channel for reports, named in the lease — a phone number, an email, a form. Require its use and respond through it, so there is a record.',
          'Acknowledge every report the same day, even if the fix takes longer. Most escalation is caused by silence rather than by delay.',
          'Triage honestly: emergency (no heat, no water, anything unsafe, anything actively causing damage) same day; urgent within a couple of days; routine within a stated period.',
          'Give notice before entering, even when the tenant asked for the repair. The request is not blanket consent for any time.',
          'Log it: reported when, by whom, what was done, by whom, and when it was closed. A maintenance log is the evidence that the obligation was met, and it takes one line.',
          'Follow up afterwards and record the answer. "Is it working properly now?" closes the item and prevents the same complaint reappearing as a long-standing one.',
        ] },
        { t: 'callout', heading: 'The no-heat call', body: 'In New Hampshire, a loss of heat in winter is an emergency without qualification. Respond the same day, arrange temporary heat if a repair cannot be completed, document everything, and do it regardless of the rent account. A landlord who delayed a heating repair over arrears has created a far larger problem than the arrears — and it is the kind of fact that decides a case before the ledger is even opened.' },
        { t: 'h2', text: 'If a tenant withholds rent over a repair' },
        { t: 'bullets', items: [
          'Do not treat it as a simple non-payment. A withholding tied to a genuine habitability failure is a different situation and may be a defence.',
          'Fix the thing. Then deal with the rent.',
          'Document the repair, the dates and the communications. If the complaint was not genuine, that record is what demonstrates it.',
          'Take advice before serving notice in this situation specifically. It is the scenario where a procedurally sound landlord most often turns out not to be.',
        ] },
      ],
    },
    {
      title: 'Rent, late charges and the partial payment trap',
      blocks: [
        { t: 'p', text: 'Most arrears are a hard month rather than a bad tenant, and most are recoverable if the landlord responds early, consistently and in writing. The way they become unrecoverable is through inconsistency.' },
        { t: 'h2', text: 'A collection policy, written once' },
        { t: 'numbers', items: [
          'Day the rent is due, and the day a payment becomes late. One date, stated in the lease.',
          'A reminder the day after. Neutral, written, no threat — most arrears end here.',
          'A formal letter at a stated point, with the amount, the charge if any, and what happens next.',
          'A conversation offering a written payment plan, with dates and amounts, signed. A plan in an email thread is not a plan.',
          'A statutory notice only when the policy says so, served properly.',
          'The same timetable for everybody, every time.',
        ] },
        { t: 'h2', text: 'The partial payment trap' },
        { t: 'p', text: 'A tenant owes two months and offers one. Accepting it feels obviously sensible and can undermine a notice already served, because accepting rent may be read as reinstating the tenancy you were ending.' },
        { t: 'p', text: 'So: if you accept anything after serving notice, agree in writing first, before taking the money, that it is accepted on account of the arrears, that it does not waive the notice, and that the proceedings continue. A short signed note or even an email exchange that the tenant replies to. Accepting money silently is how a valid case quietly evaporates — and the landlord usually does not find out until the hearing.' },
        { t: 'callout', heading: 'Keep a ledger, not a memory', body: 'Date, amount, method, what it was applied to, and the running balance. Every payment, including cash and part payments. The ledger is the document a court reads, and a landlord who arrives with a tidy ledger and dated notices is in a different position from one who arrives with a recollection and a phone full of messages.' },
        { t: 'h2', text: 'Late charges' },
        { t: 'p', text: 'Confirm what is permitted before setting one, state it in the lease, and apply it the same way every month or not at all. A charge applied selectively is both unfair and hard to rely on, and an unenforceable charge contaminates the notice that depends on it.' },
      ],
    },
    {
      title: 'Entry, privacy and the things never to do',
      blocks: [
        { t: 'p', text: 'A tenant has the right to quiet enjoyment of the property they are paying for, and the landlord\'s right of entry is limited and conditional. This is the chapter where otherwise careful landlords create serious problems out of what felt like nothing.' },
        { t: 'h2', text: 'Entry' },
        { t: 'bullets', items: [
          'Give notice, in the form and period your lease and the law require, every time.',
          'Enter for a legitimate purpose — repair, inspection, showing, emergency — at a reasonable hour.',
          'A genuine emergency is the exception: a burst pipe, a fire alarm, a smell of gas. Not a suspicion, not a convenience, and not "I was passing".',
          'Record every entry: date, time, reason, who attended. One line, and it answers the accusation that cannot otherwise be answered.',
          'Never enter to check up on somebody. If you have grounds to believe the lease is being breached, address it as a breach with notice — do not go looking.',
        ] },
        { t: 'h2', text: 'The six things never to do' },
        { t: 'p', text: 'Each of these is self-help, each is unlawful, and each converts a landlord with a good case into a landlord facing a claim. They are listed plainly because they are usually done in frustration rather than in bad faith.' },
        { t: 'bullets', items: NEVER },
        { t: 'callout', heading: 'Why the threat counts too', body: 'A text message saying "if the rent is not paid by Friday I am changing the locks" will be read out, and it will be the most memorable document in the case. Frustration is understandable and writing it down is not. If you would not want it read aloud, do not send it — and if you already have, tell your attorney before they find it.' },
        { t: 'h2', text: 'Retaliation' },
        { t: 'p', text: 'Acting against a tenant because they complained — to you, to a code officer, to anybody — is a separate problem from whatever the underlying dispute is, and the timing is what creates the inference. A rent increase or a notice that follows a complaint by a fortnight will be looked at in that light whatever the real reason. Where there is a genuine unrelated reason, document it contemporaneously, which is the only thing that helps.' },
      ],
    },
    {
      title: 'When it goes wrong: the eviction process',
      blocks: [
        { t: 'p', text: 'Read this before you need it, and before you are angry. Eviction in New Hampshire is a court process with a defined sequence, and the sequence is where cases are won and lost — not on whether the landlord was right.' },
        { t: 'table', head: ['Step', 'What happens', 'Where it goes wrong'], rows: EVICTION, widths: [0.07, 0.2, 0.73] },
        { t: 'h2', text: 'Figures to confirm before you act' },
        { t: 'p', text: 'This manual deliberately does not print them, because they are amended and a date you diary from a book is a date you may rely on wrongly. Confirm, for your specific ground:' },
        { t: 'bullets', items: [
          'The notice period that applies, which differs by ground — non-payment is typically shorter than other causes.',
          'The required form and content of the notice, which is prescribed and is not a letter you compose.',
          'The permitted methods of service, and what proof you must keep.',
          'Where the action is filed, the fee, and what must be attached.',
          'Any additional requirement that applies to your situation — subsidised tenancies, manufactured housing and some other circumstances have their own rules.',
        ] },
        { t: 'p', text: 'The state\'s published guidance and the court\'s own self-help materials cover these and are kept current. For anything contested, an hour with a New Hampshire landlord-tenant attorney before serving is cheaper than a defective notice, which costs a month at minimum.' },
        { t: 'h2', text: 'What to bring to the hearing' },
        { t: 'numbers', items: [
          'The lease, signed.',
          'The rent ledger, complete, with every payment and the running balance.',
          'The notice, and proof of how and when it was served.',
          'All correspondence, in date order, including the messages that do you no favours — your attorney needs to know about those before the other side produces them.',
          'The maintenance log, if any repair issue has been raised.',
          'Dated photographs where condition is relevant.',
          'Two copies of everything.',
        ] },
        { t: 'callout', heading: 'The organised file', body: 'These hearings are short and decided on documents. The party who arrives with a dated, ordered, complete file usually prevails, and that is frequently the only difference between the two sides. The file is assembled a line at a time over a tenancy, not in the week before the hearing — which is the real reason every chapter here asks you to write things down as they happen.' },
        { t: 'h2', text: 'Belongings left behind' },
        { t: 'p', text: 'There is a required process for property a tenant leaves, and disposing of it on your own judgement is how a landlord who won possession acquires a new claim against them. Confirm what applies, store what must be stored, give what notice is required, and document the lot.' },
      ],
    },
    {
      title: 'Ending a tenancy well',
      blocks: [
        { t: 'p', text: 'Most tenancies end uneventfully, and the uneventful ending still has a process — which is worth following, because this is where the deposit dispute either happens or does not.' },
        { t: 'h2', text: 'The renewal decision' },
        { t: 'bullets', items: [
          'Diary it well before any notice deadline. A decision taken late becomes a hold-over on terms you did not choose.',
          'Decide on the record: payment history, condition, how they communicate. Not on whether you like them.',
          'If you are raising the rent, give as much notice as you can beyond the minimum. A tenant with time to absorb an increase renews; one who is surprised looks elsewhere, and a turnover costs more than the increase.',
          'Consider a fourteen-month renewal to move the end date out of the winter. A unit coming empty in January re-lets slowly and at a discount — in New Hampshire that is worth more than most increases.',
        ] },
        { t: 'h2', text: 'The move-out' },
        { t: 'numbers', items: [
          'Written confirmation of the end date, and what is expected — cleaning standard, keys, forwarding address, meter readings.',
          'Offer a pre-move-out walk a fortnight early. The single best way to avoid a deposit dispute: the tenant hears what will be charged while they still have time to fix it, and most do.',
          'Inspect with the tenant on the same condition form used at move-in, and have both sign.',
          'Collect every key and re-key the locks.',
          'Final meter readings and account transfers.',
          'Deposit returned with an itemised statement inside the required period. Diary that date the day they leave.',
        ] },
        { t: 'callout', heading: 'The pre-move-out walk', body: 'Fifteen minutes, two weeks early, with the form in your hand. Say what will be charged and why. Tenants overwhelmingly prefer to clean the oven than lose $80, and a deduction they were warned about is almost never disputed. This is the cheapest goodwill available in the whole relationship and it costs you nothing but the visit.' },
      ],
    },
    {
      title: 'Living with the tenancy',
      blocks: [
        { t: 'p', text: 'Most of being a landlord is neither legal nor financial. It is a working relationship with somebody living in your asset, and the quality of it determines how many of the earlier chapters you ever need.' },
        { t: 'h2', text: 'The first month sets the next two years' },
        { t: 'numbers', items: [
          'Walk the unit with them at handover and show them things: the shutoff, the panel, the thermostat, the filter, where the rubbish goes, how to report a repair.',
          'Fix the first small thing they report, fast, even if it is trivial. It is the cheapest signal available that reports get answered, and it buys you a tenant who tells you about a leak early rather than after the ceiling.',
          'Be reachable through the channel in the lease and not reachable outside it. A landlord who answers texts at eleven at night has set a standard they will later resent.',
          'Say what you will and will not do. Clarity early prevents the slow accumulation of assumed obligations.',
        ] },
        { t: 'h2', text: 'The rules of correspondence' },
        { t: 'bullets', items: [
          'Everything consequential in writing, even after a phone call. "To confirm what we agreed" is the most useful sentence a landlord has.',
          'Never write anything you would not want read aloud. Frustration is understandable; a record of it is a liability.',
          'Answer complaints once, factually, and say what happens next.',
          'Do not discuss one tenant with another. In a small building this is both a trust failure and a disclosure problem.',
          'Keep it. A thread of dated, calm messages is worth more than any single document when something is contested.',
        ] },
        { t: 'h2', text: 'Four situations and what to do' },
        { t: 'table', head: ['Situation', 'What to do', 'What not to do'], rows: [
          ['Rent is late for the first time', 'A neutral written reminder the day after. Most arrears end here, and it costs nothing.', 'Nothing for three weeks, and then a notice. The silence reads as tolerance and makes the notice look arbitrary.'],
          ['An unauthorised occupant has moved in', 'Address it as a lease matter in writing: who, since when, and what the lease requires. Offer the proper route — adding them, with screening.', 'Go round and confront them, or enter to check. Both convert a straightforward breach into your problem.'],
          ['Neighbours in a two-family are at war', 'Deal with what breaches the lease and say plainly that you will not arbitrate the rest. Document every complaint from both.', 'Take a side, or relay one tenant\'s words to the other. A landlord who arbitrates becomes the defendant in both directions.'],
          ['A tenant asks to end the lease early', 'Negotiate it in writing. A unit you can re-let in spring with notice is often worth more than holding somebody to three unhappy months.', 'Refuse flatly and leave it there. A tenant who is leaving anyway leaves a unit in worse condition than one you parted with properly.'],
        ], widths: [0.22, 0.4, 0.38] },
        { t: 'h2', text: 'The tenant in genuine difficulty' },
        { t: 'p', text: 'Illness, a lost job, a separation. This is a judgement rather than a procedure, and two things are true at once: you are not a charity, and a written payment plan with a tenant who has always paid is almost always a better outcome than a vacancy plus a turnover plus an unrecoverable debt.' },
        { t: 'p', text: 'If you do agree something, agree it in writing with dates and amounts, record that it is a one-off variation rather than a change to the lease, and apply the same willingness to the next tenant in the same position — because inconsistency here is how a kindness becomes evidence of favouritism.' },
        { t: 'callout', heading: 'The one that is not a judgement call', body: 'A repair is never leverage. If a tenant in arrears reports no heat, the heat gets fixed today and the arrears are dealt with separately. The obligations are independent, and a landlord who links them hands the tenant a defence and loses a case they would otherwise have won comfortably.' },
      ],
    },
    {
      title: 'Multi-unit buildings',
      blocks: [
        { t: 'p', text: 'A two- or three-family is the common New Hampshire rental, and it brings problems a single-family let does not — mostly about things that are shared and were never written down.' },
        { t: 'h2', text: 'Utilities, which cause most of it' },
        { t: 'bullets', items: [
          'Find out what is actually separately metered before you let anything. Plenty of older conversions have one water service, one boiler, or a hallway light on a tenant\'s meter.',
          'Say in every lease exactly which services that tenant pays and which you pay. Ambiguity about heat becomes a winter dispute with a habitability edge.',
          'If heating is central and you pay it, price the rent accordingly and expect windows open in January. If you intend to control it, say so in the lease and keep it at a temperature that is defensible.',
          'A common-area service on a tenant\'s meter is a problem to fix rather than to manage. It is unfair, it is hard to defend, and it is cheap to correct relative to the argument.',
        ] },
        { t: 'h2', text: 'The shared things' },
        { t: 'table', head: ['What', 'Decide in advance', 'Why'], rows: [
          ['Parking', 'Assign spaces in the lease, by number, including guest arrangements.', 'Unassigned parking in a three-family produces more complaints than every other issue combined, and winter makes it worse.'],
          ['Laundry', 'Who may use it, when, and who pays for repairs.', 'A shared machine with no rules breaks and nobody reports it.'],
          ['Rubbish and recycling', 'Where, whose bins, who moves them for collection.', 'The commonest cause of neighbour friction and of a town citation.'],
          ['Snow clearing', 'Who clears what, by when. Walks and steps specifically.', 'Steps are where people fall. Leaving this unstated leaves the liability with you anyway, without the clearing being done.'],
          ['Basement and storage', 'Allocated, or off limits. In writing.', 'Unallocated basements fill up and nobody can prove whose things they are at move-out.'],
          ['Noise and hours', 'A stated quiet period in every lease.', 'Gives you something to enforce other than your own judgement of reasonableness.'],
        ], widths: [0.18, 0.4, 0.42] },
        { t: 'h2', text: 'Staggering the leases' },
        { t: 'p', text: 'Two tenancies ending in the same month means two turnovers at once and two empty units in the same market. Stagger them deliberately — a fourteen- or ten-month renewal once is enough to separate them permanently, and it also moves one of them out of the winter.' },
        { t: 'h2', text: 'If you live in the building' },
        { t: 'bullets', items: [
          'Keep the roles separate, out loud. You are a neighbour socially and a landlord in writing, and mixing them is how expectations drift.',
          'Still give notice before entering. Living upstairs is not consent.',
          'Still use the written repair channel, even for something mentioned on the stairs. "You told me in the hallway" is the beginning of most disputes about what was reported and when.',
          'Expect to be asked for more, and decide your answers in advance rather than in the moment.',
        ] },
      ],
    },
    {
      title: 'Taking over a tenanted property',
      blocks: [
        { t: 'p', text: 'Buying a property with tenants in it, or inheriting one, is how a great many New Hampshire landlords start — and it is routinely handled badly, because the new owner inherits obligations they have never seen written down.' },
        { t: 'h2', text: 'What you are actually buying' },
        { t: 'p', text: 'The tenancies come with the building. You take them on their existing terms, you cannot improve those terms by becoming the owner, and you inherit the deposits whether or not the money was handed over. That last point is the one that catches people: if the seller kept the deposits, the tenants are still entitled to them, and the tenant will be looking at you.' },
        { t: 'h2', text: 'What to demand before closing' },
        { t: 'numbers', items: [
          'Every signed lease and amendment. Not summaries — the documents. A tenancy with no written lease is a month-to-month arrangement on terms nobody can prove, which is worth knowing before rather than after.',
          'An estoppel certificate from each tenant: what they pay, what deposit they gave, when the term ends, what the landlord has promised, and whether anything is outstanding. This is signed by the TENANT, which is what makes it useful — it is their account rather than the seller\'s.',
          'The deposit ledger, and the actual transfer of the money at closing, itemised per tenant. Get it in the settlement statement.',
          'The rent ledger for at least twelve months, so you can see who actually pays and when, rather than what the rent roll claims.',
          'Any outstanding repair requests, in writing. An unaddressed habitability complaint becomes yours on the day you complete.',
          'Any notice already served, any dispute, any pending court action.',
          'Service contracts, utility accounts, and which services are on which meter.',
        ] },
        { t: 'callout', heading: 'The estoppel certificate is the whole protection', body: 'It is the one document where the tenant states their own understanding of the tenancy, and it is therefore the one thing that stops a surprise two months after closing — a side agreement about parking, a promised appliance, a deposit larger than the ledger shows, a rent concession nobody mentioned. Ask for one from every tenant and read the differences against the seller\'s rent roll. The differences are the information.' },
        { t: 'h2', text: 'The first thirty days as the new owner' },
        { t: 'numbers', items: [
          'Write to every tenant: who you are, where rent goes from now on, how to report a repair, and that their lease terms are unchanged. Calm, short, and it prevents a month of uncertainty and late payments.',
          'Confirm in that letter what deposit you now hold for them. This is the single most reassuring sentence you can send, and it also surfaces any discrepancy immediately rather than at move-out.',
          'Walk every unit, with notice, and complete a condition record. You have no move-in record for these tenancies, and without a baseline you will never be able to charge for anything.',
          'Test every smoke and carbon monoxide alarm, record the date, and get the tenant\'s written acknowledgement.',
          'Fix the first thing each tenant reports, promptly. You are establishing whether the new landlord answers, and that reputation sets the next two years.',
          'Review each lease against this manual and note the gaps. You cannot change them mid-term, but you will know what to put right at renewal.',
        ] },
        { t: 'h2', text: 'The renewal is where you fix the inherited lease' },
        { t: 'p', text: 'An inherited lease is frequently old, from another state\'s template, or missing the clauses that matter — the repair channel, entry, occupancy, the end-of-term provision. You cannot rewrite it during the term, so plan the renewal properly: give good notice, present it as a tidy-up rather than a crackdown, and expect to explain each change.' },
        { t: 'p', text: 'Do not try to fix everything and raise the rent in the same conversation. One of the two will fail, and it is usually both.' },
        { t: 'h2', text: 'An inherited tenant who is already a problem' },
        { t: 'bullets', items: [
          'Start the record from day one. You have none of the history, so your file begins now and needs to be immaculate.',
          'Do not act on the seller\'s account of them. It is secondhand, often self-serving, and useless as evidence.',
          'Follow the process from the beginning regardless of what the previous owner did or did not do. A notice that relies on a predecessor\'s undocumented warnings is a defective notice.',
          'If there is an existing court action, speak to an attorney before doing anything at all — including accepting rent.',
        ] },
      ],
    },
    {
      title: 'Records and bookkeeping',
      blocks: [
        { t: 'p', text: 'The discipline is simple and the benefit is disproportionate: a landlord with organised records wins disputes, files an easy return, and knows whether the property actually makes money. One without them is guessing about all three.' },
        { t: 'h2', text: 'What to keep, per unit' },
        { t: 'bullets', items: [
          'The signed lease and every amendment.',
          'The application, the criteria applied, and the screening results.',
          'The condition record at move-in and at move-out, with dated photographs.',
          'The rent ledger — every payment, date, method, what it was applied to, running balance.',
          'The deposit: receipt, where it is held, and the final itemised statement with proof of posting.',
          'The maintenance log, with every report and what was done.',
          'All correspondence, in date order.',
          'Insurance certificates from every vendor who worked there.',
          'Alarm test dates, and the tenant\'s written acknowledgement at each turnover.',
        ] },
        { t: 'h2', text: 'What to keep, per property' },
        { t: 'bullets', items: [
          'Purchase documents, the closing statement and the title policy.',
          'Every invoice, separated between repairs and improvements. This distinction matters at tax time and nobody can reconstruct it later from a bank statement.',
          'Permits, plans and warranties for capital work.',
          'Mortgage statements, tax bills and insurance policies.',
          'Mileage, if you drive to the property.',
        ] },
        { t: 'callout', heading: 'The distinction worth getting right as you go', body: 'A repair keeps the property in working order; an improvement adds value or materially extends life. They are treated differently for tax, and the difference is impossible to reconstruct from a bank statement two years later. Write it on the invoice when it arrives — one word — and the return becomes straightforward. This is bookkeeping discipline rather than tax advice: for how it applies to your situation, an accountant who does rental property is worth an hour.' },
        { t: 'h2', text: 'The monthly habit' },
        { t: 'p', text: 'Fifteen minutes. Post the rent, chase anything outstanding on the policy timetable, file the month\'s invoices, and write one line on anything that happened. Done monthly it is trivial; done annually it is a weekend and the detail is already lost.' },
      ],
    },
    {
      title: 'What a rental actually costs',
      blocks: [
        { t: 'p', text: 'A rental that works only at full occupancy with no repairs does not work. The arithmetic below is the honest version, and it is the reason some properties that look profitable are not.' },
        { t: 'h2', text: 'The costs people leave out' },
        { t: 'table', head: ['Cost', 'Typical allowance', 'Why it gets missed'], rows: [
          ['Vacancy', '5 to 8% of gross rent', 'Nobody budgets for an empty month, and then one arrives.'],
          ['Turnover', '$800 to $2,000 per turn', 'Cleaning, paint, repairs, re-keying, advertising, and your own time showing it.'],
          ['Repairs and maintenance', '5 to 10% of gross rent', 'Averages out across years, which is why a quiet year feels like profit and is not.'],
          ['Capital reserve', '$300 to $500 per unit per year', 'Roof, boiler, paving, windows. Leaving this out is how a cap rate gets flattered.'],
          ['Management', '8 to 10% of collected rent', 'Put it in even if you self-manage — your time is a cost, and the next buyer will have to pay it.'],
          ['Legal and accounting', '$400 to $900 a year', 'One lease review and one tax return.'],
          ['Snow and landscaping', '$1,500 to $3,500 a year', 'In New Hampshire this is not optional and not small.'],
        ], widths: [0.22, 0.22, 0.56] },
        { t: 'p', text: 'Put properly, operating costs on a small New Hampshire multifamily usually land between 35% and 50% of effective income once reserves and management are included. A pro forma showing 25% has left something out, and it is usually reserves.' },
        { t: 'h2', text: 'Two numbers worth knowing for your own property' },
        { t: 'bullets', items: [
          'Break-even occupancy: operating costs plus debt service, divided by gross potential rent. The share of the rent roll that can be empty before you are losing money. Most landlords have never calculated it.',
          'Debt service coverage: net operating income divided by annual debt service. Under 1.20 and a lender would decline it; under 1.00 and the building cannot pay its own mortgage.',
        ] },
        { t: 'p', text: 'Both are in the Property ROI Calculator, along with the itemised expense schedule this chapter is drawn from.' },
      ],
    },
    {
      title: 'Vendors, insurance and the landlord year',
      blocks: [
        { t: 'h2', text: 'Vendors' },
        { t: 'p', text: 'New Hampshire does not license general contractors, so the usual "are they licensed" check does not exist here. Electricians, plumbers and gas fitters are licensed and the number can be verified; for everything else the protection is different:' },
        { t: 'bullets', items: [
          'A certificate of insurance, read properly — in force, general liability with a real limit, workers\' compensation, and you named as an ADDITIONAL INSURED rather than merely the certificate holder.',
          'The business name on the contract matching the name on the insurance.',
          'Scope in writing, with exclusions, and an authorisation limit above which written approval is required.',
          'Permits: ask who is pulling them and confirm with the town that they were.',
          'Never the cheapest bid without reading what it excluded.',
        ] },
        { t: 'p', text: 'The Vendor Contract Template Pack covers this in full, with the eight-point certificate checklist and five editable agreements.' },
        { t: 'h2', text: 'Insurance' },
        { t: 'bullets', items: [
          'A landlord or dwelling policy, not a homeowner policy. A homeowner policy on a rented property can be declined at claim.',
          'Liability at a limit that would cover one serious injury.',
          'Loss of rents cover, which pays while a unit is uninhabitable after a covered loss.',
          'Require tenant\'s insurance in the lease, and ask for evidence. It covers their contents, which yours does not, and it removes the commonest post-loss argument.',
          'Read the declarations page once a year, not the certificate. Most landlords learn their policy terms during a claim, which is the one moment nothing can be changed.',
        ] },
        { t: 'h2', text: 'The landlord year' },
        { t: 'table', head: ['When', 'What'], rows: [
          ['Monthly', 'Rent posted to the ledger, arrears chased on the policy timetable.'],
          ['Quarterly', 'Walk the exterior. Ten minutes, and it finds what no report contains.'],
          ['August to September', 'Book the heating service and the chimney sweep. By November a technician is triaging no-heat calls.'],
          ['September', 'Sign the snow contract. The good contractors are full by early November.'],
          ['October', 'Full winter preparation — hose bibs, gutters, alarms tested and recorded.'],
          ['Before each renewal', 'The renewal decision, with enough notice, and consider moving the end date out of winter.'],
          ['Annually', 'Insurance declarations page, lease review, and the rent against the market.'],
          ['Every turnover', 'Condition record, re-key, alarms tested and acknowledged in writing.'],
        ], widths: [0.24, 0.76] },
        { t: 'callout', heading: 'If you take four things from this manual', body: 'Screen from written criteria and keep the records. Document condition at move-in and move-out on the same form, with photographs. Follow the process exactly, especially on notices and deposit deadlines. And never trade a repair against the rent — the obligations are separate, and linking them turns your strong case into their defence.' },
      ],
    },
  ];
}

export async function build() {
  const book = renderBook({
    title: 'NH Landlord Operations Manual',
    subtitle: 'The complete legal and operational guide for NH landlords',
    blurb: 'Most of what goes wrong for a small landlord is not bad luck and not a bad tenant — it is one of five things, and all five are controllable. Screening from written criteria, documentation created at the time, process followed exactly, habitability treated as non-negotiable, and money modelled honestly. Written to prevent the sentence this manual exists for: "I know I was right, but the judge threw it out."',
    audience: ['Landlords', 'Property Managers'],
    edition: '2026 edition',
    keywords: 'landlord, New Hampshire, security deposit, eviction, habitability, screening',
    chapters: chapters(),
  });

  return [
    { name: 'NH Landlord Operations Manual.pdf', mime: PDF_MIME, buffer: book.buffer, pages: book.pages },
  ];
}

export async function selfCheck() {
  const files = await build();
  const pdf = files[0];
  const concerns = [];

  if (pdf.buffer.subarray(0, 4).toString() !== '%PDF') concerns.push('the PDF does not start with %PDF');
  if (pdf.pages < 30) concerns.push(`only ${pdf.pages} pages for the catalogue's flagship`);

  // The whole premise is that process failures, not substance, lose cases. So
  // every eviction step must say where it goes wrong.
  const thinEviction = EVICTION.filter(([, , wrong]) => !wrong || wrong.length < 60);
  if (thinEviction.length) concerns.push(`${thinEviction.length} eviction step(s) do not say where it goes wrong`);

  // Screening is the highest-return chapter; a criterion with no "what people
  // get wrong" is just a list.
  const thinScreening = SCREENING.filter(([, , wrong]) => !wrong || wrong.length < 40);
  if (thinScreening.length) concerns.push(`${thinScreening.length} screening criterion(s) have no practical note`);

  const thinClauses = CLAUSE_JOBS.filter(([, job, why]) => !job || !why || why.length < 40);
  if (thinClauses.length) concerns.push(`${thinClauses.length} lease clause(s) do not say why they matter`);

  if (NEVER.length < 5) concerns.push(`only ${NEVER.length} self-help prohibitions listed`);
  if (HABITABILITY.length < 7) concerns.push(`only ${HABITABILITY.length} habitability items`);

  return {
    figures: [
      ['chapters', String(chapters().length)],
      ['manual', `${pdf.pages} pages, ${Math.round(pdf.buffer.length / 1024)} KB`],
      ['frameworks', `${SCREENING.length} screening criteria, ${CLAUSE_JOBS.length} lease clauses, ${EVICTION.length} eviction steps, ${HABITABILITY.length} habitability items`],
      ['listing', 'corrected to 30 pages on 2026-10-04 — it said 85'],
      ['RSA 540', 'bullet reworded on 2026-10-04 to "what RSA 540 and RSA 540-A require of you, step by step". The manual sets out the process, with every figure marked as one to confirm, and prints no section numbers or deadlines.'],
      ['listing also claims', 'the bullet was reworded on 2026-10-04 to "what every NH lease clause has to achieve, clause by clause". It is not language to sign — the lease pack that would be is parked — and a buyer expecting signable clauses would be buying the wrong product.'],
      ['EPUB', 'claim removed from the listing on 2026-10-04 — none is produced'],
    ],
    concerns,
  };
}
