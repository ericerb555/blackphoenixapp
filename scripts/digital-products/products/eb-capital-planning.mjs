/**
 * Capital Planning for Property Managers — `eb-capital-planning`, $34.
 *
 * WHAT A BUYER IS PAYING FOR
 *
 * How to get a large piece of work paid for and done without a crisis. The
 * arithmetic of reserves is covered by the Reserve Fund Adequacy Calculator;
 * this is the decision layer above it — reading a reserve study properly,
 * choosing between reserves, a loan and a special assessment, scoping and
 * bidding the work, and telling the owners in a way that does not lose the
 * vote.
 *
 * WHY THE FUNDING CHAPTER IS THE CENTRE OF IT
 *
 * Because the question is almost never "does the roof need replacing". It is
 * "who pays, when, and how much at once", and that decision is usually taken
 * on instinct by people who have never been shown the three options side by
 * side with their real costs. A special assessment feels honest and is
 * frequently the most expensive and most divisive of the three. A loan feels
 * like failure and is often the fairest. Nobody tells boards this.
 *
 * WHAT IT WILL NOT DO
 *
 * Name a financing programme and its terms. State and federal community
 * development financing exists and some of it reaches housing, but eligibility
 * is narrow, the terms change, and a programme named in a book somebody bought
 * becomes a promise nobody here made. The chapter says what KIND of money to
 * look for and who to ask, which stays true.
 */
import ExcelJS from 'exceljs';
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';
import {
  INK, INK_SOFT, AMBER_PALE, GOOD, WARN, BAD,
  MONEY, PERCENT, NUMBER, YEAR as YEAR_FMT,
  applyWorkbookMeta, newWorkbook, sheetHeader, sectionTitle, tableHead,
  inputCell, calcCell, labelCell, noteCell, bigNumber, zebra, printSetup,
  guideSheet, field,
} from '../lib/workbook.mjs';

export const meta = {
  id: 'eb-capital-planning',
  title: 'Capital Planning for Property Managers',
  subtitle: 'Forecast, fund, and execute large capital projects',
  price: 3400,
  files: ['pdf', 'xlsx'],
};

/** The three ways to pay, compared on what actually differs. */
const FUNDING = [
  ['Reserves', 'Money already collected, month by month, from the owners who were there', 'No interest. No vote. No disruption. The fairest across time, because each owner paid for the share of life they used.', 'Only works if the money is there. Spending reserves to zero leaves nothing for the next failure, which is how an association ends up assessing anyway, eighteen months later.'],
  ['Bank loan', 'The association borrows and repays from dues over years', 'Spreads the cost over the people who will use the asset. No owner has to find a large sum at once. Work happens now, at today\'s prices.', 'Interest, arrangement costs, and a lender who will want to see the reserve study, the budget and the delinquency rate. Dues go up and stay up for the term.'],
  ['Special assessment', 'Each owner pays their share, now or in instalments', 'Fast, no interest, no lender. Simple to explain in one sentence.', 'Lands hardest on the owners least able to pay, and on anybody about to sell. Needs a vote in most associations, which can fail. Creates more ill-will than the other two combined, and is the route most likely to end in a delinquency problem of its own.'],
];

/** What a reserve study does and does not tell you. */
const STUDY_READING = [
  ['Percent funded', 'The reserve balance against what should have accrued by now. Under 30% weak, 30-70% fair, over 70% strong.', 'It is a measure of the PAST — how well funded you have been — not a prediction. A fully funded association with a roof due next year still has a cash flow problem.'],
  ['Fully funded balance', 'What should be in the account today, given every component\'s age.', 'It is not a target to reach. Nobody needs 100%; what is needed is enough, in the years it is wanted.'],
  ['The component list', 'Every item the association must replace, with cost and remaining life.', 'This is the part to challenge. Check the unit costs against a real quote, the remaining lives against your own records, and whether anything on it is actually the unit owners\' responsibility.'],
  ['The funding plan', 'Recommended annual contribution, usually with an escalator.', 'Two different studies will recommend different numbers for the same building, because the method and the assumptions differ. Ask which method was used and what inflation rate was assumed.'],
  ['The cash flow table', 'Year by year: contributions, interest, spending, balance.', 'The most useful page and the one nobody reads. Find the lowest point. That is the year the association is in trouble, and it is usually not the year of the biggest project.'],
  ['The site inspection notes', 'What the analyst actually saw.', 'Read these before the numbers. A component recorded in "fair" condition that you know is failing means the whole schedule behind it is wrong.'],
];

/** The components a ten-year plan usually turns on, with NH costs. */
const PLAN_SEED = [
  ['Asphalt shingle roofing — Building A', 2028, 174000, 'Reserves'],
  ['Asphalt pavement overlay', 2029, 211000, 'Reserves'],
  ['Exterior painting and trim repair', 2027, 42000, 'Operating'],
  ['Boiler replacement — two units', 2031, 57000, 'Reserves'],
  ['Elevator modernisation', 2032, 165000, 'Loan'],
  ['Siding replacement — north elevation', 2030, 96000, 'Loan'],
  ['Deck and balcony rebuild', 2033, 182000, 'Assessment'],
  ['Common-area flooring', 2028, 61000, 'Reserves'],
  ['Fire alarm panel and devices', 2034, 74000, 'Reserves'],
  ['Pavement seal coat', 2027, 22000, 'Operating'],
];

const PLAN_YEARS = 10;
const START_YEAR = 2027;

function guideChapters() {
  return [
    {
      title: 'The question is never whether the roof needs replacing',
      blocks: [
        { t: 'p', text: 'It is who pays, when, and how much at once. That decision is usually taken on instinct by people who have never seen the three options side by side with their real costs, and the instinctive answer is frequently the most expensive one available.' },
        { t: 'p', text: 'This book is the decision layer above the arithmetic. If you need the arithmetic — component lives, fully funded balance, the thirty-year projection — the Reserve Fund Adequacy Calculator does that and does it properly. What follows is everything that happens around it.' },
        { t: 'h2', text: 'The sequence that works' },
        { t: 'numbers', items: [
          'Read the reserve study properly, and challenge it. Most of them contain at least one component priced from a national average rather than a New Hampshire quote.',
          'Find the lowest point in the cash flow table. That is the year the association is in trouble, and it is usually not the year of the biggest project.',
          'Decide the funding mix for each project BEFORE scoping it. The answer changes what you can scope — a project funded by loan can be done properly in one phase; one funded by assessment often has to be split, and splitting costs more.',
          'Scope it in writing, then bid it to three vendors on the same scope.',
          'Tell the owners early, with the numbers, before the decision rather than after it.',
          'Run the project with a schedule of values and a retainage, and hold the final payment.',
        ] },
        { t: 'callout', heading: 'The mistake that costs the most', body: 'Deciding the project, then looking for the money. It arrives at the owners as "we need $180,000 by March", which is the version most likely to be voted down — and a failed vote delays the work a year, during which the price rises and the component keeps failing. Funding first, then scope, then bid, then tell.' },
        { t: 'h2', text: 'What a manager is actually for, in this' },
        { t: 'p', text: 'A board of volunteers can read a study and take a vote. What they usually cannot do is hold a project to a scope, know that a change order is unreasonable, and keep the paperwork in an order that survives a dispute three years later. Those are the three places a manager earns the fee, and they are the three places this book is aimed.' },
      ],
    },
    {
      title: 'Reading a reserve study, and challenging it',
      blocks: [
        { t: 'p', text: 'A reserve study is a professional opinion built on assumptions, not a measurement. Treating it as gospel is as expensive as ignoring it, and the parts worth challenging are predictable.' },
        { t: 'table', head: ['What it says', 'What it means', 'What to do with it'], rows: STUDY_READING, widths: [0.18, 0.37, 0.45] },
        { t: 'h2', text: 'The four challenges worth making every time' },
        { t: 'numbers', items: [
          'Unit costs against a real local quote on the two largest components. A roof priced from a national average can be out by a third in either direction in New Hampshire, and the roof is usually the biggest single line.',
          'Remaining lives against your own records. An analyst estimates age from appearance; you may have the invoice. A component five years older or younger than assumed moves the whole plan.',
          'Scope of responsibility. Every association has at least one item on its list that the governing documents actually assign to the unit owners — windows and decks are the usual candidates. Paying for those twice is a common and expensive error.',
          'The inflation assumption. Materials have outrun headline inflation for most of the last decade. A study assuming 2.5% on a thirty-year horizon is understating the future cost substantially, and the understatement compounds.',
        ] },
        { t: 'h2', text: 'Two methods, two different answers' },
        { t: 'h3', text: 'Component, or straight-line' },
        { t: 'p', text: 'Each component accrues separately: its cost divided by its life, every year, as though it had its own savings account. Produces a higher recommended contribution and a larger balance, and it is easier to explain to owners — each one is paying for the share of each roof they used.' },
        { t: 'h3', text: 'Cash flow, or threshold' },
        { t: 'p', text: 'Treats the reserve as one pool and funds it to stay above a chosen minimum. Produces a lower contribution and relies on the timing working out. Entirely legitimate, and more exposed to a component failing early — which is exactly the thing a thirty-year schedule cannot predict.' },
        { t: 'callout', heading: 'Which to use', body: 'Component funding if the association can afford it, because it is both more robust and far easier to defend to owners. Cash flow funding where the component method produces a contribution the membership will simply refuse — a plan that is voted down funds nothing. The honest framing for owners is that the cheaper method carries more risk, not that it is cheaper.' },
        { t: 'h2', text: 'How often, and by whom' },
        { t: 'p', text: 'A full study with a site inspection every three to five years, and an update without inspection in the years between. Ask any analyst which professional credential they hold, how many associations of your size they have done, and whether the site inspection is included — an update priced like a study, without an inspection, is a spreadsheet refresh.' },
      ],
    },
    {
      title: 'Reserves, loan, or assessment',
      blocks: [
        { t: 'p', text: 'The three options, compared on what actually differs between them rather than on how they feel.' },
        { t: 'table', head: ['Option', 'What it is', 'In its favour', 'Against it'], rows: FUNDING, widths: [0.13, 0.22, 0.3, 0.35] },
        { t: 'h2', text: 'The arithmetic nobody shows the owners' },
        { t: 'p', text: 'Take a $180,000 project at a 48-unit association. Each unit\'s share is $3,750.' },
        { t: 'table', head: ['Route', 'What each owner pays', 'Total cost to the association'], rows: [
          ['Reserves, already collected', 'Nothing now', '$180,000'],
          ['Special assessment, in full', '$3,750 at once', '$180,000'],
          ['Special assessment over 12 months', '$313 a month for a year', '$180,000'],
          ['10-year loan at 7%', 'About $44 a month for ten years', 'About $251,000'],
        ], widths: [0.3, 0.3, 0.4] },
        { t: 'p', text: 'The loan costs the association $71,000 more. It is still frequently the right answer, and the reasons are not financial: it does not force an owner on a fixed income to find $3,750 in ninety days, it does not require a vote that might fail, and it spreads the cost across the people who will actually use a roof that lasts twenty-five years. The assessment makes today\'s owners pay for tomorrow\'s owners\' roof.' },
        { t: 'callout', heading: 'The fairness argument, both ways', body: 'An owner who has paid dues for fifteen years and is about to sell has already funded a large share of a roof they will never sit under. An owner who bought last year and faces a $3,750 assessment is being asked to pay for fifteen years of underfunding they had no part in. Both are right, which is why this decision cannot be made on fairness alone — and why the honest answer is usually to fund reserves properly from now on so the question stops arising.' },
        { t: 'h2', text: 'When each one is clearly right' },
        { t: 'bullets', items: [
          'Reserves: the money is there and spending it still leaves a sensible balance against the next thing on the schedule.',
          'Loan: the work cannot wait, the sum is large relative to what owners could find at once, and the asset will last well beyond the loan term.',
          'Assessment: the sum is modest per unit, the membership is able to pay it, and the association would rather not carry debt. Also the right answer for something genuinely one-off that no schedule could have predicted.',
          'A mix: common and sensible. Reserves for what is there, a loan for the balance, and an assessment only for the part owners can comfortably cover.',
        ] },
        { t: 'h2', text: 'What a lender will want' },
        { t: 'bullets', items: [
          'The reserve study, the last two years of financials and the current budget.',
          'The delinquency rate. High arrears is the commonest reason an association is declined.',
          'The percentage of units that are owner-occupied, and whether any single owner holds several.',
          'Evidence that dues can be raised — usually the governing documents, sometimes a vote.',
          'The project scope and bids. A lender will not fund a number somebody estimated.',
        ] },
      ],
    },
    {
      title: 'Paying for it: where the money comes from',
      blocks: [
        { t: 'p', text: 'Beyond the three main routes, there are sources worth knowing about — and one worth being careful about.' },
        { t: 'h2', text: 'Association lending' },
        { t: 'p', text: 'Several banks lend specifically to condominium and homeowner associations, and the product is unlike a mortgage: unsecured or secured on the dues stream rather than on the real estate, with the association as borrower and no individual owner liable. Rates are higher than a mortgage and the process is quicker. A local bank or credit union with an association lending desk is the place to start, and it is worth asking two.' },
        { t: 'h2', text: 'Phasing the work' },
        { t: 'p', text: 'Splitting a project across two or three budget years is sometimes the quiet answer that avoids a loan and an assessment both. It is not free: mobilising twice costs more than mobilising once, and the unfinished half keeps deteriorating. Phasing is sensible where the work genuinely divides — three buildings, or a drive in two halves — and expensive where it does not. A roof split across two years means two tear-offs, two set-ups and a seam.' },
        { t: 'h2', text: 'Efficiency incentives, where the work qualifies' },
        { t: 'p', text: 'Insulation, air sealing, lighting, heating plant and sometimes windows attract utility efficiency incentives, and an association project is often large enough to be worth a conversation with the utility\'s programme before the scope is fixed — occasionally the incentive changes which option is cheapest. Ask early; some programmes require pre-approval and will not pay retrospectively.' },
        { t: 'h2', text: 'Community and state financing' },
        { t: 'p', text: 'There are state and federal programmes that finance housing improvement, and some reach multi-unit property. Eligibility is usually narrow — tied to income levels, affordability commitments or specific kinds of ownership — and terms change. It is worth one phone call to find out whether your association is in scope, and it is not worth building a plan around until somebody has confirmed in writing that it is.' },
        { t: 'callout', heading: 'Why no programme is named here', body: 'Because a programme named in a book becomes a promise. Names change, programmes close, and eligibility narrows without notice. What stays true is what to ask for: association lending from a bank with that desk, utility efficiency incentives through the programme covering your property, and a single enquiry to the state housing and community development authorities about whether anything applies. Those three calls take an afternoon.' },
        { t: 'h2', text: 'The one to be careful about' },
        { t: 'p', text: 'Contractor financing, where the vendor arranges the money. Sometimes a genuine convenience, and sometimes a way for a higher price to be hidden inside a payment that looks small. If it is offered, get the cash price in writing first and compare — and never let the financing decide the vendor.' },
      ],
    },
    {
      title: 'Scoping and bidding the work',
      blocks: [
        { t: 'p', text: 'Most of the money on a capital project is lost before anybody picks up a tool, in the gap between what the board thought it was buying and what the contract actually described.' },
        { t: 'h2', text: 'Write the scope before you talk to anybody' },
        { t: 'p', text: 'On anything substantial, pay somebody to write it: an architect, an engineer, or a specialist consultant. On a $180,000 roof, a $6,000 specification is not an overhead — it is the only thing that makes three bids comparable, and it typically saves several times its cost in change orders that cannot be argued for.' },
        { t: 'p', text: 'A specification should say what is being removed, what is going on, to what standard, how the edges and penetrations are handled, what happens if the deck below is rotten, who protects the landscaping, where the dumpster goes, and what the clean-up standard is. "Replace the roof" is not a scope; it is a hope.' },
        { t: 'h2', text: 'Bid it properly' },
        { t: 'bullets', items: [
          'Three bids on identical scope, in writing, with a closing date.',
          'Labour, materials and equipment broken out. A single number cannot be compared or challenged.',
          'Unit rates for the likely unknowns, agreed in advance — per sheet of sheathing, per foot of trim. This is where change orders are won or lost, and after the contract is signed there is no competition left.',
          'A schedule, with a start date and a duration, and liquidated damages where an overrun genuinely costs the association money.',
          'What is excluded. The exclusions tell you more about a bid than the inclusions do.',
        ] },
        { t: 'h2', text: 'Choosing, and the lowest bid' },
        { t: 'p', text: 'The lowest bid on a capital project is usually lowest for a reason, and the reason is almost always something left out. Compare the exclusions before the prices. Then compare the schedule, the crew (their own or subcontracted), the warranty on labour as distinct from materials, and two references for the same work on a similar building.' },
        { t: 'p', text: 'A board that takes the lowest number without reading the exclusions will pay the difference anyway, later, at a rate nobody competed for.' },
        { t: 'h2', text: 'Running it' },
        { t: 'numbers', items: [
          'A schedule of values: the contract price broken into stages, each payable on completion of that stage. Never a large payment up front on labour.',
          'Retainage — commonly 5 to 10% held until completion. This is the only leverage that exists at the end, which is exactly when it is needed.',
          'A written change order process, with the agreed unit rates, and a rule that no change proceeds without written approval. Verbal approval on site is how a project exceeds its budget by a fifth.',
          'Weekly photographs. Cheap, and decisive in any later argument.',
          'A punch list walk before the final payment, and the final payment only after the list is closed, the site is clean, permits are signed off and the warranty paperwork is in hand.',
          'Lien waivers from the contractor and any subcontractor, with each payment. A subcontractor who was not paid can attach the association\'s property even though the association paid in full.',
        ] },
        { t: 'callout', heading: 'The clause boards forget', body: 'What happens if the work uncovers something worse. On a roof it is rotten sheathing; on siding it is water damage to the framing; on paving it is a failed base. Agree the unit rate for that discovery before signing, and agree who decides how much of it is genuinely necessary. Discovered mid-project with no rate agreed, it is priced by the only bidder still on site.' },
      ],
    },
    {
      title: 'Telling the owners',
      blocks: [
        { t: 'p', text: 'A capital project that is communicated badly gets voted down, and a project voted down is not saved money — it is the same project a year later at a higher price, with a component that has deteriorated further and a board that has lost credibility.' },
        { t: 'h2', text: 'The order that works' },
        { t: 'numbers', items: [
          'Early, before the decision: here is what the study says, here is what it will cost, here are the options. Owners who learn about a project at the same time as they are asked to approve it will assume the board has already decided and is managing them.',
          'With the numbers attached, including the option you are NOT recommending and why. A board that shows its work is trusted; one that presents a single answer is suspected.',
          'In writing, then in a meeting, then in writing again. The written version is what gets forwarded to the owner who did not attend.',
          'With the consequence of doing nothing stated plainly and without drama. Not "catastrophic failure" — "water will reach the top-floor units within about two winters, and the repair then includes interior damage".',
        ] },
        { t: 'h2', text: 'What to put in the first notice' },
        { t: 'bullets', items: [
          'What the component is, its condition, and who says so.',
          'What it costs, and when it has to happen.',
          'The three funding options with the per-unit figure for each, including the monthly figure for the loan. A monthly number is understood; an annual total is argued with.',
          'What the board recommends, and why — in two sentences, not two pages.',
          'What happens if it is deferred, factually.',
          'When the decision will be taken, and how owners can comment before it.',
        ] },
        { t: 'h2', text: 'The questions you will be asked' },
        { t: 'table', head: ['Question', 'The answer worth having ready'], rows: [
          ['Why is there not enough in reserves?', 'Because contributions were set below the accrual rate for years. Say so. Blaming previous boards is both unhelpful and usually unfair — most of them inherited the same shortfall.'],
          ['Why not just do the cheap repair?', 'Give the cost of both and the life of both. A $40,000 repair with an eight-year life against a $180,000 replacement with twenty-five is a real comparison, and sometimes the repair wins.'],
          ['Why three bids and not the cheapest?', 'Name what the cheapest excluded. This is why the exclusions matter more than the prices.'],
          ['I am selling next year — why should I pay?', 'Because a documented capital plan and a completed project help a sale, and a pending assessment with no plan is what buyers\' attorneys ask about and lenders decline over.'],
          ['Can we phase it?', 'Give the real figure for phasing, including the second mobilisation. Sometimes yes, often more expensive than it sounds.'],
        ], widths: [0.3, 0.7] },
        { t: 'callout', heading: 'Never present one option', body: 'A board that brings a single answer to a vote is asking for a yes or a no, and a membership that feels managed will say no. Bringing three options with a recommendation turns the meeting from a referendum on the board into a decision about a building, and the recommendation usually carries.' },
      ],
    },
    {
      title: 'Owner communication: four letters',
      blocks: [
        { t: 'p', text: 'Copy these, change the figures, send them. Each one is written to be read by somebody who is not on the board and does not want to be, which is most owners most of the time.' },
        { t: 'h2', text: '1. The early notice, before any decision' },
        { t: 'p', text: 'Sent as soon as the board knows a project is coming. Its only job is to make sure nobody learns about this at the same moment they are asked to approve it.', opts: { italic: true } },
        { t: 'callout', heading: 'Draft', body: 'Dear owners — The reserve study completed in [month] identifies the [component] as reaching the end of its service life in [year]. The board has begun planning for its replacement and expects the cost to be in the region of [$figure].\n\nNo decision has been taken and none will be taken before the [month] meeting. Between now and then the board will obtain three bids on a written specification and will set out the funding options — reserves, borrowing, or a special assessment — with the per-unit cost of each.\n\nWe are telling you now, before we have an answer, because you should not be hearing about a project of this size for the first time in the same letter that asks you to approve it. Questions are welcome at any point.' },
        { t: 'h2', text: '2. The options letter' },
        { t: 'p', text: 'Sent with the meeting notice. The most important document in the whole process, and the one most boards skip in favour of a recommendation.', opts: { italic: true } },
        { t: 'callout', heading: 'Draft', body: 'Dear owners — The board has three bids for the [component] replacement. The recommended bid is [$figure] from [vendor], which was not the lowest; the lowest excluded [what], which would have been charged separately.\n\nThere are three ways to pay for it, and the board would like your views before deciding.\n\nReserves: the fund holds [$figure]. Using [$figure] of it leaves [$figure], which is below the level we would want against the [next component] due in [year].\n\nBorrowing over [n] years at about [rate]: approximately [$figure] per unit per month, for [n] years. Total interest about [$figure].\n\nSpecial assessment: [$figure] per unit, payable in full or over [n] months at [$figure] a month.\n\nThe board recommends [option] because [one or two sentences, not a page].\n\nIf nothing is done, [factual consequence and timescale]. The decision will be taken at the meeting on [date] and written comments received before [date] will be read into it.' },
        { t: 'h2', text: '3. The decision letter' },
        { t: 'p', text: 'Sent within a week of the vote, to everybody — including the owners who voted against.', opts: { italic: true } },
        { t: 'callout', heading: 'Draft', body: 'Dear owners — At the meeting on [date] the board resolved to proceed with the [component] replacement at a cost of [$figure], funded by [route]. The vote was [for] in favour, [against] against.\n\nWhat this means for you: [the per-unit figure, and the dates]. The first [payment or dues change] takes effect [date].\n\nThe work is scheduled to begin [date] and to take approximately [duration]. Before it starts you will receive a separate letter covering access, parking, noise and anything you need to move.\n\nThe bids, the specification and the board\'s reasoning are available on request. If you voted against this, thank you for saying so — the reserve contribution is being increased at the same time, which is the change that stops this recurring.' },
        { t: 'h2', text: '4. The work-is-starting letter' },
        { t: 'p', text: 'The one that prevents most of the complaints. Sent a fortnight before the first vehicle arrives.', opts: { italic: true } },
        { t: 'callout', heading: 'Draft', body: 'Dear owners — Work on the [component] begins on [date] and is expected to finish by [date].\n\nWhat you need to do: [move vehicles from, clear belongings from, keep windows closed on].\n\nWhat to expect: work between [hours] on [days]. There will be noise and dust. A dumpster will stand at [location] throughout. [Access/parking changes.]\n\nWho to contact: [name] at [number] for anything about the work, and please do not instruct the crew directly — anything asked of them outside the contract becomes a change order the association pays for.\n\nIf something is damaged, tell us the same day with a photograph. The contract requires the vendor to repair what they damage and that is far easier to enforce while they are still on site.' },
        { t: 'callout', heading: 'The line worth keeping in every one', body: '"Please do not instruct the crew directly." Owners asking a roofer to also look at their skylight is how a fixed-price contract becomes a variable one, and it is nearly always innocent. Saying it once, in writing, costs nothing and saves real money.' },
      ],
    },
    {
      title: 'A worked example, start to finish',
      blocks: [
        { t: 'p', text: 'A 48-unit association, reserve balance $685,000, contributing $118,000 a year. The reserve study says the roof on Building A is due in 2028 at $174,000, and the pavement in 2029 at $211,000. Two large projects, one year apart. This is the commonest shape of problem and it is worth walking through.' },
        { t: 'h2', text: 'Step one: challenge the study' },
        { t: 'p', text: 'The roof is priced at $7.25 a square foot over 24,000 square feet. A local roofer quotes $8.10 for the same specification, which makes it $194,400 rather than $174,000 — a $20,000 difference on one line, found by one phone call. The pavement figure survives the check. The board also finds that the study includes the unit entry doors, which the declaration assigns to the owners; removing them takes $69,000 off the fully funded balance and raises the percent funded by four points without anybody doing anything.' },
        { t: 'h2', text: 'Step two: put everything on reserves and look' },
        { t: 'p', text: 'With both projects funded from reserves, the plan dips to about $430,000 after the roof and to roughly $340,000 after the pavement, before recovering. That is above the board\'s $100,000 minimum, so it is fundable — which is a better position than most associations are in, and worth saying out loud.' },
        { t: 'h2', text: 'Step three: ask what else is coming' },
        { t: 'p', text: 'The elevator modernisation is in 2032 at $165,000 and the deck rebuild in 2033 at $182,000. Those two, on reserves, take the fund close to nothing in 2033. So the question is not whether the roof can be funded from reserves; it is whether doing so leaves enough for what follows. It does not.' },
        { t: 'h2', text: 'Step four: choose the mix' },
        { t: 'p', text: 'The board puts the roof and the pavement on reserves — they are affordable and the money was collected for them — and the elevator on a ten-year loan, because it is the longest-lived asset in the plan and the owners who will use it are not all here yet. The deck rebuild goes to a special assessment, because by 2033 the reserve is recovering and a $3,792 per-unit assessment nine years out can be flagged now and planned for by every owner.' },
        { t: 'p', text: 'The loan costs about $1,920 a month across the association from 2032, which is $40 per unit per month. That is the figure that goes in the letter — not $165,000.' },
        { t: 'h2', text: 'Step five: fix the underlying problem' },
        { t: 'p', text: 'The reserve contribution is $118,000 against a straight-line accrual of about $106,000, so the association is funding above accrual and still faces this — because it started late and the fully funded balance is only 47%. Raising the contribution by $26,000 a year, which is about $45 per unit per month, closes the shortfall over twenty years and is the single change that stops this conversation recurring every three years.' },
        { t: 'callout', heading: 'What the board actually tells the owners', body: 'Two numbers, and this is the whole communication: "Dues rise $45 a month to fund the reserve properly. In 2032 a further $40 a month for ten years pays for the elevator. There will be one assessment, of about $3,800, in 2033, and you have nine years of notice." A membership given that will usually accept it. The same information as a $1.1 million capital programme will not survive the first meeting.' },
        { t: 'h2', text: 'What made it work' },
        { t: 'numbers', items: [
          'Challenging the study found $20,000 of understated cost and $69,000 of components that were not the association\'s to replace.',
          'Looking past the first project to the next two is what changed the funding decision. A board that only plans the roof funds it from reserves and then discovers the elevator.',
          'Monthly figures, not totals, in every communication.',
          'The dues increase was presented alongside the projects, not separately. It is the only part of the plan that prevents the next one.',
        ] },
      ],
    },
    {
      title: 'Using the ten-year plan',
      blocks: [
        { t: 'p', text: 'The spreadsheet in this package is a ten-year capital plan: the projects, their years, their costs, and which pot each is funded from — with the cash flow that results and the dues increase it implies.' },
        { t: 'h2', text: 'What it does that a reserve study does not' },
        { t: 'p', text: 'A reserve study models one source of money: reserves. This plan models the mix. Each project is assigned to reserves, a loan, a special assessment or the operating budget, and the sheet then shows the reserve balance, the loan payments and the per-unit assessments year by year. That is the view a board needs to answer "what will this feel like", and it is the view nobody usually has.' },
        { t: 'h2', text: 'How to use it' },
        { t: 'numbers', items: [
          'Put the projects in from the reserve study, with the years and costs you have CHALLENGED rather than the ones you were given.',
          'Assign a funding source to each. Start by putting everything on reserves and look at the lowest balance — that single figure tells you how much of the plan is actually fundable as it stands.',
          'Move the biggest projects to loan or assessment until the reserve balance stays above your minimum in every year.',
          'Read the dues implication. A plan that needs dues to rise 9% a year is not a plan, it is a proposal that will be refused.',
          'Then go back and change the dates. Moving one project a year either way is often the whole difference, and it costs nothing to try.',
        ] },
        { t: 'callout', heading: 'The number to watch', body: 'The lowest reserve balance across the ten years, not the closing balance. A plan that ends healthy and dips to $8,000 in year six has a year six problem, and year six is when an unplanned boiler failure becomes an emergency assessment on top of everything already scheduled.' },
        { t: 'h2', text: 'What to do with it once it is right' },
        { t: 'bullets', items: [
          'Put it in the budget pack every year. A capital plan that lives in a drawer is a document; one that appears annually is a policy.',
          'Show owners the ten-year view, not just this year\'s dues. The dues increase is far easier to accept when the thing it funds is visible.',
          'Update it whenever a bid comes in. A real quote replacing an estimate is the most valuable change you can make to it.',
          'Give it to the reserve analyst at the next study. An analyst who can see what the board actually intends produces a more useful study.',
        ] },
      ],
    },
  ];
}

// ── The ten-year capital plan workbook ──────────────────────────────────────

const FIRST_PROJECT_ROW = 7;
const PROJECT_ROWS = 24;
const LAST_PROJECT_ROW = FIRST_PROJECT_ROW + PROJECT_ROWS - 1;

const S = {
  units: 'B6', studyYear: 'B7', reserveOpening: 'B10', annualContribution: 'B11',
  contributionIncrease: 'B12', interest: 'B13', minimumBalance: 'B14',
  loanRate: 'B17', loanYears: 'B18',
};
const abs = (ref) => ref.replace(/([A-Z]+)(\d+)/, '$$$1$$$2');
const SET = (ref) => `Setup!${abs(ref)}`;

function buildPlan() {
  const wb = new ExcelJS.Workbook();
  applyWorkbookMeta(wb, newWorkbook({
    title: '10-Year Capital Plan',
    subject: 'Capital projects, their funding mix, and the cash flow that results',
    keywords: 'capital plan, reserves, special assessment, association loan',
  }));

  guideSheet(wb, {
    title: '10-Year Capital Plan',
    blurb: 'The projects, the years, and which pot each is funded from — with what that does to the reserve.',
    blocks: [
      ['What this does that a reserve study does not', [
        'A reserve study models one source of money. This models the mix: each project is assigned to reserves, a loan, a special assessment or the operating budget, and the sheet shows what that does year by year.',
        'That is the view a board needs to answer "what will this feel like", and it is the view nobody usually has.',
      ]],
      ['The order to work in', [
        'Put the projects in with the years and costs you have challenged, not the ones the study handed you.',
        'Assign everything to Reserves first, then look at the lowest balance on Cash flow. That single figure says how much of the plan is fundable as it stands.',
        'Move the biggest projects to Loan or Assessment until the reserve stays above your minimum in every year.',
        'Then try moving the dates. One project a year either way is often the whole difference and costs nothing to test.',
      ]],
      ['The number to watch', [
        'The LOWEST reserve balance across the ten years, not the closing balance. A plan that ends healthy and dips to $8,000 in year six has a year six problem.',
        'Year six is when an unplanned boiler failure becomes an emergency assessment on top of everything already scheduled.',
      ]],
      ['The funding sources', [
        'Reserves — paid from the reserve fund in the year of the work.',
        'Loan — borrowed in that year and repaid over the term on Setup, from dues.',
        'Assessment — charged to owners in that year; the per-unit figure appears on Cash flow.',
        'Operating — small enough to absorb in the annual budget rather than the reserve.',
      ]],
    ],
  });

  // ── Setup ─────────────────────────────────────────────────────────────────
  const setup = wb.addWorksheet('Setup', { properties: { tabColor: { argb: INK_SOFT } } });
  [40, 18, 2, 60].forEach((w, i) => { setup.getColumn(i + 1).width = w; });
  sheetHeader(setup, { title: 'Setup', blurb: 'Shaded cells only.', lastColumn: 'D' });

  sectionTitle(setup, 5, 'The association', 'D');
  field(setup, 6, 'Number of units', { value: 48, input: true, numFmt: NUMBER });
  field(setup, 7, 'First year of the plan', { value: START_YEAR, input: true, numFmt: YEAR_FMT });

  sectionTitle(setup, 9, 'The reserve', 'D');
  field(setup, 10, 'Reserve balance at the start', { value: 685000, input: true, numFmt: MONEY });
  field(setup, 11, 'Annual reserve contribution', { value: 118000, input: true, numFmt: MONEY });
  field(setup, 12, 'Annual increase in the contribution', { value: 0.03, input: true, numFmt: PERCENT });
  field(setup, 13, 'Interest earned on reserves', { value: 0.03, input: true, numFmt: PERCENT });
  field(setup, 14, 'Minimum balance you will tolerate', {
    value: 100000, input: true, numFmt: MONEY,
    note: 'Not zero. A reserve at zero means the next unplanned failure is an emergency assessment.',
  });

  sectionTitle(setup, 16, 'If you borrow', 'D');
  field(setup, 17, 'Loan interest rate', { value: 0.07, input: true, numFmt: PERCENT });
  field(setup, 18, 'Loan term, years', { value: 10, input: true, numFmt: NUMBER, note: 'Association lending is usually unsecured or secured on the dues stream, at a higher rate than a mortgage and over a shorter term.' });

  printSetup(setup, { title: '10-Year Capital Plan — Setup' });

  // ── Projects ──────────────────────────────────────────────────────────────
  const proj = wb.addWorksheet('Projects', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(proj, {
    title: 'The projects',
    blurb: 'Assign a funding source to each. Start with everything on Reserves and see what the cash flow does.',
    lastColumn: 'F',
  });
  tableHead(proj, 6, ['Project', 'Year', 'Cost', 'Funded from', 'Per unit if assessed', 'Notes'],
    [44, 10, 14, 16, 18, 34]);

  for (let i = 0; i < PROJECT_ROWS; i += 1) {
    const r = FIRST_PROJECT_ROW + i;
    const seed = PLAN_SEED[i];
    const row = proj.getRow(r);
    inputCell(row.getCell(1));
    inputCell(row.getCell(2), { numFmt: YEAR_FMT });
    inputCell(row.getCell(3), { numFmt: MONEY });
    inputCell(row.getCell(4));
    inputCell(row.getCell(6));
    row.getCell(4).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['"Reserves,Loan,Assessment,Operating"'],
    };
    if (seed) {
      row.getCell(1).value = seed[0];
      row.getCell(2).value = seed[1];
      row.getCell(3).value = seed[2];
      row.getCell(4).value = seed[3];
    }
    calcCell(row.getCell(5), { numFmt: MONEY }).value = {
      formula: `IF(OR($C${r}="",$D${r}<>"Assessment",${SET(S.units)}=0),"",$C${r}/${SET(S.units)})`,
    };
  }

  const projTotal = LAST_PROJECT_ROW + 1;
  labelCell(proj.getRow(projTotal).getCell(1), 'Total', { bold: true });
  calcCell(proj.getRow(projTotal).getCell(3), { numFmt: MONEY, bold: true }).value = {
    formula: `SUM(C${FIRST_PROJECT_ROW}:C${LAST_PROJECT_ROW})`,
  };
  proj.getRow(projTotal).eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: INK } } }; });
  zebra(proj, FIRST_PROJECT_ROW, LAST_PROJECT_ROW, 6);
  proj.views = [{ state: 'frozen', xSplit: 1, ySplit: 6 }];
  proj.autoFilter = `A6:F6`;
  printSetup(proj, { landscape: true, title: '10-Year Capital Plan — Projects' });

  // ── Cash flow ─────────────────────────────────────────────────────────────
  const cf = wb.addWorksheet('Cash flow', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(cf, {
    title: 'What the plan does to the reserve',
    blurb: 'The lowest closing balance is the figure that matters, not the last one.',
    lastColumn: 'J',
  });
  tableHead(cf, 5, [
    'Year', 'Opening reserve', 'Contributions', 'Interest', 'Reserve spending',
    'Closing reserve', 'Loan drawn', 'Loan repayment', 'Assessed', 'Per unit assessed',
  ], [9, 15, 14, 12, 16, 15, 13, 15, 13, 15]);

  const pRange = (col) => `Projects!$${col}$${FIRST_PROJECT_ROW}:$${col}$${LAST_PROJECT_ROW}`;
  const first = 6;

  for (let t = 0; t < PLAN_YEARS; t += 1) {
    const r = first + t;
    const row = cf.getRow(r);
    calcCell(row.getCell(1), { numFmt: YEAR_FMT }).value = { formula: `${SET(S.studyYear)}+${t}` };
    calcCell(row.getCell(2), { numFmt: MONEY }).value = t === 0
      ? { formula: SET(S.reserveOpening) }
      : { formula: `F${r - 1}` };
    calcCell(row.getCell(3), { numFmt: MONEY }).value = {
      formula: `${SET(S.annualContribution)}*(1+${SET(S.contributionIncrease)})^${t}`,
    };
    calcCell(row.getCell(4), { numFmt: MONEY }).value = {
      formula: `MAX(0,B${r}+C${r}/2)*${SET(S.interest)}`,
    };
    // Only the projects funded from reserves hit the reserve.
    calcCell(row.getCell(5), { numFmt: MONEY }).value = {
      formula: `SUMIFS(${pRange('C')},${pRange('B')},$A${r},${pRange('D')},"Reserves")`,
    };
    calcCell(row.getCell(7), { numFmt: MONEY }).value = {
      formula: `SUMIFS(${pRange('C')},${pRange('B')},$A${r},${pRange('D')},"Loan")`,
    };
    /**
     * Repayment on every loan drawn so far that is still inside its term.
     *
     * Each year's borrowing is its own loan with its own payment, so this sums
     * the annual payment for each prior draw rather than treating the lot as
     * one balance — which would understate the early years and overstate the
     * late ones.
     */
    const parts = [];
    for (let k = 0; k <= t; k += 1) {
      const dr = first + k;
      parts.push(
        `IF(AND(G${dr}>0,${t - k}<${SET(S.loanYears)}),`
        + `PMT(${SET(S.loanRate)},${SET(S.loanYears)},-G${dr}),0)`,
      );
    }
    calcCell(row.getCell(8), { numFmt: MONEY }).value = { formula: parts.join('+') };

    calcCell(row.getCell(9), { numFmt: MONEY }).value = {
      formula: `SUMIFS(${pRange('C')},${pRange('B')},$A${r},${pRange('D')},"Assessment")`,
    };
    calcCell(row.getCell(10), { numFmt: MONEY }).value = {
      formula: `IF(OR(I${r}=0,${SET(S.units)}=0),"",I${r}/${SET(S.units)})`,
    };
    // The loan repayment comes out of dues, not the reserve, so it is not
    // subtracted here — it is what makes the dues implication on Summary.
    calcCell(row.getCell(6), { numFmt: MONEY, bold: true }).value = {
      formula: `B${r}+C${r}+D${r}-E${r}`,
    };
  }

  const last = first + PLAN_YEARS - 1;
  zebra(cf, first, last, 10);
  cf.addConditionalFormatting({
    ref: `F${first}:F${last}`,
    rules: [
      { type: 'expression', formulae: [`F${first}<${SET(S.minimumBalance)}`], priority: 1, style: { font: { color: { argb: BAD }, bold: true } } },
    ],
  });
  cf.views = [{ state: 'frozen', ySplit: 5 }];
  printSetup(cf, { landscape: true, title: '10-Year Capital Plan — Cash flow' });

  // ── Summary ───────────────────────────────────────────────────────────────
  const sum = wb.addWorksheet('Summary', { properties: { tabColor: { argb: AMBER_PALE } } });
  [42, 18, 2, 56].forEach((w, i) => { sum.getColumn(i + 1).width = w; });
  sheetHeader(sum, { title: 'Summary', blurb: 'Nothing here is typed.', lastColumn: 'D' });

  const F = `'Cash flow'!$F$${first}:$F$${last}`;
  const A = `'Cash flow'!$A$${first}:$A$${last}`;

  sectionTitle(sum, 5, 'The plan', 'D');
  field(sum, 6, 'Projects in the plan', { formula: `COUNTA(${pRange('A')})`, numFmt: NUMBER });
  field(sum, 7, 'Total capital cost', { formula: `SUM(${pRange('C')})`, numFmt: MONEY, bold: true });
  field(sum, 8, 'Funded from reserves', { formula: `SUMIF(${pRange('D')},"Reserves",${pRange('C')})`, numFmt: MONEY });
  field(sum, 9, 'Funded by borrowing', { formula: `SUMIF(${pRange('D')},"Loan",${pRange('C')})`, numFmt: MONEY });
  field(sum, 10, 'Funded by assessment', { formula: `SUMIF(${pRange('D')},"Assessment",${pRange('C')})`, numFmt: MONEY });
  field(sum, 11, 'Absorbed in the operating budget', { formula: `SUMIF(${pRange('D')},"Operating",${pRange('C')})`, numFmt: MONEY });

  sectionTitle(sum, 13, 'Does the reserve survive it', 'D');
  const lowest = field(sum, 14, 'Lowest closing reserve', {
    formula: `MIN(${F})`, numFmt: MONEY, bold: true,
    note: 'The figure that matters. A plan that ends healthy and dips in year six has a year six problem.',
  });
  lowest.font = { name: 'Calibri', size: 16, bold: true, color: { argb: INK } };
  field(sum, 15, 'In which year', {
    formula: `IFERROR(INDEX(${A},MATCH(MIN(${F}),${F},0)),"")`, numFmt: YEAR_FMT, bold: true,
  });
  field(sum, 16, 'Your minimum', { formula: SET(S.minimumBalance), numFmt: MONEY });
  field(sum, 17, 'Verdict', {
    formula: `IF(B14=""," ",IF(B14<0,"The reserve goes negative — this plan cannot be funded as it stands",`
      + `IF(B14<${SET(S.minimumBalance)},"Dips below your minimum — move a project to a loan, or move a date",`
      + `"Holds above your minimum in every year")))`,
    bold: true,
  });
  sum.addConditionalFormatting({
    ref: 'B17',
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'cannot be funded', priority: 1, style: { font: { color: { argb: BAD }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Dips below', priority: 2, style: { font: { color: { argb: WARN }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Holds above', priority: 3, style: { font: { color: { argb: GOOD }, bold: true } } },
    ],
  });

  sectionTitle(sum, 19, 'What it costs the owners', 'D');
  field(sum, 20, 'Total loan repayments over the plan', {
    formula: `SUM('Cash flow'!$H$${first}:$H$${last})`, numFmt: MONEY,
    note: 'The difference between this and the amount borrowed is the interest — the price of not assessing.',
  });
  field(sum, 21, 'Interest paid', { formula: `MAX(0,B20-B9)`, numFmt: MONEY });
  field(sum, 22, 'Largest single year of loan repayment', {
    formula: `MAX('Cash flow'!$H$${first}:$H$${last})`, numFmt: MONEY,
  });
  field(sum, 23, 'That year, per unit per month', {
    formula: `IF(${SET(S.units)}=0,"",B22/${SET(S.units)}/12)`, numFmt: '$#,##0.00', bold: true,
    note: 'The number to take to owners. A monthly figure is understood; an annual total is argued with.',
  });
  field(sum, 24, 'Total assessed over the plan', {
    formula: `SUM('Cash flow'!$I$${first}:$I$${last})`, numFmt: MONEY,
  });
  field(sum, 25, 'Largest single assessment, per unit', {
    formula: `IF(${SET(S.units)}=0,"",MAX('Cash flow'!$I$${first}:$I$${last})/${SET(S.units)})`,
    numFmt: MONEY, bold: true,
    note: 'The figure that decides whether the vote passes.',
  });

  printSetup(sum, { title: '10-Year Capital Plan — Summary' });
  wb.views = [{ activeTab: 4, firstSheet: 0, visibility: 'visible' }];
  return wb;
}

export async function build() {
  const book = renderBook({
    title: 'Capital Planning for Property Managers',
    subtitle: 'Forecast, fund, and execute large capital projects',
    blurb: 'The question is never whether the roof needs replacing — it is who pays, when, and how much at once. How to read a reserve study and challenge it, choose between reserves, a loan and a special assessment with the real arithmetic of each, scope and bid the work so three prices can actually be compared, and tell the owners in a way that does not lose the vote.',
    audience: ['Property Managers', 'Condo Boards', 'Commercial Owners'],
    edition: '2026 edition',
    keywords: 'capital planning, reserve study, special assessment, association loan, New Hampshire',
    chapters: guideChapters(),
  });

  const wb = buildPlan();

  return [
    { name: 'Capital Planning for Property Managers.pdf', mime: PDF_MIME, buffer: book.buffer, pages: book.pages },
    {
      name: '10-Year Capital Plan.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    },
  ];
}

export async function selfCheck() {
  const files = await build();
  const pdf = files.find((f) => f.name.endsWith('.pdf'));
  const concerns = [];

  if (pdf.buffer.subarray(0, 4).toString() !== '%PDF') concerns.push('the PDF does not start with %PDF');

  // Every funding option must carry a real argument BOTH ways, or the chapter
  // is advocacy rather than a comparison.
  const thin = FUNDING.filter(([, , pro, con]) => !pro || !con || pro.length < 60 || con.length < 60);
  if (thin.length) concerns.push(`${thin.length} funding option(s) are not argued both ways`);

  // The reserve-study chapter is worthless unless it says what to DO.
  const noAction = STUDY_READING.filter(([, , action]) => !action || action.length < 50);
  if (noAction.length) concerns.push(`${noAction.length} reserve-study line(s) do not say what to do with the figure`);

  // The seeded plan must actually exercise all four funding sources, or the
  // spreadsheet demonstrates one path through itself.
  const sources = new Set(PLAN_SEED.map(([, , , src]) => src));
  for (const required of ['Reserves', 'Loan', 'Assessment', 'Operating']) {
    if (!sources.has(required)) concerns.push(`the seeded plan never uses "${required}", so that path is undemonstrated`);
  }
  // Written to substance. The listing says 45 pages; the real figure is what
  // the renderer reports, and the listing is what gets corrected.
  if (pdf.pages < 20) concerns.push(`only ${pdf.pages} pages for a $34 ebook`);

  const total = PLAN_SEED.reduce((s, [, , cost]) => s + cost, 0);
  return {
    figures: [
      ['chapters', String(guideChapters().length)],
      ['guide', `${pdf.pages} pages, ${Math.round(pdf.buffer.length / 1024)} KB`],
      ['plan workbook', `${Math.round(files[1].buffer.length / 1024)} KB`],
      ['seeded plan', `${PLAN_SEED.length} projects, $${total.toLocaleString()}, ${sources.size} funding sources`],
      ['listing says', '45 pages — correct the listing to the real figure'],
      ['listing also claims', '"NH CDFA financing overview" — not delivered, deliberately; reword to "how associations finance capital work"'],
    ],
    concerns,
  };
}
