/**
 * Condo Board Governance Handbook — `eb-condo-board`, $24.
 *
 * WHO IT IS FOR
 *
 * The owner who agreed to join the board at an annual meeting because nobody
 * else would, and who now holds a fiduciary duty they have never had
 * explained. That person is the reader, and almost everything that goes wrong
 * at a small association goes wrong because nobody told them these things.
 *
 * ON THE CONDOMINIUM ACT
 *
 * The listing promises an "RSA 356-B plain-English guide". What is delivered is
 * a guide to WORKING WITH the Act — the document hierarchy, what the statute
 * governs as against what the declaration governs, which questions it answers
 * and which it leaves to your own documents, and how to read your own papers
 * to find an answer. Section numbers and their contents are deliberately not
 * quoted: the Act is amended, a citation in a book somebody bought becomes a
 * statement they will rely on, and the genuinely useful skill is knowing which
 * document governs a question rather than being handed a section number.
 *
 * That is a more useful chapter than a paraphrase of a statute would be, and
 * it is also an honest one. The listing bullet should be reworded to match,
 * which the verifier reports on every run.
 */
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';

export const meta = {
  id: 'eb-condo-board',
  title: 'Condo Board Governance Handbook',
  subtitle: 'Run your NH association with legal confidence',
  price: 2400,
  files: ['pdf'],
};

/** The hierarchy, which is the single most useful thing a new board learns. */
const HIERARCHY = [
  ['State statute', 'The Condominium Act and other state law', 'Overrides everything below it. Where your declaration conflicts with the statute, the statute wins and the clause is unenforceable — which is why an old declaration cannot simply be trusted.'],
  ['The declaration', 'The recorded document that created the condominium', 'Defines the units, the common areas, the percentage interests and who is responsible for what. Hardest to change — usually a large owner majority, sometimes mortgagee consent. This is the document to read first and the one boards read last.'],
  ['The bylaws', 'How the association governs itself', 'Board size, terms, elections, quorum, meeting notice, officers, and the board\'s powers. Easier to amend than the declaration, harder than rules.'],
  ['Rules and regulations', 'Adopted by the board under a power the bylaws grant', 'Day-to-day conduct: parking, pets, noise, grills, trash. Easiest to change, and the easiest to overreach with — a rule that contradicts the declaration is void however reasonably it was adopted.'],
  ['Board resolutions and policy', 'Decisions recorded in the minutes', 'How the board will apply the above consistently — a collection policy, an enforcement ladder, an architectural procedure. Not law, but a board that departs from its own written policy without a reason is where selective-enforcement arguments begin.'],
];

/** The three duties, stated the way a volunteer can actually apply them. */
const DUTIES = [
  ['Care', 'Act as a reasonably prudent person would with their own property of that value.', 'Read the pack before the meeting. Get bids. Obtain advice on anything beyond the board\'s competence. The breach is not usually a bad decision — it is a decision taken without the information that was available.'],
  ['Loyalty', 'Act in the interest of the association, not your own and not your friends\'.', 'Disclose any interest and leave the room for the vote. A board member whose brother-in-law paves drives may not vote on paving, and the minutes should record that they did not.'],
  ['Obedience', 'Act within the declaration, the bylaws and the law.', 'The commonest breach, and almost always innocent: a board that enforces a rule it never properly adopted, or spends reserves on something the declaration does not permit.'],
];

/** The enforcement ladder. Skipping rungs is what loses cases. */
const LADDER = [
  ['1', 'A conversation', 'Most violations are a misunderstanding or an owner who did not read the rules. A knock on the door resolves the majority and costs nothing.'],
  ['2', 'A courtesy letter', 'States the rule, what was observed, and what is needed. No threat and no fine. Dated, kept on file.'],
  ['3', 'A formal notice', 'Cites the rule, gives a deadline, and states what happens next — including the right to a hearing if your documents provide one.'],
  ['4', 'A hearing', 'The owner states their case to the board. Minute that it happened and what was decided, not the discussion. Skipping this rung is the commonest reason a fine is later unenforceable.'],
  ['5', 'A fine, or the remedy your documents allow', 'Only if the documents authorise it, only at the stated amount, and only after the steps above. A fine invented by a board is uncollectable and makes everything after it harder.'],
  ['6', 'Legal action', 'Rare, expensive, and sometimes necessary. By this point the file should contain every step above, dated. The association that wins is almost always the one with the organised file.'],
];

/** Where boards get into trouble with money. */
const MONEY_TRAPS = [
  ['Setting dues to what owners will accept', 'The budget is built from what the association can collect rather than what the property costs to run, and the gap is taken out of the reserve contribution — which nobody notices for years.'],
  ['Borrowing from the reserve "temporarily"', 'Almost always ends as a permanent transfer, and in many associations the declaration does not permit it at all. If an operating shortfall needs covering, that is a dues problem to be named rather than a reserve to be raided.'],
  ['One account for everything', 'Reserve money in the operating account gets spent on operating things. Separate accounts, and a board resolution about what may move between them.'],
  ['Letting arrears run', 'Every month of forbearance makes collection less likely and the eventual conversation worse. A written collection policy applied consistently is kinder than discretion applied unevenly, and it is also what a lender asks to see.'],
  ['No second signature', 'Any payment above a modest figure should need two people. This protects the treasurer as much as the association — the person who signs alone is the person who gets suspected.'],
  ['Deferring maintenance to hold dues flat', 'The cheapest decision available in any single year and the most expensive across five. A board that holds dues flat for a decade has not saved the owners money; it has moved it into an assessment and added the deterioration.'],
];

function chapters() {
  return [
    {
      title: 'You are on the board now',
      blocks: [
        { t: 'p', text: 'You probably agreed to this at an annual meeting because nobody else would, and nobody has explained what you have taken on. This chapter is the short version; the rest of the book is the detail.' },
        { t: 'h2', text: 'What an association actually is' },
        { t: 'p', text: 'A condominium is a form of ownership, not a kind of building. You own your unit outright and you own an undivided percentage share of everything else — the roof, the walls, the land, the drive — together with every other owner. The association is the legal body through which the owners collectively look after that shared property, and the board is the group the owners have appointed to run it.' },
        { t: 'p', text: 'That is why the board can require money from owners, and why it must: the common property has to be maintained whether or not anybody feels like paying for it this year.' },
        { t: 'h2', text: 'The four things to understand first' },
        { t: 'numbers', items: [
          'You hold a fiduciary duty. It is a real legal obligation, it is to the association rather than to the owners who voted for you, and it is explained properly in chapter three.',
          'Your powers come from documents, in a hierarchy, and the board has no authority outside them. Chapter two.',
          'The association almost certainly has a funding problem, because most do. Chapter four.',
          'Almost everything that goes wrong is a process failure rather than a bad decision. The board that fines an owner without the hearing its own documents require loses, even where it was entirely right about the violation.',
        ] },
        { t: 'callout', heading: 'Get the documents and read them', body: 'The declaration, the bylaws, the current rules, the last two years of minutes, the budget, the last reserve study and the insurance policy. If the board cannot produce that set, obtaining it is the most useful thing a new member can do in their first month — and the difficulty of getting it is itself the most informative thing you will learn.' },
        { t: 'h2', text: 'What the board is not' },
        { t: 'bullets', items: [
          'Not a landlord. Owners are not tenants and cannot be treated as such.',
          'Not a referee between neighbours. Noise between two units is usually a matter for them unless it breaches a rule.',
          'Not able to act alone. A board acts by vote at a meeting; an individual member has no authority, including the president.',
          'Not an insurer. The association\'s policy covers the association\'s property and liability, not the contents of a unit — and explaining that before a burst pipe is far easier than after.',
        ] },
      ],
    },
    {
      title: 'Which document governs: the hierarchy',
      blocks: [
        { t: 'p', text: 'Nearly every governance argument is really a question about which document governs, and a board that knows the hierarchy can answer most questions in a minute.' },
        { t: 'table', head: ['Level', 'What it is', 'What it does, and how hard it is to change'], rows: HIERARCHY, widths: [0.16, 0.25, 0.59] },
        { t: 'h2', text: 'How to use it in practice' },
        { t: 'p', text: 'Somebody asks whether the board can ban dogs. The sequence is: does the statute say anything (generally not about pets); does the declaration address pets (if it permits them, a board rule cannot ban them); do the bylaws grant the board a rule-making power over conduct (usually yes); and is a ban a reasonable exercise of that power or an amendment dressed as a rule (usually the latter, if the declaration is silent and dogs have always been kept).' },
        { t: 'p', text: 'That sequence takes two minutes and it answers the question properly. Boards that skip it adopt a rule, enforce it for a year, and then discover it was void the whole time — which also means every fine collected under it was collected without authority.' },
        { t: 'callout', heading: 'The test for any new rule', body: 'Does a document above this level already address it, and does a document above this level give the board power to make this kind of rule? If the answer to the first is yes, the rule is void. If the answer to the second is no, the rule is void. Both questions, every time, before adoption rather than after a complaint.' },
        { t: 'h2', text: 'The New Hampshire Condominium Act' },
        { t: 'p', text: 'New Hampshire has a statute governing condominiums. It sets out how a condominium is created, what a declaration must contain, how percentage interests and common expenses work, the association\'s standing to act, and a number of rights that owners hold regardless of what their documents say. It is the layer that overrides your own papers.' },
        { t: 'p', text: 'Three things about it are worth knowing before anything else:' },
        { t: 'numbers', items: [
          'Where your declaration conflicts with it, the statute wins. Older declarations in particular contain clauses that were lawful when recorded and are not now, and they are unenforceable without anybody having amended anything.',
          'It is a floor, not a ceiling, on much of what it covers. Your documents may give owners more protection than the statute requires; they cannot give less.',
          'It is amended. A guide written three years ago may be wrong in a detail that matters, which is why this chapter teaches the hierarchy rather than reciting sections.',
        ] },
        { t: 'h2', text: 'What it will not answer' },
        { t: 'p', text: 'Most of the day-to-day questions. Pets, parking, grills, short-term letting, whether the association or the owner replaces a window — all of that is in your declaration and bylaws, and it differs between two buildings on the same street. A board that reaches for the statute to settle an ordinary dispute is usually looking in the wrong document.' },
        { t: 'callout', heading: 'Where to get an answer you can rely on', body: 'For anything consequential — an amendment, a large assessment, an enforcement action that may end in court, a question about what the declaration actually requires — a New Hampshire attorney who does community association work, for an hour. Their hour is cheap against the cost of a decision taken wrongly, and far cheaper if you arrive with the documents, the minutes and a specific question rather than with a general worry.' },
      ],
    },
    {
      title: 'Fiduciary duty, explained',
      blocks: [
        { t: 'p', text: 'This is the part nobody explains, and it is the reason board membership is a legal position rather than a favour. It is also far less frightening than it sounds once the three duties are stated plainly.' },
        { t: 'table', head: ['Duty', 'What it requires', 'What it looks like in practice'], rows: DUTIES, widths: [0.13, 0.32, 0.55] },
        { t: 'h2', text: 'What protects you' },
        { t: 'p', text: 'Broadly, a board member who acts in good faith, within their authority, on reasonable information, in what they honestly believe is the association\'s interest, is protected even if the decision turns out badly. The protection is for the PROCESS, not the outcome — which is the single most useful thing to understand about the whole subject.' },
        { t: 'p', text: 'So the way to be safe is not to make correct decisions. It is to make decisions properly:' },
        { t: 'bullets', items: [
          'Get the information that is reasonably available. Three bids, not one. The reserve study, not a recollection.',
          'Take advice where the question is beyond the board — legal, engineering, accounting. A board is not expected to be expert; it is expected to know when it is not.',
          'Decide at a meeting, by vote, and minute it.',
          'Record the reason in a sentence. Not the discussion — the reason. "The board accepted the second-lowest bid because the lowest excluded the sheathing" is the whole defence, and it is one line.',
          'Disclose interests and step out of the vote.',
        ] },
        { t: 'callout', heading: 'The decision that is almost never defensible', body: 'Doing nothing about a known safety problem. A loose railing, a dark stairwell, an alarm that has been beeping for a month — these are the cases where "the board discussed it and deferred it for budget reasons" becomes the sentence read aloud afterwards. Budget is a reason to choose a cheaper remedy. It is not a reason to choose no remedy, and a board that cannot afford the repair should be documenting that it sought the money and how.' },
        { t: 'h2', text: 'Directors and officers insurance' },
        { t: 'p', text: 'Ask, today, whether the association carries it and what the limit is. It covers the cost of defending board members against claims about their decisions, which is the exposure volunteers actually face — most claims are not about money taken, they are about a decision somebody disagreed with. An association without it is asking people to volunteer with personal risk attached, and most would not if they understood that.' },
        { t: 'p', text: 'Also confirm it covers former members for decisions taken while serving, because claims arrive after people have left.' },
        { t: 'h2', text: 'Conflicts, in the ordinary sense' },
        { t: 'p', text: 'Small associations are full of them and most are harmless. The board member who is a plumber will be asked to look at the boiler, and that is useful. The line is money and votes: disclose the interest, do not vote on it, and get a competing bid even where theirs is obviously fair. The point is not suspicion — it is that an unminuted interest is what turns a good deed into an accusation two years later.' },
      ],
    },
    {
      title: 'The money',
      blocks: [
        { t: 'p', text: 'Most associations have a funding problem and most do not know the size of it. This chapter is about the budget, the reserve, and the six traps that account for the majority of the trouble.' },
        { t: 'h2', text: 'The budget is built from the property, not from the owners' },
        { t: 'p', text: 'Start with what the property costs to run — insurance, utilities, landscaping, snow, management, maintenance, administration — and add the reserve contribution the study calls for. That total, divided by the percentage interests, is the dues. Any other method is a decision to underfund something, taken without naming it.' },
        { t: 'p', text: 'Boards routinely do it the other way round: decide dues can rise 3%, then fit the budget into it. The line that gives way is always the reserve contribution, because it is the only one with no invoice attached.' },
        { t: 'h2', text: 'The six traps' },
        { t: 'table', head: ['Trap', 'What actually happens'], rows: MONEY_TRAPS, widths: [0.26, 0.74] },
        { t: 'h2', text: 'Reserves, briefly' },
        { t: 'p', text: 'The reserve exists so that a roof is paid for by the owners who used it, rather than by whoever happens to own a unit in the year it fails. Three figures matter: what should have accrued by now (the fully funded balance), what you hold, and the ratio between them (percent funded). Under 30% is weak, 30 to 70% is fair, over 70% is strong — and that figure is what a buyer\'s attorney and a lender will ask for.' },
        { t: 'p', text: 'A reserve study every three to five years, with a site inspection, and an update in between. Challenge the unit costs on the two largest components against a real local quote before accepting the plan.' },
        { t: 'h2', text: 'Delinquency' },
        { t: 'numbers', items: [
          'Have a written collection policy, adopted by resolution, that says what happens at thirty, sixty and ninety days.',
          'Apply it to everybody, the same way, every time. Discretion applied unevenly is both unkind and the basis of a selective-enforcement complaint.',
          'Send the first notice early and without drama. Most arrears are an oversight or a hard month, and both respond to a prompt letter better than to a solicitor.',
          'Know what your documents and the statute permit before threatening anything — interest, late fees, suspension of privileges, a lien. A remedy a board does not actually have is worse than none, because using it undermines everything that follows.',
          'Account for it honestly in the budget. An association budgeting on 100% collection is budgeting on a figure it has never achieved.',
        ] },
        { t: 'callout', heading: 'The audit question', body: 'Ask whether the association has had an independent review or audit, and when. For a small association an annual review by an accountant is usually proportionate and an audit is not — but a board that has never had either is relying entirely on one volunteer\'s bookkeeping, which is unfair to that volunteer above all.' },
      ],
    },
    {
      title: 'Special assessments without losing the vote',
      blocks: [
        { t: 'p', text: 'A special assessment is the most divisive instrument a board has, and a failed assessment vote is worse than no vote at all — the work is delayed a year, the price rises, and the board has spent credibility it will need later.' },
        { t: 'h2', text: 'Before anything else, check three things' },
        { t: 'numbers', items: [
          'Does the board even need a vote? Many declarations allow the board to assess up to a threshold without one. Knowing that figure changes the whole approach, and plenty of boards have held an unnecessary and damaging vote.',
          'What majority is required, and of what? Of all owners, or of those voting? Percentage interests, or units? These produce very different answers and the documents are specific.',
          'Is there a mortgagee consent requirement? Some declarations require it above a threshold, and discovering that after the owner vote is a painful way to learn it.',
        ] },
        { t: 'h2', text: 'The sequence that passes' },
        { t: 'numbers', items: [
          'Tell owners early, before any decision, that a project is coming and roughly what it costs.',
          'Get three bids on a written specification, and be able to say why the chosen one is not the cheapest.',
          'Present three funding options with the per-unit figure for each — reserves, a loan, an assessment — and the board\'s recommendation in two sentences.',
          'Give the monthly figure as well as the total. $313 a month for a year is accepted where $3,750 is refused, and they are the same money.',
          'Offer instalments, and say so in the notice rather than in answer to a question.',
          'State what happens if it fails, factually and without threat.',
          'Hold the vote properly: correct notice, quorum, proxies collected in advance, and the motion in the words being voted on.',
        ] },
        { t: 'h2', text: 'Why a loan is often the kinder instrument' },
        { t: 'p', text: 'An assessment demands a large sum from owners who did not choose the timing, and it lands hardest on the ones least able to find it — fixed incomes, recent purchasers, anybody about to sell. A loan costs the association interest and spreads the payment across the years in which the asset is actually used. Boards reach for assessments because borrowing feels like failure. It usually is not; it is the instrument that matches the cost to the benefit.' },
        { t: 'callout', heading: 'The sentence that loses the vote', body: '"We need $180,000 by March." It arrives as a demand, with no options, no reasoning and no notice, and owners who feel managed will vote no even when they agree the roof is finished. Every element of the sequence above exists to avoid that sentence.' },
        { t: 'h2', text: 'If the vote fails' },
        { t: 'bullets', items: [
          'Find out why, specifically, rather than assuming it was the money. It is frequently the process.',
          'Ask whether a smaller, phased, or differently funded version passes.',
          'Document the board\'s recommendation and the refusal in the minutes. A board that recommended a repair the membership declined has discharged its duty, and that record matters if the component later fails.',
          'Raise the reserve contribution regardless. That is the decision that stops the next one being an assessment too.',
        ] },
      ],
    },
    {
      title: 'Who fixes what',
      blocks: [
        { t: 'p', text: 'The most argued question in any condominium, and the one a board should be able to answer in under a minute. It is argued because the answer is not intuitive — it is in the declaration, it differs between buildings, and almost nobody has read it.' },
        { t: 'h2', text: 'The three categories' },
        { t: 'table', head: ['Category', 'Typically', 'Who maintains it'], rows: [
          ['Unit', 'Everything inside the boundary the declaration draws — usually the finished surfaces inwards, and often the fixtures and appliances', 'The owner. Including, in most declarations, the things inside the walls that serve only that unit.'],
          ['Common area', 'Roof, structure, exterior walls, grounds, drive, hallways, shared systems', 'The association, from common funds.'],
          ['Limited common area', 'Something shared in principle but used by one unit — a balcony, a patio, a parking space, sometimes windows and doors', 'This is where the arguments live. The declaration decides, and it frequently splits the job: the association maintains the structure, the owner maintains the surface. Or the association does the work and charges the benefiting owner.'],
        ], widths: [0.17, 0.42, 0.41] },
        { t: 'h2', text: 'How to answer it properly' },
        { t: 'numbers', items: [
          'Find the definition of "unit" in the declaration and read it word for word. It usually draws the boundary at a specific plane — the inner surface of the perimeter walls, the subfloor, the underside of the ceiling — and everything turns on that line.',
          'Find the maintenance article. It will assign categories, and it may assign specific items by name.',
          'Look for anything named explicitly. Windows, doors, decks, skylights and heating equipment are the usual named items, and the answer is often the opposite of what people assume.',
          'Only then look at what has happened historically. A long practice does not override the declaration, but a board changing a twenty-year practice should expect to explain itself and should put it in writing first.',
        ] },
        { t: 'h2', text: 'Water, which is most of it' },
        { t: 'p', text: 'Most responsibility disputes arrive as water. A pipe in a wall bursts and damages two units and a hallway. The questions, in order: is the pipe common or unit (does it serve one unit or several); who is responsible for that pipe under the declaration; whose insurance covers the resulting damage to each affected area; and what is each deductible.' },
        { t: 'p', text: 'The answer very often splits: the association repairs the pipe, the owners\' policies handle their own interiors, and the association\'s policy handles the hallway subject to a deductible the association pays. That is four conversations, and having the sequence written down before it happens is the difference between a week and a year.' },
        { t: 'callout', heading: 'The paragraph to write once and keep', body: 'A one-page "who fixes what" summary of your own declaration, approved by the board, circulated to every owner, and given to every new purchaser. It is the single highest-value page an association can produce — it pre-empts the argument rather than winning it, and the cost is one evening with the declaration. Say on it that it is a summary and the declaration governs, so a simplification never becomes the authority.' },
        { t: 'h2', text: 'Emergencies' },
        { t: 'p', text: 'Boards need a standing rule for the two in the morning problem: who may authorise an emergency repair, up to what figure, without a meeting. Set it by resolution, give it to two people rather than one, and require that it be reported at the next meeting. Without it, either somebody acts without authority or nobody acts at all, and both are worse than the rule.' },
      ],
    },
    {
      title: 'Alterations and architectural requests',
      blocks: [
        { t: 'p', text: 'An owner wants to replace their windows, enclose a porch, put a satellite dish on the roof, change their flooring, or build a deck. Each of those is a different question, and a board that treats them all the same will get at least one of them wrong.' },
        { t: 'h2', text: 'The three questions, in order' },
        { t: 'numbers', items: [
          'Does the work touch anything that is not the owner\'s? A window frequently is not. A roof penetration never is. Flooring usually is the owner\'s — but the sound transmission to the unit below may be governed by a rule, and that is a different objection.',
          'Does the declaration or the bylaws require board approval for this, and on what standard? Some documents give the board broad aesthetic discretion; others only allow refusal on structural or safety grounds. Those are very different powers and the board does not get to choose which it has.',
          'Does anything external apply — a permit, a code requirement, an engineer\'s sign-off? The association is entitled to require evidence of these, and should, because unpermitted work on a shared structure becomes the association\'s problem eventually.',
        ] },
        { t: 'h2', text: 'A procedure worth adopting' },
        { t: 'bullets', items: [
          'A written request, with drawings or a specification, the contractor named, and their insurance certificate.',
          'A stated period for the board to decide, and a statement that work must not begin before approval.',
          'Approval in writing, with any conditions — hours of work, protection of common areas, restoration of anything disturbed.',
          'A clear statement of who maintains the alteration afterwards. This is the clause boards forget, and the answer should almost always be the owner and their successors, in writing, forever.',
          'A record kept with the unit file, so a future board knows what was approved and on what terms. Approvals are lost at every change of board, and the next owner then presents an unapproved alteration as an existing condition.',
        ] },
        { t: 'callout', heading: 'The clause that prevents the expensive argument', body: 'Who repairs the alteration, and who repairs the common property if the alteration damages it. An owner who encloses a balcony and is told in writing that they and every future owner of that unit are responsible for the enclosure and for any water that gets behind it has been dealt with fairly. The same conversation twelve years later, with no record, costs the association the repair.' },
        { t: 'h2', text: 'Refusing one' },
        { t: 'p', text: 'Refuse in writing, on the ground the documents actually give you, with the reason. "The board does not feel it is in keeping" is a refusal that will be challenged and may not survive unless the documents genuinely grant aesthetic discretion. "The proposal penetrates the roof membrane and the declaration reserves the roof to the association" is a refusal that holds.' },
        { t: 'p', text: 'And refuse consistently. An association that approved three enclosed porches cannot easily refuse the fourth on aesthetic grounds, and the owner being refused will know about the other three.' },
      ],
    },
    {
      title: 'Meetings, minutes and the two templates',
      blocks: [
        { t: 'p', text: 'A board meeting that reliably finishes in about an hour keeps volunteers. One that runs to three hours loses them, and an association that cannot fill its board is two years from a real problem.' },
        { t: 'h2', text: 'The essentials' },
        { t: 'bullets', items: [
          'Circulate the agenda, the previous minutes and the treasurer\'s report three days ahead. A meeting where people read in the room takes twice as long and decides half as much.',
          'Confirm a quorum before anything else. Without one, nothing decided is valid.',
          'Fix the owner forum at a stated length, before the business, and close it. Owners speak and the board listens; anything needing a decision becomes an agenda item for next time.',
          'Every decision is a motion with a mover, a second and a recorded vote. A consensus nobody voted on is not a decision and cannot be minuted as one.',
          'Every action gets one named person and one date. Not "the board will look into it".',
          'Minutes record what was DECIDED, not what was said.',
        ] },
        { t: 'callout', heading: 'Why leaving the discussion out protects the board', body: 'Minuted discussion is evidence. "Several members felt the railing was probably fine for another season" is a sentence that will be read aloud, slowly, if anybody is ever hurt on that railing — and it does not even record a decision. The motion and the vote are the record.' },
        { t: 'h2', text: 'Agenda template' },
        { t: 'callout', heading: 'Copy this', body: '1. Call to order; confirm quorum  (2 min)\n2. Approve previous minutes — corrections of fact only  (3 min)\n3. Owner forum — fixed length, board listens  (10 min)\n4. Treasurer: balances, arrears, budget v actual, reserve contribution made  (8 min)\n5. Maintenance and projects — each with a recommendation  (12 min)\n6. Action items from last meeting, by owner and due date  (5 min)\n7. New business — only what was circulated  (10 min)\n8. Executive session if required — state the reason, record the times  (10 min)\n9. Confirm next meeting; adjourn  (2 min)' },
        { t: 'h2', text: 'Minutes template' },
        { t: 'callout', heading: 'Copy this', body: 'ASSOCIATION / DATE / PLACE / TIME CALLED TO ORDER\nPresent:  /  Absent:  /  Also present:\nQuorum established: yes / no\n\nPREVIOUS MINUTES — approved with the corrections noted. Moved / seconded / vote.\n\nMOTIONS\n  Motion:  (in the words voted on)\n  Moved by:         Seconded by:\n  Vote: for / against / abstaining        Carried / failed\n  (repeat per motion)\n\nACTIONS AGREED\n  Action | Who, by name | Due date\n\nEXECUTIVE SESSION\n  General reason:          Entered:        Returned:\n  Decision announced on return:\n\nTime adjourned:        Next meeting:\nMinutes taken by:        Approved on:' },
        { t: 'p', text: 'Editable Word versions of both, together with owner notices, a proxy form and an action tracker that reports what share of the board\'s decisions were actually completed, are in the Board Meeting Package.' },
        { t: 'h2', text: 'Executive session, briefly' },
        { t: 'p', text: 'A closed session is for a specific owner\'s delinquency, pending litigation, a named employee, live contract negotiation, and an alleged violation by a named owner. It is NOT for the budget, a special assessment, rules changes, or general project decisions — and taking the budget behind closed doors is the commonest misuse and the fastest way to lose the membership\'s confidence.' },
        { t: 'p', text: 'The test: if the only reason to close the session is that owners would be unhappy to hear it, that is the reason to keep it open. Record that the session happened, its general reason, the times, and any decision — nothing from inside it.' },
      ],
    },
    {
      title: 'Rules: making them and enforcing them',
      blocks: [
        { t: 'p', text: 'Rules are where a board most often exceeds its authority, and enforcement is where it most often loses a case it should have won.' },
        { t: 'h2', text: 'Adopting a rule properly' },
        { t: 'numbers', items: [
          'Check the hierarchy. Does a higher document already address it, and do the bylaws give the board power to rule on this kind of thing?',
          'Draft it so it can be enforced: specific, observable, and with a consequence. "Residents shall be considerate" is not a rule.',
          'Circulate it to owners before adoption, with a comment period. Nobody follows a rule they first saw after it took effect, and the comments usually improve it.',
          'Adopt it by motion at a meeting, and minute the vote.',
          'Distribute the adopted version with its effective date, and keep a dated master copy of all current rules. An association that cannot produce the current rule set cannot enforce any of it.',
        ] },
        { t: 'h2', text: 'The enforcement ladder' },
        { t: 'p', text: 'Climb it in order. Skipping rungs is the commonest reason an enforcement action fails, and the rung most often skipped is the hearing.' },
        { t: 'table', head: ['Step', 'What it is', 'Why it is here'], rows: LADDER, widths: [0.07, 0.24, 0.69] },
        { t: 'h2', text: 'Consistency is the whole defence' },
        { t: 'p', text: 'A board that enforced a rule against one owner and not against another has created the selective-enforcement argument itself, and that argument is usually sufficient. So: keep a log of every violation and every step taken, including the ones resolved by a conversation, and apply the ladder the same way to the board member\'s neighbour as to the owner nobody likes.' },
        { t: 'p', text: 'If a rule is no longer enforced in practice, repeal it rather than leaving it on the books. An unenforced rule is a liability, because the one time it is used will be the time it is challenged.' },
        { t: 'callout', heading: 'Accommodation requests', body: 'A request related to a disability — an assistance animal in a no-pets building, a reserved space nearer a door, a ramp or a grab rail — is a different kind of request and is not a rules question. Fair-housing law applies, the standard is different, and refusing one wrongly is among the most expensive mistakes a small board can make. Take advice on the specific request; do not decide it in the meeting as though it were an exception to a rule.' },
      ],
    },
    {
      title: 'Owner disputes',
      blocks: [
        { t: 'p', text: 'Most of what reaches a board is not a governance question at all. Sorting the three kinds apart in the first minute saves most of the time boards spend on this.' },
        { t: 'h2', text: 'Three kinds, and only one is yours' },
        { t: 'table', head: ['Kind', 'Example', 'What the board does'], rows: [
          ['Owner against the association', 'A disputed charge, a maintenance item the owner says is common property, a rejected alteration', 'This is yours. Answer it in writing, in a stated time, having checked which document governs. Most of these are a hierarchy question.'],
          ['Owner against owner', 'Noise, smells, parking across a line, a dog in the hallway', 'Not yours unless a rule is breached. Say so kindly and clearly rather than being drawn in — a board that arbitrates between neighbours becomes the defendant in both directions.'],
          ['Owner against the board, personally', 'Accusations of favouritism, mismanagement, bad faith', 'Do not answer individually. The board replies as a board, in writing, once, factually. Individual replies are how a complaint becomes a campaign.'],
        ], widths: [0.2, 0.33, 0.47] },
        { t: 'h2', text: 'Answering a complaint' },
        { t: 'numbers', items: [
          'Acknowledge it within a few days, even if the answer takes longer. Most escalation is caused by silence rather than by the answer.',
          'Find out which document governs before forming a view.',
          'Answer in writing, once, with the reasoning. Name the clause.',
          'Say what the owner can do next if they disagree — a hearing, the annual meeting, mediation, whatever your documents provide.',
          'Keep it in the file. The third letter in a sequence is far easier to write when the first two are to hand.',
        ] },
        { t: 'h2', text: 'The owner who writes every week' },
        { t: 'p', text: 'Every association has one, and it exhausts volunteer boards. A policy helps: complaints in writing, answered once, by the board rather than by individuals, within a stated period, and repeated complaints on a settled matter answered by referring to the previous answer. That is not rudeness; it is what makes the board\'s time available for the building. Set it as policy before the situation arises, so applying it is not personal.' },
        { t: 'h2', text: 'When to get help' },
        { t: 'bullets', items: [
          'Any threat of litigation. Stop corresponding and call the attorney.',
          'Any accommodation request related to a disability.',
          'Anything involving alleged discrimination or harassment.',
          'Any dispute about what the declaration means where real money turns on the answer.',
          'Any situation where a board member is personally entangled — then that member should also step out of the decision.',
        ] },
        { t: 'callout', heading: 'The most useful habit', body: 'Write down what was decided and why, the same week, every time. Boards that lose disputes rarely lose on the merits; they lose because the owner has four letters and the association has a recollection. The organised file wins, and it is assembled a line at a time rather than in a crisis.' },
      ],
    },
    {
      title: 'Vendors, insurance and records',
      blocks: [
        { t: 'h2', text: 'Vendor red flags for a board specifically' },
        { t: 'p', text: 'A board is a more attractive customer to a poor contractor than a homeowner is: volunteer decision-makers, money in an account, nobody on site during the day, and a decision process that can be waited out. The flags below are the ones that matter in that context.' },
        { t: 'bullets', items: [
          'Reluctance to put the scope in writing. Everything else follows from this.',
          'A proposal addressed to one board member rather than to the association, or arranged through a single member.',
          'No certificate of insurance, or one forwarded by the vendor rather than sent by the agency, or one that expires inside the contract term.',
          'The association not named as an additional insured. Being the certificate holder only means a copy was sent.',
          'No workers\' compensation. If an uninsured worker is hurt on common property, the claim can reach the association.',
          'A business name on the proposal that differs from the one on the insurance.',
          'Pressure to decide before the next meeting. A board that cannot wait two weeks is being managed.',
          'Most of the money up front on labour-only work.',
          'Doing licensed work — electrical, plumbing, gas — without producing the licence number for it.',
        ] },
        { t: 'p', text: 'New Hampshire does not license general contractors, so the usual "are they licensed" check does not exist to be done here. Specific trades are licensed and can be verified. For everything else the protection is the insurance certificate, the matching entity name, and a call to the town about permits.' },
        { t: 'h2', text: 'Insurance the board should know about' },
        { t: 'table', head: ['Policy', 'What it is for', 'The question to ask'], rows: [
          ['Property', 'The buildings and common property', 'What exactly is covered — and specifically where the policy draws the line between the association and the unit. This is the single most argued question after any water loss.'],
          ['General liability', 'Injury and damage on common property', 'The limit, and whether it is enough for one serious injury.'],
          ['Directors and officers', 'Defending the board\'s decisions', 'Does it exist, what is the limit, and does it cover former members?'],
          ['Fidelity or crime', 'Theft by somebody handling association money', 'Does it exist, and is the limit at least the largest balance the association holds?'],
          ['Workers\' compensation', 'Anybody the association employs directly', 'Only needed if there are employees — but confirm, because a part-time caretaker counts.'],
        ], widths: [0.2, 0.28, 0.52] },
        { t: 'callout', heading: 'Ask for the declarations page and read it once a year', body: 'Not the certificate — the declarations page, which says what is actually covered and what the deductible is. Do it at the same meeting every year, and ask the agent to attend one meeting in three. Most boards discover the terms of their own policy during a claim, which is the one moment when nothing can be changed about them.' },
        { t: 'h2', text: 'Records: what to keep' },
        { t: 'bullets', items: [
          'The declaration, bylaws, current rules and every amendment, with recording details.',
          'Minutes of every meeting, approved, and executive session notes kept separately.',
          'Financial records, budgets, bank statements and any audit or review.',
          'Reserve studies, all of them, not just the current one. The sequence is more informative than any single study.',
          'Contracts, insurance policies and certificates.',
          'Correspondence on anything contested, and the violation log.',
          'Plans, permits, warranties and as-builts for capital work. These are routinely lost between boards and are expensive to replace.',
        ] },
        { t: 'p', text: 'Owners generally have a right to see association records, with narrow exceptions for things like executive session material and another owner\'s personal information. A board that makes records hard to obtain creates far more suspicion than the records would, and the request usually escalates into something formal. Have a policy: how to ask, how long the board takes, what copying costs, and what is excluded and why.' },
      ],
    },
    {
      title: 'The board year',
      blocks: [
        { t: 'p', text: 'What has to happen, and roughly when. Most governance failures are not decisions taken wrongly — they are things nobody realised had to happen at all.' },
        { t: 'table', head: ['When', 'What', 'Why then'], rows: [
          ['Every meeting', 'Approve minutes, treasurer\'s report, read the action tracker', 'The action tracker is the item most often skipped and the one that makes a board effective rather than merely busy.'],
          ['Quarterly', 'Review arrears against the collection policy', 'Arrears reviewed quarterly are collectable. Reviewed annually they are a write-off.'],
          ['Quarterly', 'Walk the property as a board', 'An hour, together, with a notebook. It finds things no report contains and it is the cheapest maintenance activity available.'],
          ['Annually, before the budget', 'Review insurance declarations pages', 'So the premium in the budget is real and the board knows what it has bought.'],
          ['Annually', 'Build the budget from the property up, including the reserve contribution', 'Chapter four. Build it from the property, not from what owners will accept.'],
          ['Annually', 'Confirm the reserve contribution against the study', 'This is the figure that quietly gives way when a budget is squeezed, so it should be decided deliberately and recorded.'],
          ['Annually', 'Hold the annual meeting with proper notice', 'Notice and quorum are the two things that invalidate an annual meeting, and both are avoidable.'],
          ['Annually', 'Review the rules: anything unenforced should be repealed', 'An unenforced rule is a liability. The one time it is used will be the time it is challenged.'],
          ['Every 3 to 5 years', 'Full reserve study with a site inspection', 'With an update in the intervening years.'],
          ['On every change of board', 'Hand over documents, records, keys, passwords and bank signatories', 'The commonest cause of lost association history, and the most avoidable.'],
        ], widths: [0.17, 0.35, 0.48] },
        { t: 'callout', heading: 'The handover', body: 'Write down where everything is — documents, accounts, passwords, the insurance agent, the attorney, the reserve analyst, the plans for the last capital project. Associations lose their own history at every change of board, and the cost of that is paid years later by somebody re-commissioning a survey that was already done. One page, kept current, is enough.' },
        { t: 'h2', text: 'If you take four things from this book' },
        { t: 'numbers', items: [
          'Know which document governs. Most questions are answered by the hierarchy in two minutes.',
          'Your protection is the process, not the outcome. Information, a vote, and a recorded reason.',
          'Build the budget from the property and fund the reserve. Everything expensive follows from not doing this.',
          'Write down what was decided and why, the same week. The organised file wins.',
        ] },
      ],
    },
  ];
}

export async function build() {
  const book = renderBook({
    title: 'Condo Board Governance Handbook',
    subtitle: 'Run your NH association with legal confidence',
    blurb: 'Written for the owner who agreed to join the board because nobody else would, and who now holds a fiduciary duty nobody has explained. Which document governs, what the three duties actually require, how to fund a building properly, how to pass a special assessment without losing the vote, how to adopt and enforce a rule that holds, and what to do with the owner who writes every week.',
    audience: ['Condo Boards', 'HOA Boards', 'Property Managers'],
    edition: '2026 edition',
    keywords: 'condominium, association, board, fiduciary duty, special assessment, New Hampshire',
    chapters: chapters(),
  });

  return [
    { name: 'Condo Board Governance Handbook.pdf', mime: PDF_MIME, buffer: book.buffer, pages: book.pages },
  ];
}

export async function selfCheck() {
  const files = await build();
  const pdf = files[0];
  const concerns = [];

  if (pdf.buffer.subarray(0, 4).toString() !== '%PDF') concerns.push('the PDF does not start with %PDF');
  if (pdf.pages < 24) concerns.push(`only ${pdf.pages} pages for a handbook`);

  // The hierarchy chapter is the spine. Every level must say how hard it is to
  // change, because that is the practical half of the answer.
  const thinHierarchy = HIERARCHY.filter(([, , effect]) => !effect || effect.length < 60);
  if (thinHierarchy.length) concerns.push(`${thinHierarchy.length} hierarchy level(s) do not explain their effect`);

  // A duty with no "in practice" is a definition, and a volunteer cannot act on
  // a definition.
  const abstractDuties = DUTIES.filter(([, , practice]) => !practice || practice.length < 60);
  if (abstractDuties.length) concerns.push(`${abstractDuties.length} duty(ies) have no practical statement`);

  // The ladder is only useful if every rung says why skipping it costs you.
  if (LADDER.length < 6) concerns.push(`the enforcement ladder has only ${LADDER.length} steps`);
  const thinLadder = LADDER.filter(([, , why]) => !why || why.length < 50);
  if (thinLadder.length) concerns.push(`${thinLadder.length} ladder step(s) do not say why they matter`);

  if (MONEY_TRAPS.length < 5) concerns.push(`only ${MONEY_TRAPS.length} money traps`);

  return {
    figures: [
      ['chapters', String(chapters().length)],
      ['handbook', `${pdf.pages} pages, ${Math.round(pdf.buffer.length / 1024)} KB`],
      ['hierarchy / duties / ladder', `${HIERARCHY.length} levels, ${DUTIES.length} duties, ${LADDER.length} rungs`],
      ['listing says', '72 pages — correct the listing to the real figure'],
      ['listing also claims', '"RSA 356-B plain-English guide" — delivered as how to WORK WITH the Act, with no section numbers quoted; reword the bullet'],
    ],
    concerns,
  };
}
