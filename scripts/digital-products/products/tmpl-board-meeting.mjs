/**
 * Board Meeting Package — `tmpl-board-meeting`, $24.
 *
 * WHAT A BUYER IS PAYING FOR
 *
 * An agenda, minutes, an action tracker, owner notices, a proxy form and an
 * annual meeting pack — but the thing that actually changes how a board runs
 * is the action tracker, because the commonest failure of a volunteer board is
 * not bad decisions. It is decisions that were made and then nobody did them,
 * and the next meeting re-discusses the same thing from the beginning.
 *
 * WHY THE MINUTES TEMPLATE IS DELIBERATELY SPARE
 *
 * Minutes are a legal record of what was DECIDED, not a transcript of what was
 * said. A board that minutes the discussion creates a document that is longer,
 * slower to approve, and far more dangerous in a dispute — because every
 * half-formed remark by a volunteer becomes evidence of what the board thought.
 * So the template has a line for the motion, the mover, the second and the
 * vote, and very little room for anything else. That is a feature.
 *
 * ON EXECUTIVE SESSION
 *
 * The guide is clear about the narrow set of things that belong in a closed
 * session and the fact that a decision taken there still has to be recorded in
 * the open minutes. Boards get this wrong in both directions — discussing a
 * delinquent owner in the open meeting, and taking the budget behind closed
 * doors — and both are avoidable with one page of guidance.
 */
import ExcelJS from 'exceljs';
import {
  buildDocx, DOCX_MIME, title as dTitle, h1 as dH1, h2 as dH2, h3 as dH3,
  p as dP, fill, note as dNote, table as dTable, spacer, pageBreak,
} from '../lib/docx.mjs';
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';
import {
  INK, AMBER_PALE, GOOD, WARN, BAD,
  MONEY, PERCENT, NUMBER,
  applyWorkbookMeta, newWorkbook, sheetHeader, sectionTitle, tableHead,
  inputCell, calcCell, labelCell, zebra, printSetup, guideSheet, field,
} from '../lib/workbook.mjs';

export const meta = {
  id: 'tmpl-board-meeting',
  title: 'Board Meeting Package',
  subtitle: 'Everything your association needs to run meetings professionally',
  price: 2400,
  files: ['pdf', 'docx', 'xlsx'],
};

/** A standing agenda that works, with how long each item should take. */
const AGENDA = [
  ['Call to order, and confirm a quorum', 2, 'Record the time and who is present. Without a quorum nothing decided is valid, so this is first and it is not a formality.'],
  ['Approve the previous minutes', 3, 'Corrections of fact only. A board that re-opens the substance of last month\'s decision here will never finish an agenda.'],
  ['Owner forum', 10, 'Fixed length, before the business. Owners speak, the board listens and does not debate. Anything requiring a decision becomes an agenda item for next time — which is also the honest answer to give in the room.'],
  ['Treasurer\'s report', 8, 'Balances, arrears, budget against actual, reserve contribution made. Circulated in advance so the meeting is for questions rather than for reading.'],
  ['Maintenance and projects', 12, 'Status of what is underway, and decisions needed on what is next. Each item should arrive with a recommendation, not an open question.'],
  ['Action items from last meeting', 5, 'Straight off the tracker, by owner and due date. This is the agenda item that makes a board effective, and the one most often left off.'],
  ['New business', 10, 'Only what was on the circulated agenda. Anything raised in the room goes to the next meeting unless it is genuinely urgent — and if everything is urgent, the agenda is being set in the room.'],
  ['Executive session, if required', 10, 'Declared, with the reason, and the time it begins and ends recorded in the open minutes.'],
  ['Confirm next meeting and adjourn', 2, 'Date, time and place agreed before anybody leaves.'],
];

const AGENDA_MINUTES = AGENDA.reduce((n, [, mins]) => n + mins, 0);

/** What belongs behind closed doors, and what does not. */
const EXEC_SESSION = [
  ['Yes', 'A specific owner\'s delinquency or payment plan', 'Naming an owner\'s debt in an open meeting is both unkind and unnecessary. The decision — that a plan was approved — goes in the open minutes without the detail.'],
  ['Yes', 'Pending or threatened litigation', 'Discussing strategy in the open gives it to the other side.'],
  ['Yes', 'Personnel matters about a specific employee or manager', 'A named person\'s performance is not public business.'],
  ['Yes', 'Contract negotiation while bids are live', 'Open discussion of what you are willing to pay reaches the bidders.'],
  ['Yes', 'An alleged rule violation by a named owner', 'Including any hearing. The outcome is recorded; the discussion is not.'],
  ['No', 'The annual budget', 'This is the single most common misuse. The budget is every owner\'s business and taking it behind closed doors is how a board loses the room for years.'],
  ['No', 'A special assessment', 'Owners are being asked for money. The debate belongs in front of them.'],
  ['No', 'Rules and policy changes', 'Nobody follows a rule they first saw in a newsletter.'],
  ['No', 'General maintenance and project decisions', 'Dull, and entirely open.'],
  ['No', 'Anything simply because it is awkward', 'Awkward is not a category. If the only reason to close the session is that owners will be unhappy, that is the reason to keep it open.'],
];

function guideChapters() {
  return [
    {
      title: 'A meeting that finishes',
      blocks: [
        { t: 'p', text: `Nine agenda items, ${AGENDA_MINUTES} minutes. A board meeting that reliably runs to about an hour keeps volunteers; one that runs to three hours loses them, and a board that loses volunteers is a board that stops functioning in two years.` },
        { t: 'h2', text: 'The standing agenda, and the times' },
        { t: 'p', text: 'The times are not aspirational. They are what tells a chair that twenty minutes of owner forum has taken the slot that was for the reserve decision, while there is still time to do something about it.' },
        { t: 'table', head: ['Item', 'Minutes', 'Why it is here, and in this order'], rows: AGENDA.map(([item, mins, why]) => [item, String(mins), why]), widths: [0.3, 0.1, 0.6] },
        { t: 'callout', heading: 'Circulate the pack three days ahead', body: 'Agenda, previous minutes, treasurer\'s report and any proposal with its numbers. A meeting where people read in the room is a meeting that takes twice as long and decides half as much — and a board member who has not read the proposal will quite reasonably refuse to vote on it.' },
        { t: 'h2', text: 'What the chair is actually for' },
        { t: 'bullets', items: [
          'Keeping to the times, out loud. "We are five minutes over on this, do we decide or defer?" is the single most useful sentence available to a chair.',
          'Making sure every decision becomes a motion with a mover, a second and a recorded vote. A consensus nobody voted on is not a decision and cannot be minuted as one.',
          'Making sure every action has one named person and a date. Not "the board will look into it" — that is how an item appears on nine consecutive agendas.',
          'Protecting the owner forum and then closing it. Both halves.',
        ] },
        { t: 'h2', text: 'The action tracker is the point' },
        { t: 'p', text: 'The commonest failure of a volunteer board is not bad decisions. It is decisions that were made and then nobody did them, so the next meeting re-discusses the same thing from the beginning and the owners conclude that nothing ever happens.' },
        { t: 'p', text: 'The spreadsheet in this package tracks every action by owner and due date, flags what is overdue, and reports how much of what the board decided actually got done. That last figure is uncomfortable the first time a board looks at it, and it is the number that changes behaviour.' },
      ],
    },
    {
      title: 'Minutes: what to write and what to leave out',
      blocks: [
        { t: 'p', text: 'Minutes are a legal record of what was decided. They are not a transcript, a newsletter, or a defence of the board\'s reasoning, and treating them as any of those three creates a worse document.' },
        { t: 'h2', text: 'What belongs in them' },
        { t: 'bullets', items: [
          'Date, time, place, who was present, and that a quorum was established.',
          'Each motion, in the words it was voted on.',
          'Who moved it and who seconded it.',
          'The vote: for, against, abstaining — and by name where an association requires it.',
          'Actions agreed, with the person responsible and the date.',
          'The time executive session began and ended, and the general reason for it.',
          'The time of adjournment and the next meeting date.',
        ] },
        { t: 'h2', text: 'What does not' },
        { t: 'bullets', items: [
          'Who said what during discussion. This is the big one.',
          'The arguments on either side, summarised or otherwise.',
          'Anything about a named owner\'s finances or conduct.',
          'The chair\'s opinion of how the meeting went.',
          'Anything that happened in executive session beyond the fact of it and any resulting decision.',
        ] },
        { t: 'callout', heading: 'Why leaving out the discussion protects the board', body: 'Minuted discussion is evidence. "Several members felt the railing was probably fine for another season" is a sentence that will be read aloud, slowly, if anybody is ever hurt on that railing — and it does not even record a decision. The motion and the vote are the record. What volunteers mused about on the way to it is not, and writing it down helps nobody.' },
        { t: 'h2', text: 'Approving them' },
        { t: 'p', text: 'Draft within a week, while anybody still remembers; circulate with the next agenda; approve at the next meeting with corrections of fact only. A board that re-argues the substance of a decision while approving the minutes of it has given itself every decision twice.' },
        { t: 'h2', text: 'Who may see them' },
        { t: 'p', text: 'Approved minutes of open sessions are ordinarily available to owners, and a board that makes them hard to obtain creates far more suspicion than the minutes ever would. Executive session minutes are kept separately and are not generally circulated. Associations differ, and governing documents and state requirements both have something to say about records — so confirm what applies to yours rather than assuming, and then apply it consistently, which matters more than which answer you land on.' },
      ],
    },
    {
      title: 'Executive session: the narrow list',
      blocks: [
        { t: 'p', text: 'Boards get this wrong in both directions — discussing a delinquent owner by name in an open meeting, and taking the annual budget behind closed doors. The first is unkind and unnecessary; the second is how a board loses the confidence of its owners for years.' },
        { t: 'table', head: ['Closed?', 'Subject', 'Why'], rows: EXEC_SESSION, widths: [0.09, 0.3, 0.61] },
        { t: 'h2', text: 'How to run one properly' },
        { t: 'numbers', items: [
          'Move to enter executive session, state the general reason, and record the time in the open minutes.',
          'Ask anybody not entitled to be present to leave, including the manager where the matter concerns them.',
          'Discuss only the stated subject. A session that drifts into general business has become an unminuted board meeting.',
          'Take any decision as a motion, so there is something to record.',
          'Return to open session, record the time, and announce the decision — not the discussion. "The board approved a payment plan" is the right level of detail.',
          'Keep the executive session notes separately from the open minutes.',
        ] },
        { t: 'callout', heading: 'The test', body: 'If the only reason to close the session is that owners would be unhappy to hear it, that is the reason to keep it open. Awkward is not a category.' },
      ],
    },
    {
      title: 'The annual meeting',
      blocks: [
        { t: 'p', text: 'A different animal from a board meeting: the owners are the meeting, the board is reporting to them, and the two things that go wrong are notice and quorum.' },
        { t: 'h2', text: 'Notice' },
        { t: 'p', text: 'Your governing documents set the notice period, the method and what must be included — commonly the date, time, place, the agenda, any election, and anything to be voted on. Follow them exactly. An annual meeting held on short or improper notice can have its decisions challenged, which is a problem discovered months later by somebody who did not like the outcome.' },
        { t: 'h2', text: 'Quorum, and the proxy' },
        { t: 'p', text: 'Most associations struggle to reach quorum, and most then discover that the proxy form they circulated does not do what they needed. The form in this package covers the two kinds, and the difference matters:' },
        { t: 'bullets', items: [
          'A general proxy lets the holder vote as they see fit on anything that arises. Easy to collect, and an owner may be uncomfortable signing it.',
          'A directed proxy records how the owner wants each specific question voted. Harder to collect, and far more defensible — and it is the one to use for a special assessment or a rule change.',
          'A quorum-only proxy counts the owner towards quorum without giving anybody their vote. The most willingly signed of the three, and often the one that saves the meeting.',
        ] },
        { t: 'h2', text: 'Running the meeting' },
        { t: 'numbers', items: [
          'Register attendance and collect proxies at the door, then announce whether quorum is met before anything else happens.',
          'The board reports: the year, the finances, the reserve position, the projects completed and planned.',
          'The election, if there is one. State the number of seats, the candidates, and how voting works before the ballot, not during.',
          'Any owner votes required — budget ratification, assessments, rule changes — each put as a motion in the words being voted on.',
          'Owner questions, with a time limit per speaker announced in advance.',
          'Minute the result of every vote with the counts, including proxies.',
        ] },
        { t: 'callout', heading: 'If quorum fails', body: 'Do not simply carry on. Your documents will say what happens — commonly an adjournment to a later date, sometimes with a lower quorum requirement. Carrying on regardless produces decisions that can be unwound, and the owner who challenges them is usually the one who did not attend.' },
      ],
    },
  ];
}

// ── Word documents ──────────────────────────────────────────────────────────

function agendaDoc() {
  return buildDocx({
    title: 'Board Meeting Agenda',
    subject: 'Standing agenda for an association board meeting',
    keywords: 'board meeting, agenda, condominium, association',
    footer: 'Board Meeting Agenda',
    content: [
      dTitle('Board Meeting Agenda'),
      fill('Association', 4),
      fill('Date and time', 3),
      fill('Place, or joining details', 4.4),
      dNote('Circulate this with the previous minutes and the treasurer\'s report at least three days ahead. A meeting where people read in the room takes twice as long and decides half as much.'),
      spacer(),
      dTable(
        [['', 'Item', 'Mins', 'Who', 'Papers attached']].concat(
          AGENDA.map(([item, mins]) => ['☐', item, String(mins), '', '']),
        ),
        [0.05, 0.47, 0.09, 0.17, 0.22],
      ),
      dP([{ t: `Total: ${AGENDA_MINUTES} minutes.`, b: true }]),
      spacer(),
      dH2('Decisions needed at this meeting'),
      dNote('List them here so nobody is surprised. An item arriving with a recommendation gets decided; one arriving as an open question gets deferred.'),
      ...Array.from({ length: 4 }, () => fill('', 5.4)),
      spacer(),
      dH2('For information only'),
      ...Array.from({ length: 3 }, () => fill('', 5.4)),
    ],
  });
}

function minutesDoc() {
  return buildDocx({
    title: 'Board Meeting Minutes',
    subject: 'Minutes template — decisions, not discussion',
    keywords: 'minutes, board meeting, association',
    footer: 'Board Meeting Minutes',
    content: [
      dTitle('Board Meeting Minutes'),
      dNote('Minutes record what was DECIDED. Not who said what, not the arguments, not the board\'s reasoning. Minuted discussion is evidence, and it never records a decision.'),
      spacer(),
      dTable([
        ['', 'Detail'],
        ['Association', ''],
        ['Date', ''],
        ['Time called to order', ''],
        ['Place', ''],
        ['Present', ''],
        ['Absent', ''],
        ['Also present (manager, guests)', ''],
        ['Quorum established?', ''],
      ], [0.34, 0.66]),
      spacer(),
      dH1('Approval of previous minutes'),
      dP('The minutes of the meeting held on the date below were approved, with the corrections noted.'),
      fill('Date of previous meeting', 2.4),
      fill('Corrections', 5),
      fill('Moved / seconded / vote', 4),
      spacer(),
      dH1('Motions and decisions'),
      dNote('One block per motion. Write the motion in the words it was voted on.'),
      ...[1, 2, 3, 4, 5].flatMap((n) => [
        dH3(`Motion ${n}`),
        fill('Motion', 5.2),
        fill('Moved by', 2.6),
        fill('Seconded by', 2.6),
        fill('For / against / abstaining', 3),
        fill('Carried or failed', 2),
        spacer(),
      ]),
      pageBreak(),
      dH1('Actions agreed'),
      dNote('One named person and one date per action. "The board will look into it" is how an item appears on nine consecutive agendas.'),
      dTable([
        ['Action', 'Who, by name', 'Due date'],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ], [0.56, 0.24, 0.2]),
      spacer(),
      dH1('Executive session'),
      dP('The board entered executive session to discuss the general matter stated below.'),
      fill('General reason', 4.4),
      fill('Time entered', 2),
      fill('Time returned to open session', 2),
      fill('Decision announced on return', 5),
      dNote('The fact of the session, its general reason, the times and any resulting decision. Nothing from inside it.'),
      spacer(),
      dH1('Close'),
      fill('Time adjourned', 2),
      fill('Next meeting — date, time, place', 4.4),
      spacer(),
      fill('Minutes taken by', 3.4),
      fill('Approved on', 2.4),
    ],
  });
}

function ownerNoticesDoc() {
  return buildDocx({
    title: 'Owner Notices',
    subject: 'Notice templates for an association',
    keywords: 'owner notice, annual meeting, special assessment, association',
    footer: 'Owner Notices',
    content: [
      dTitle('Owner Notices'),
      dNote('Four notices. Check your governing documents for the required notice period and delivery method before sending any of them — a decision taken on improper notice can be challenged months later by somebody who did not like it.'),
      spacer(),

      dH1('1. Notice of annual meeting'),
      fill('Association', 4),
      fill('Date, time and place', 4.4),
      dP('Notice is given to all owners of the annual meeting of the association, to be held at the date, time and place above. The business of the meeting will be:'),
      ...Array.from({ length: 5 }, () => fill('', 5.2)),
      dP('A proxy form accompanies this notice. If you cannot attend, returning a proxy helps the association reach the quorum it needs to conduct business at all.'),
      fill('Sent on', 2.2),
      fill('Delivered by', 3),
      pageBreak(),

      dH1('2. Notice of special meeting'),
      fill('Date, time and place', 4.4),
      dP('Notice is given of a special meeting of the association called for the single purpose stated below. No other business will be conducted.'),
      fill('Purpose', 5.2),
      fill('Called by', 3),
      fill('Sent on', 2.2),
      pageBreak(),

      dH1('3. Notice of special assessment'),
      dNote('Owners are being asked for money. Say what for, how much, when, and what happens next — and say it in the notice rather than at the meeting.'),
      fill('Purpose of the assessment', 5.2),
      fill('Total amount', 2.4),
      fill('Your unit\'s share', 2.4),
      fill('Basis of apportionment', 4),
      fill('Due date, or instalment dates', 4),
      fill('How to pay', 4),
      fill('Owner vote required?  Yes / No', 2.8),
      fill('If yes, meeting date', 2.6),
      dP('The board will answer questions about this assessment at the meeting noted above, and in writing before it.'),
      pageBreak(),

      dH1('4. Notice of rule change'),
      dNote('Nobody follows a rule they first saw in a newsletter after it took effect.'),
      fill('Rule being added or changed', 5.2),
      fill('What it will say', 5.2),
      fill('Why', 5.2),
      fill('Effective date', 2.4),
      fill('Comment period closes', 2.4),
      dP('Owners may comment in writing before the date above. The board will consider comments received before the rule takes effect.'),
    ],
  });
}

function proxyDoc() {
  return buildDocx({
    title: 'Proxy Form',
    subject: 'Owner proxy — general, directed, or quorum only',
    keywords: 'proxy, quorum, annual meeting, association',
    footer: 'Proxy Form',
    content: [
      dTitle('Proxy Form'),
      fill('Association', 4),
      fill('Meeting date', 2.4),
      spacer(),
      dH1('The owner'),
      fill('Unit', 2),
      fill('Owner name(s)', 4),
      fill('Address', 4.4),
      spacer(),
      dH1('Choose ONE'),
      dNote('These do different things. The third is the one most owners will sign, and it is often what saves a meeting.'),
      dP([{ t: '☐  1. Quorum only. ', b: true }, { t: 'Count me towards quorum. Do not cast any vote on my behalf.' }]),
      dP([{ t: '☐  2. General proxy. ', b: true }, { t: 'The person named below may vote on my behalf as they see fit on any matter arising.' }]),
      dP([{ t: '☐  3. Directed proxy. ', b: true }, { t: 'The person named below may vote on my behalf only as I have directed in the table below.' }]),
      spacer(),
      fill('Proxy holder name', 4),
      dNote('Leave the holder blank only if your documents allow the proxy to be held by the board or the chair — check before relying on it.'),
      spacer(),
      dH1('Directions (for option 3)'),
      dTable([
        ['Question to be voted on', 'For', 'Against', 'Abstain'],
        ['', '☐', '☐', '☐'],
        ['', '☐', '☐', '☐'],
        ['', '☐', '☐', '☐'],
        ['', '☐', '☐', '☐'],
      ], [0.58, 0.14, 0.14, 0.14]),
      spacer(),
      dH1('Signature'),
      dP('This proxy is valid for the meeting named above and any adjournment of it, unless revoked in writing before the vote is taken.'),
      fill('Signed', 3.4),
      fill('Print name', 3.4),
      fill('Date', 2),
      dNote('Return by the date and method stated in the meeting notice. A proxy that arrives after the vote cannot be counted, however clearly it was expressed.'),
    ],
  });
}

// ── The action tracker ──────────────────────────────────────────────────────

const FIRST_ACTION_ROW = 6;
const ACTION_ROWS = 60;
const LAST_ACTION_ROW = FIRST_ACTION_ROW + ACTION_ROWS - 1;

function buildTracker() {
  const wb = new ExcelJS.Workbook();
  applyWorkbookMeta(wb, newWorkbook({
    title: 'Board Action Tracker',
    subject: 'Every decision the board made, and whether it got done',
    keywords: 'board, actions, accountability, association',
  }));

  guideSheet(wb, {
    title: 'Board Action Tracker',
    blurb: 'Every action the board agreed, who owns it, when it is due, and whether it happened.',
    blocks: [
      ['Why this is the most useful file in the package', [
        'The commonest failure of a volunteer board is not bad decisions. It is decisions that were made and then nobody did them, so the next meeting re-discusses the same thing from the beginning and owners conclude that nothing ever happens.',
        'An action with no named person and no date is not an action. Both columns are required, and the tracker counts the rows that are missing either.',
      ]],
      ['How to use it', [
        'Add every action as the meeting agrees it — straight from the minutes, in the words agreed.',
        'Put one name in the Owner column. Not "the board", not two people. One.',
        'Read the Open items off this sheet at the next meeting. That single agenda item is what makes a board effective, and it is the one most often left off.',
      ]],
      ['The number that changes behaviour', [
        'The Summary sheet reports what share of agreed actions were actually completed, and how many are overdue.',
        'It is uncomfortable the first time a board looks at it. That is the point — a board that can see the figure starts closing items, and a board that cannot see it does not.',
      ]],
    ],
  });

  const ws = wb.addWorksheet('Actions', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(ws, {
    title: 'Actions agreed',
    blurb: 'One named person and one date per action. Status drives the summary.',
    lastColumn: 'H',
  });
  tableHead(ws, 5, ['Meeting date', 'Action agreed', 'Owner (one name)', 'Due date', 'Status', 'Done date', 'Notes', 'Days late'],
    [14, 46, 20, 12, 14, 12, 34, 10]);

  for (let i = 0; i < ACTION_ROWS; i += 1) {
    const r = FIRST_ACTION_ROW + i;
    const row = ws.getRow(r);
    for (const c of [1, 2, 3, 4, 6, 7]) inputCell(row.getCell(c));
    row.getCell(1).numFmt = 'yyyy-mm-dd';
    row.getCell(4).numFmt = 'yyyy-mm-dd';
    row.getCell(6).numFmt = 'yyyy-mm-dd';
    inputCell(row.getCell(5)).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['"Open,Done,Deferred,Dropped"'],
    };
    // Days late: only meaningful for something still open and past its date.
    calcCell(row.getCell(8), { numFmt: NUMBER }).value = {
      formula: `IF(OR($B${r}="",$D${r}=""),"",IF($E${r}="Done",IF($F${r}="","",MAX(0,$F${r}-$D${r})),MAX(0,TODAY()-$D${r})))`,
    };
  }

  zebra(ws, FIRST_ACTION_ROW, LAST_ACTION_ROW, 8);
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 5 }];
  ws.autoFilter = 'A5:H5';
  ws.addConditionalFormatting({
    ref: `H${FIRST_ACTION_ROW}:H${LAST_ACTION_ROW}`,
    rules: [
      { type: 'cellIs', operator: 'greaterThan', formulae: ['30'], priority: 1, style: { font: { color: { argb: BAD }, bold: true } } },
      { type: 'cellIs', operator: 'greaterThan', formulae: ['0'], priority: 2, style: { font: { color: { argb: WARN } } } },
    ],
  });
  printSetup(ws, { landscape: true, title: 'Board Action Tracker — Actions' });

  // ── Summary ───────────────────────────────────────────────────────────────
  const sum = wb.addWorksheet('Summary', { properties: { tabColor: { argb: AMBER_PALE } } });
  [40, 16, 2, 58].forEach((w, i) => { sum.getColumn(i + 1).width = w; });
  sheetHeader(sum, {
    title: 'Is the board getting things done?',
    blurb: 'Nothing here is typed. Fill in the Actions sheet and these figures follow.',
    lastColumn: 'D',
  });

  const col = (letter) => `Actions!$${letter}$${FIRST_ACTION_ROW}:$${letter}$${LAST_ACTION_ROW}`;

  sectionTitle(sum, 5, 'The count', 'D');
  field(sum, 6, 'Actions recorded', { formula: `COUNTA(${col('B')})`, numFmt: NUMBER });
  field(sum, 7, 'Done', { formula: `COUNTIF(${col('E')},"Done")`, numFmt: NUMBER });
  field(sum, 8, 'Open', { formula: `COUNTIF(${col('E')},"Open")`, numFmt: NUMBER });
  field(sum, 9, 'Deferred', { formula: `COUNTIF(${col('E')},"Deferred")`, numFmt: NUMBER });
  field(sum, 10, 'Dropped', { formula: `COUNTIF(${col('E')},"Dropped")`, numFmt: NUMBER });

  sectionTitle(sum, 12, 'The figure that changes behaviour', 'D');
  const share = field(sum, 13, 'Share of agreed actions completed', {
    formula: `IF(B6=0,"",B7/B6)`, numFmt: PERCENT, bold: true,
    note: 'Uncomfortable the first time a board looks at it. A board that can see this figure starts closing items; one that cannot, does not.',
  });
  share.font = { name: 'Calibri', size: 16, bold: true, color: { argb: INK } };
  field(sum, 14, 'Open and past their due date', {
    formula: `SUMPRODUCT((${col('E')}="Open")*(${col('D')}<>"")*(${col('D')}<TODAY()))`,
    numFmt: NUMBER, bold: true,
  });
  field(sum, 15, 'Open more than 30 days late', {
    formula: `SUMPRODUCT((${col('E')}="Open")*(${col('D')}<>"")*(${col('D')}<TODAY()-30))`,
    numFmt: NUMBER,
    note: 'Anything here should be either done, formally deferred with a reason, or dropped. Leaving it open is a decision nobody took.',
  });
  field(sum, 16, 'Average days late, where late', {
    formula: `IFERROR(AVERAGEIF(${col('H')},">0"),"")`, numFmt: '0.0',
  });

  sum.addConditionalFormatting({
    ref: 'B13',
    rules: [
      { type: 'cellIs', operator: 'lessThan', formulae: ['0.5'], priority: 1, style: { font: { color: { argb: BAD }, bold: true } } },
      { type: 'cellIs', operator: 'greaterThan', formulae: ['0.8'], priority: 2, style: { font: { color: { argb: GOOD }, bold: true } } },
    ],
  });

  sectionTitle(sum, 18, 'Quality of the record', 'D');
  field(sum, 19, 'Actions with no named owner', {
    formula: `SUMPRODUCT((${col('B')}<>"")*(${col('C')}=""))`, numFmt: NUMBER,
    note: 'An action with no name is not an action. It is a hope.',
  });
  field(sum, 20, 'Actions with no due date', {
    formula: `SUMPRODUCT((${col('B')}<>"")*(${col('D')}=""))`, numFmt: NUMBER,
  });
  field(sum, 21, 'Actions with no status set', {
    formula: `SUMPRODUCT((${col('B')}<>"")*(${col('E')}=""))`, numFmt: NUMBER,
  });

  printSetup(sum, { title: 'Board Action Tracker — Summary' });
  wb.views = [{ activeTab: 2, firstSheet: 0, visibility: 'visible' }];
  return wb;
}

export async function build() {
  const book = renderBook({
    title: 'Board Meeting Package',
    subtitle: 'Everything your association needs to run meetings professionally',
    blurb: `A standing agenda that finishes in ${AGENDA_MINUTES} minutes, minutes that record decisions rather than discussion, the narrow list of what actually belongs in executive session, and the annual meeting — notice, quorum and the three kinds of proxy. With the action tracker that answers the question a board rarely asks itself: of everything we agreed, how much got done?`,
    audience: ['Condo Boards', 'HOA Boards'],
    edition: '2026 edition',
    keywords: 'board meeting, minutes, executive session, proxy, annual meeting, association',
    chapters: guideChapters(),
  });

  const wb = buildTracker();

  return [
    { name: 'Board Meeting — Guide.pdf', mime: PDF_MIME, buffer: book.buffer, pages: book.pages },
    { name: 'Board Meeting Agenda.docx', mime: DOCX_MIME, buffer: agendaDoc() },
    { name: 'Board Meeting Minutes.docx', mime: DOCX_MIME, buffer: minutesDoc() },
    { name: 'Owner Notices.docx', mime: DOCX_MIME, buffer: ownerNoticesDoc() },
    { name: 'Proxy Form.docx', mime: DOCX_MIME, buffer: proxyDoc() },
    {
      name: 'Board Action Tracker.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    },
  ];
}

export async function selfCheck(loaded) {
  const { unzip } = await import('../lib/zip.mjs');
  const files = await build();
  const pdf = files.find((f) => f.name.endsWith('.pdf'));
  const docs = files.filter((f) => f.name.endsWith('.docx'));
  const concerns = [];

  for (const doc of docs) {
    try {
      const parts = unzip(doc.buffer).map((f) => f.name);
      if (!parts.includes('word/document.xml')) concerns.push(`${doc.name} has no document part`);
    } catch (error) {
      concerns.push(`${doc.name} is not readable: ${error.message}`);
    }
  }
  if (pdf.buffer.subarray(0, 4).toString() !== '%PDF') concerns.push('the PDF does not start with %PDF');

  // The listing promises six templates.
  if (docs.length + 1 < 5) concerns.push(`only ${docs.length} Word templates`);
  // A meeting nobody can finish is the problem this product addresses.
  if (AGENDA_MINUTES > 90) concerns.push(`the standing agenda totals ${AGENDA_MINUTES} minutes, which is not a meeting that finishes`);
  // Every agenda item must justify its place and its order.
  const unexplained = AGENDA.filter(([, , why]) => !why || why.length < 40);
  if (unexplained.length) concerns.push(`${unexplained.length} agenda item(s) do not say why they are there`);
  // The executive session chapter is useless unless it says NO to things.
  const noes = EXEC_SESSION.filter(([closed]) => closed === 'No').length;
  if (noes < 4) concerns.push(`only ${noes} subjects listed as NOT for executive session — boards get this wrong in both directions`);
  if (pdf.pages < 10) concerns.push(`only ${pdf.pages} pages`);

  return {
    figures: [
      ['agenda', `${AGENDA.length} items, ${AGENDA_MINUTES} minutes`],
      ['executive session', `${EXEC_SESSION.length} subjects (${noes} explicitly NOT closed)`],
      ['guide', `${pdf.pages} pages, ${Math.round(pdf.buffer.length / 1024)} KB`],
      ['templates', `${docs.length} Word + 1 tracker`],
    ],
    concerns,
  };
}
