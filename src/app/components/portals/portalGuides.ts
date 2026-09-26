/**
 * What every portal can do, and exactly how to do it.
 *
 * Kept apart from the renderer because this is writing, not code: it is read
 * far more often than it is executed, and it is the one file where a wrong
 * sentence reaches a customer directly.
 *
 * THE RULE FOR EDITING THIS FILE
 *
 * Every step below must describe a control that actually exists, named the way
 * the screen names it. A guide written from imagination is worse than a vague
 * one — it promises features nobody built, and the person following it decides
 * the software is broken rather than the guide. When a tab changes, the steps
 * for it change in the same commit.
 *
 * The customer guide is written against the seventeen tabs in
 * `CustomerPortalView.tsx`. The remaining portals are still in the older,
 * four-bullet shape and are being rewritten one at a time.
 */

export type PortalGuideKey = "customer" | "vendor" | "subcontractor" | "employee" | "advertiser" | "investor" | "property_manager" | "condo_manager" | "landlord" | "territory" | "condo_association" | "admin";

export type GuideSection = {
  /** The tab label, spelled exactly as the portal spells it. */
  name: string;
  /** One line: what this tab is for. */
  purpose?: string;
  /** How to actually use it, in the order you would do it. */
  steps?: string[];
  /** The thing that trips people up, or the limit worth knowing before they hit it. */
  note?: string;
  /** The older one-line shape, still used by the portals not yet rewritten. */
  detail?: string;
  status?: string;
};

export type Guide = {
  title: string;
  summary: string;
  start: string;
  sections: GuideSection[];
};

/**
 * Said in one place because it is said on four tabs, and the four must not
 * drift apart into four different admissions of the same thing.
 */
const DEMO_TAB =
  "This tab is a demonstration layout built on sample rows held in the page itself. Nothing here is read from the database and nothing you do to it is saved — reload the page and it returns to the same examples. It shows the shape the screen will take; it is not yet the screen.";

export const GUIDES: Record<PortalGuideKey, Guide> = {
  customer: {
    title: "Your customer portal, explained",
    summary:
      "Everything Black Phoenix does for you runs through these tabs: requesting work, approving the price, signing, paying, watching your plan hours, designing the job, and seeing it on your own house before anybody picks up a tool.",
    start:
      "If you want work done, start at Projects → New Request. If work is already under way, start at Quotes & Invoices to see what is waiting on you. Everything else supports those two.",
    sections: [
      {
        name: "Dashboard",
        purpose:
          "The front page of your account — plan hours, live projects, recent replies, current offers, and the four buttons that start most jobs.",
        steps: [
          "The strip across the top is your maintenance plan: hours Included, Used, Rollover, Gifted and Available. With no plan, it shows an Upgrade button instead.",
          "Quick Actions holds the four shortcuts: New Work Request starts a job, Pick Products opens a product-led quote request, View Quotes jumps to anything awaiting your decision, and Shop Products opens the store.",
          "Active Projects lists your most recent work requests with their status; View All opens the Projects tab.",
          "Recent Messages shows the latest replies from your team — click through to Messages to answer.",
          "Featured Reels, Featured Services and Active Giveaways run down the page; Get Quote on a service raises a request for that service directly.",
        ],
        note:
          "Before you have submitted anything, Active Projects reads “Create your first request →”. That link does the same job as New Work Request.",
      },
      {
        name: "Projects",
        purpose:
          "Every work request you have submitted, and the place a new one starts.",
        steps: [
          "Click New Request at the top right of the list.",
          "Choose how you want to start: Quick Request takes a few lines and gets us talking; Full Details walks through the whole job and produces the most accurate quote.",
          "Pick the project type — Simple Service, Kitchen/Bath Remodel, Full Renovation, New Construction, or Trash & Demo Removal. The questions that follow change with the type you choose.",
          "Answer the specifics it asks for. A kitchen or bath, for example, asks about the current layout, layout type, cabinet style and finish, countertop material and which appliances to include.",
          "If you would rather just describe the job in your own words, use the AI Project Assistant at the top of the form — it fills the fields in and you check them before continuing.",
          "Submit. The request appears in this list immediately, showing its service, priority and timeline.",
        ],
        note:
          "The request is the job. Your quote, contract, invoice and any materials ordered all attach to it, so raise one request per piece of work rather than one per conversation.",
      },
      {
        name: "Quotes & Invoices",
        purpose:
          "Prices waiting on your decision, and the bills for work already done.",
        steps: [
          "Quotes are listed first, each showing the quote amount and how many line items it contains. View Details opens the full breakdown — materials, labour, and anything credited back to you.",
          "Read the breakdown before signing. Materials carry sales tax; labour does not, so the taxed figure is smaller than the subtotal and that is correct.",
          "If you bought something yourself — your own flooring, say — it appears as its own credit line, negative, deducted from the total.",
          "Review & Sign Quote accepts the price. Signing is what lets us schedule the work.",
          "Pay 30% Deposit books the job in. The balance is invoiced as the work progresses.",
          "Invoices sit below the quotes, each with the address of service, the amount due, and whether it is Paid. Download PDF gives you a copy for your records.",
        ],
        note:
          "A signed quote does not change afterwards — that is deliberate, so the price you agreed stays the price. If the job needs to change, ask your project manager for a change order and the difference is priced on its own.",
      },
      {
        name: "Contracts",
        purpose: "Service contracts waiting for your signature, and the ones already signed.",
        steps: [
          "Each contract card shows its title, when it was created, the amount, and its status.",
          "The terms are printed on the card — read them there; there is nothing to download first.",
          "Review & sign signs it in place. Nothing needs printing, scanning or posting.",
          "Once signed, the button is replaced by Signed and the date.",
        ],
        note:
          "“No contracts are awaiting your signature” means exactly that. Contracts are only raised after a quote has been accepted, so an empty list early on is normal.",
      },
      {
        name: "Payments",
        purpose: "What you owe now, what is late, and what has already been settled.",
        steps: [
          "The three figures at the top are Due now, Overdue and Settled.",
          "Each outstanding item has a Pay now button.",
          "Pay now opens a secure checkout page hosted by our payment processor.",
          "Once the payment clears, the item moves into Settled and the figures at the top update.",
        ],
        note:
          "Card details are entered on the processor's own page, never inside the portal — Black Phoenix never sees or stores your card number.",
      },
      {
        name: "My Plan",
        purpose:
          "Your maintenance plan in full: hours included, hours used, what is left, and what going over costs.",
        steps: [
          "The panel at the top shows your plan name, Monthly Fee, hours This Period, Hours Remaining, Overage Hours, Overage Rate and Total Balance Due.",
          "Below it, every visit is listed — date, description, technician, tier, hours and cost — so you can see where each hour went.",
          "Refresh records pulls the latest in if work has just been completed.",
          "Invoices & Payments lists bills raised against the plan; Pay Securely settles one.",
          "Digital Add-ons & Resources shows what your plan includes beyond labour; Browse All opens the whole list.",
        ],
        note:
          "You cannot log hours here yourself — our office logs them as work is completed, which is what makes this record the one to argue from. If you pass your plan limit the tracker says Plan Limit Exceeded and offers Upgrade Plan.",
      },
      {
        name: "Plans & Add-ons",
        purpose: "Where you change plan, add extras, or have a plan built around what you actually own.",
        steps: [
          "Your Active Plans at the top shows what you are on now and the service hours it carries.",
          "To take a standard plan, use Start with a set plan — View details shows what is in one, Use this plan selects it.",
          "To have one built for you, use Build Your Own Plan with AI and describe your situation in plain words (for example, “I own a 3-unit rental in Manchester”).",
          "Set Technician Level and Billing Frequency — the estimated total updates as you change them.",
          "Add to plan and Remove from plan on each add-on build the package; Start over clears it and begins again.",
          "“Need something we don't list?” sends us a description of anything the builder does not cover.",
        ],
        note:
          "Nothing is charged while you are building — the figure shown is an estimate until you confirm.",
      },
      {
        name: "Messages",
        purpose: "Your thread with the Black Phoenix team, attached to your project.",
        steps: [
          "Open Messages to read the conversation, newest at the bottom.",
          "Type in the reply box and send.",
          "The tab carries a count of unread replies; opening it clears the count.",
        ],
        note:
          "Keep decisions here rather than in text messages. Anything agreed in this thread stays attached to the job, where whoever picks the work up can see it.",
      },
      {
        name: "Shop",
        purpose: "The Black Phoenix store — products sold outright, separate from any construction work.",
        steps: [
          "Browse the Featured Collection and Trending Now, or search.",
          "Sort by Featured, Rating, Price low to high, Price high to low, or Newest.",
          "Add what you want to the Cart, then check out.",
        ],
        note:
          "Store orders are their own thing — they are not billed against your maintenance plan and do not appear under Projects.",
      },
      {
        name: "Deals & Reels",
        purpose: "Current offers, giveaways and short videos from Black Phoenix and its partners.",
        steps: [
          "Featured reels play at the top; tap one to watch it full size.",
          "Offers below each show what they include and when they end.",
          "Anything you want to act on links through to the request or store page for it.",
        ],
      },
      {
        name: "Investments",
        purpose: "Investment opportunities offered through Black Phoenix.",
        steps: [
          "Some detail sits behind Investor Access — Join subscription or Subscribe opens the Investor Intelligence subscription.",
          "All Opportunities lists what is available; search by name, location or category, or filter by category.",
          "Each card shows projected ROI, the minimum, and the term.",
          "Invest Now opens the interest form — enter an amount and Submit Investment Interest.",
          "My Investments and Recent Distributions track what you already hold.",
        ],
        note:
          "Submitting interest registers it with us; it does not move any money. Cards marked “SAMPLE — not a real offer” are illustrations of the format, not live offerings.",
      },
      {
        name: "Referrals",
        purpose: "Your referral link, and what it has earned.",
        steps: [
          "Your Referral Link is at the top — Copy Link, or share it by Email, SMS or WhatsApp.",
          "Each person you refer is listed with the date referred, whether their project completed, whether payment was received, and the project value.",
          "Rewards are 5% of the project value. They show as Potential until the project is paid, then as Earned.",
          "Total Earnings at the top adds up everything that has actually landed.",
        ],
        note:
          "A referral stays Pending until the referred project is both completed and paid — that is why a reward can sit there for weeks on a large job.",
      },
      {
        name: "Design Your Project",
        purpose:
          "The designs you have built in the design centre — decks, kitchens, bathrooms, siding, doors and windows.",
        steps: [
          "Your designs lists everything you have saved.",
          "Open reopens one to keep working on it.",
          "Send to Black Phoenix hands it over for pricing; the card then reads Sent to us.",
        ],
        note:
          "Send it once the layout and measurements are right. We price from what the model actually says, so an unfinished design produces an unfinished price.",
      },
      {
        name: "See It On Your Home",
        purpose: "A picture of the proposed work on your actual house, rather than someone else's.",
        steps: [
          "Take a photo of the part of your home you have in mind, or Choose one you already have.",
          "Describe what you want to see — for example, “a deck across the back with steps down to the garden”.",
          "Generate the image and look at it.",
          "“I like this — talk to me about it” sends it to us, and the page confirms somebody will be in touch.",
        ],
        note:
          "This is a picture to think with, not a plan to build from. The measured version is the design centre.",
      },
      {
        name: "Try a Floor",
        purpose: "The same idea for flooring — a new floor in a photo of your own room.",
        steps: [
          "Add a photo under Your room.",
          "Choose which floors to try under “Which floors shall we try?”.",
          "Compare the results side by side before you commit to a material.",
        ],
      },
      {
        name: "Documents",
        purpose: "Your vault — plans, permits, warranties, photographs, anything to do with your jobs.",
        steps: [
          "Upload a file and give it a Category.",
          "Set “Related to” if it belongs to a particular project, so it files itself against that job.",
          "Search by name, project or reference to find something later.",
        ],
        note:
          "25MB per file. What you put here is visible to you and to Black Phoenix, nobody else.",
      },
      {
        name: "Portal Guide",
        purpose: "This page.",
        steps: [
          "Each card above is one tab of your portal, in the order they appear across the top.",
          "If something you need is not described here, ask in Messages — the guide is kept up to date from what people ask.",
        ],
      },
    ],
  },
  vendor: {
    title: "Your vendor operations portal",
    summary:
      "Your catalogue, the purchase orders Black Phoenix raises against it, the invoices you bill us for, and what you get paid. Everything else here supports those four.",
    start:
      "Products first — nothing can be ordered from you until your catalogue is in. Then Orders, which is where the work arrives.",
    sections: [
      {
        name: "Dashboard",
        purpose: "The summary view: revenue and order volume, recent purchase orders, your live deals and reels.",
        steps: [
          "Revenue Trends charts monthly revenue against order volume; Export takes the figures out.",
          "Recent Orders lists the latest purchase orders with their items, total, order date and delivery; View All opens the Orders tab.",
          "Active Deals shows what you currently have running, with its promo code; Manage opens Promotions.",
          "Video Reels shows your approved reels. Empty here means none yet — they are added from Promotions.",
        ],
        note:
          "If this page says your account is not linked to a vendor record, stop and read the Orders note below — it explains why every tab will look empty and what fixes it. Also: the small “Change (Demo)” link beside Current Plan cycles the tier shown on this screen only. It changes nothing about what you are subscribed to or billed for, however confidently the message that follows it reads.",
      },
      {
        name: "Orders",
        purpose: "The purchase orders Black Phoenix has raised against you. This is how work reaches you.",
        steps: [
          "Each order shows when it was ordered, when it is needed by, how many lines it has, the total and its status.",
          "Open one to see the lines it is asking you to supply.",
          "Fulfil it your normal way, then bill it from the Invoices tab — invoices are raised from purchase orders, so an order has to exist first.",
        ],
        note:
          "These are orders from Black Phoenix to you, not sales to the public. If the list is empty and the page says your login is not attached to your vendor record, that is the whole problem: until the link exists, the portal cannot tell which vendor you are, so every tab is correctly empty. Ask Black Phoenix to attach your login — there is nothing you can do from this side to fix it.",
      },
      {
        name: "Products",
        purpose: "Your catalogue — what Black Phoenix can order from you, and what customers see when they choose materials.",
        steps: [
          "Add a line by hand with its name, your SKU, category, unit and price, then save it.",
          "Or use Import a price list to bring in a spreadsheet: download the template if you want the exact shape, say whether your file has column headings and which row they are on, pick the sheet, then match your columns to ours — name, price, SKU, category, unit, availability and lead time.",
          "Edit changes a published line; Remove takes it out of the catalogue.",
          "Images and presentation is where you decide where your photographs may appear: in the design centre while a customer is choosing materials, on quotes and proposals beside the line they price, and on the public storefront. Each is asked separately.",
          "The same panel sets what happens to your pictures when your catalogue re-syncs: only when the image address changes, every sync, or never.",
        ],
        note:
          "The price you publish is the price a customer sees. Nothing is displayed from your images until you turn that surface on — the default is off everywhere. A line with no price cannot sync, and a line nobody ever orders shows up under Performance as catalogue coverage, which is usually a sign it is priced wrong, described wrong, or is something we do not use.",
      },
      {
        name: "Promotions",
        purpose: "Deals and video reels shown to Black Phoenix customers.",
        steps: [
          "Create Deal opens the form: title, description, discount type — including buy one get one and free service — value, an optional original price, an optional promo code, an expiry date and an optional image.",
          "Post Deal publishes it; your live deals are listed with their status and when they were posted.",
          "Your published deals appear on customers' Deals & Reels tab.",
        ],
        note:
          "Deals need an active plan. Without one the tab says so and offers View Plans instead of publishing — the deal is not quietly saved and forgotten, it simply does not go live.",
      },
      {
        name: "Invoices",
        purpose: "What you have billed Black Phoenix for. You raise them here; we approve and pay them.",
        steps: [
          "Raise an invoice opens the form.",
          "Give it your invoice number, issue date and terms.",
          "Tick the purchase orders you are billing for — an invoice is built from orders, which is what keeps both sides agreeing on the amount.",
          "Add notes if anything needs explaining, then raise it.",
          "The table lists every invoice with when it was issued, when it is due, how many orders it covers, the amount, what is still outstanding and its status.",
        ],
        note:
          "“Nothing left to invoice” means every purchase order raised against you is already on an invoice, still in draft on our side, or cancelled — so it is a statement about our end, not an error at yours. Approving, disputing and recording payment are ours to do; you will see the status change rather than the buttons.",
      },
      {
        name: "Payments",
        purpose: "What has actually been paid to you.",
        steps: [
          "Each payment shows the date paid, the reference, the method, which invoices it settled and the amount.",
        ],
        note:
          "This is the record to check before chasing an invoice — an invoice can read as settled here before the money has cleared your own bank.",
      },
      {
        name: "Plan Tracker",
        purpose: "Your subscription and any service hours that come with it.",
        steps: [
          "The top panel shows your plan, the monthly fee, hours used this period, hours remaining and the overage rate.",
          "Every logged item is listed beneath with its date, description, hours and cost.",
          "Invoices & Payments covers bills raised against the plan itself, separately from what you bill us.",
        ],
        note: "Hours here are logged by Black Phoenix as work is done; you are reading the record, not writing it.",
      },
      {
        name: "Plans & Add-ons",
        purpose: "Change what you subscribe to, or add extras.",
        steps: [
          "Your Active Plans shows what you are on now.",
          "Start with a set plan to take one of the standard tiers, or Build Your Own Plan with AI to describe what you need in plain words.",
          "Add to plan and Remove from plan assemble the package; the estimated total updates as you go.",
        ],
        note: "This is the tab that actually changes your subscription. The Current Plan line on the Dashboard does not.",
      },
      {
        name: "Performance",
        purpose: "How you are doing as a supplier, counted from real orders rather than a rating somebody typed in.",
        steps: [
          "Order value, average order and largest order, across the orders actually raised against you.",
          "Invoiced shows what you have billed and how much of it is settled.",
          "On-time delivery is the share of measured deliveries that arrived by their needed-by date.",
          "Where orders stand breaks the orders down by status; Catalogue coverage shows which published lines have ever actually been ordered.",
          "Submit a Reel to the Landing Page sits at the top of this tab: give it a title, an optional link to your site, a description, a video URL (YouTube, Vimeo or a direct .mp4) and a thumbnail image URL.",
        ],
        note:
          "On-time delivery only counts orders carrying a delivery date. Nothing was timestamped before this existed, so older orders are excluded rather than assumed on time — if it reads “measured from the next delivery on”, that is why, and it is not a mark against you. Reels go to Black Phoenix for approval before they appear anywhere.",
      },
      {
        name: "Investments",
        purpose: "Investment opportunities offered through Black Phoenix.",
        steps: [
          "All Opportunities lists what is available; search by name, location or category.",
          "Each card shows projected ROI, the minimum and the term.",
          "Invest Now opens the interest form; My Investments and Recent Distributions track anything you hold.",
        ],
        note: "Submitting interest registers it with us and moves no money. Cards marked “SAMPLE” are format illustrations.",
      },
      {
        name: "Referral Rewards",
        purpose: "Your referral link and what it has earned.",
        steps: [
          "Copy Link, or share by email, SMS or WhatsApp.",
          "Each referral is listed with its date, whether the project completed and whether payment was received.",
          "Rewards are 5% of project value, shown as Potential until the referred project is paid, then Earned.",
        ],
      },
      {
        name: "API Settings",
        purpose: "Connect your own system so your catalogue and our purchase orders move without anybody retyping them.",
        steps: [
          "Give us your catalogue endpoint — the address we read your products from.",
          "Give us your purchase order endpoint if you want orders delivered into your system automatically.",
          "Say how your key should be sent: an Authorization: Bearer header, a custom header, or a query parameter.",
          "Match your fields to ours. Name and price are required before any sync can run.",
          "Save the mapping. Last sync tells you when we last read from you.",
        ],
        note:
          "There is deliberately no test button on the purchase order endpoint. Testing it would mean POSTing an order into your live system and possibly creating a real one. The first purchase order we send reports exactly what happened instead. Orders we send carry an Idempotency-Key, so a retry on our side cannot duplicate an order on yours.",
      },
      {
        name: "Messages",
        purpose: "Your thread with the Black Phoenix team.",
        steps: [
          "Read the conversation, reply in the box, send.",
          "The tab shows unread replies; opening it clears the count.",
        ],
        note: "Keep order and pricing decisions here, where they stay attached to the account rather than in somebody's inbox.",
      },
      {
        name: "Documents",
        purpose: "Your document vault — certificates of insurance, W-9s, price lists, terms.",
        steps: [
          "Upload a file and give it a Category.",
          "Set “Related to” if it belongs to a particular order or reference.",
          "Search by name, project or reference.",
        ],
        note: "25MB per file. Visible to you and to Black Phoenix, nobody else.",
      },
      {
        name: "Portal Guide",
        purpose: "This page.",
        steps: [
          "Each card above is one tab of your portal, in the order they run across the top.",
          "If something here stops matching the screen, tell us in Messages — the guide is written from the portal and is meant to stay that way.",
        ],
      },
    ],
  },
  subcontractor: {
    title: "Your subcontractor work hub",
    summary:
      "Work comes to you through the bid room: jobs are posted, you price them, and the ones you win become your active jobs. The rest of this portal keeps you eligible to bid and tracks what you are owed.",
    start:
      "Insurance & Licences first — it takes five minutes and it is what keeps you eligible. Then Dashboard, where the open jobs are.",
    sections: [
      {
        name: "Dashboard",
        purpose: "Open jobs you can bid on, and the state of your own work at a glance.",
        steps: [
          "The four figures across the top are Active Jobs, Awarded This Month, Bids Submitted and Jobs Won.",
          "Open Jobs lists what is currently posted — title, trade, site address and when bids are due.",
          "A job you have already priced reads Bid Sent instead of offering the button again.",
          "Submit Bid opens the bid form for that job.",
          "Revenue Overview charts your monthly performance; Export takes the figures out. Recent Payments shows what has come in.",
        ],
        note:
          "Jobs marked “Requested from you” were put in front of you specifically rather than opened to everyone. They are worth answering first, even if only to decline.",
      },
      {
        name: "Submitting a bid",
        purpose: "The form behind every Submit Bid button — the single most important thing in this portal.",
        steps: [
          "Check the location, budget and deadline shown at the top of the form; they are the job as posted.",
          "Enter your bid amount.",
          "Give an estimated duration in your own words — “3-4 days” is a perfectly good answer.",
          "Write proposal notes: your approach, the materials you would use, what warranty you carry. This is what separates two bids at the same price.",
          "Attach photos or videos if they help your case — JPG, PNG, MP4 or MOV, up to 50MB each.",
          "Submit the bid. The job then reads Bid Sent, and it appears under My Bids.",
        ],
        note:
          "Your bid goes into the bid room itself, which is what Black Phoenix reads and what awards are run from. Your attachments are part of your bid and are not shown to other bidders.",
      },
      {
        name: "Active Jobs",
        purpose: "The work you have won and are carrying out.",
        steps: [
          "Each job shows what it is, where it is and its current state.",
          "A job arrives here when your bid is accepted — there is nothing to claim or confirm.",
        ],
        note: "Empty means nothing has been awarded to you yet, not that something failed to load.",
      },
      {
        name: "My Bids",
        purpose: "Every bid you have submitted and where it stands.",
        steps: [
          "Each entry shows the job, your amount, your notes and the status of the bid.",
          "A bid stays listed after a decision, so you can see what you priced and what it went for.",
          "With nothing submitted yet, Go to Dashboard takes you to the open jobs.",
        ],
      },
      {
        name: "Insurance & Licences",
        purpose: "Your cover and credentials. This is what keeps you eligible to be awarded work.",
        steps: [
          "General liability insurance and workers' compensation are required — for workers' comp, your exemption counts if you have no employees.",
          "Commercial auto liability, a trade licence and a surety bond are asked for when they apply: driving to site, the trade you work in, and whether you carry a bond.",
          "For each one, record the insurer or issuer, the policy or licence number, and the expiry date.",
          "The panel colours each entry — valid, expiring, or expired — and tells you when nothing expires in the next 30 days.",
        ],
        note:
          "Keep the expiry dates honest. An expired certificate is the ordinary reason a subcontractor stops being offered work, and it is entirely avoidable — the panel warns you a month ahead.",
      },
      {
        name: "Payments",
        purpose: "What you are owed and what has been paid.",
        steps: [
          "The payment schedule lists each payment with its date and amount.",
          "Export takes the schedule out for your own books.",
        ],
        note: "“No payments to show yet” is the honest state until a job you have completed has been paid.",
      },
      {
        name: "Investments",
        purpose: "Investment opportunities offered through Black Phoenix.",
        steps: [
          "All Opportunities lists what is available; each card shows projected ROI, the minimum and the term.",
          "Invest Now opens the interest form; My Investments tracks anything you hold.",
        ],
        note: "Submitting interest registers it and moves no money. Cards marked “SAMPLE” are format illustrations.",
      },
      {
        name: "Plan Tracker",
        purpose: "Your subscription and any service hours it carries.",
        steps: [
          "The top panel shows your plan, monthly fee, hours used and hours remaining.",
          "Each logged item is listed with its date, description, hours and cost.",
        ],
        note: "Hours are logged by Black Phoenix as work is done; you are reading the record, not writing it.",
      },
      {
        name: "Plans & Add-ons",
        purpose: "Change what you subscribe to, or add extras.",
        steps: [
          "Your Active Plans shows what you are on.",
          "Start with a set plan to take a standard tier, or describe what you need and have one built.",
          "Add to plan and Remove from plan assemble the package; the estimated total updates as you go.",
        ],
      },
      {
        name: "Performance",
        purpose: "Your record, counted from your actual bids.",
        steps: [
          "Jobs Won and Bids Submitted are straight counts.",
          "Bid Win Rate is the first divided by the second, and names the two numbers underneath it so you can check it.",
        ],
        note:
          "On-Time Rate reads “not measured yet” because nothing currently timestamps when a subcontractor finishes. It used to show 96%, which was typed into the page rather than counted — a figure you cannot check is worth less than an honest blank, so it is blank until there is something real behind it.",
      },
      {
        name: "Messages",
        purpose: "Your thread with the Black Phoenix team.",
        steps: [
          "Read the conversation, reply in the box, send.",
          "“Messages from Black Phoenix will appear here” means the thread has not started yet.",
        ],
        note: "Questions about a job's scope belong here rather than in the bid notes, so the answer reaches whoever picks the job up.",
      },
      {
        name: "Documents",
        purpose: "Your document vault — certificates, W-9s, signed agreements, job photographs.",
        steps: [
          "Upload a file and give it a Category.",
          "Set “Related to” if it belongs to a particular job or reference.",
          "Search by name, project or reference.",
        ],
        note:
          "25MB per file. Insurance certificates belong on the Insurance & Licences tab as well — that tab is what tracks expiry; this one only stores the paper.",
      },
      {
        name: "Portal Guide",
        purpose: "This page.",
        steps: [
          "Each card above is one tab of your portal, plus the bid form, which is the part you will use most.",
          "If something here stops matching the screen, say so in Messages.",
        ],
      },
    ],
  },
  employee: {
    title: "Your employee workspace",
    summary:
      "Punch in, punch out, say which work orders your hours went to, and send the week to payroll. Everything else here supports getting paid correctly for what you did.",
    start:
      "Dashboard, and the big green Punch in button. Everything on your timesheet starts from a punch.",
    sections: [
      {
        name: "Dashboard",
        purpose: "Your punch card and the shape of your week.",
        steps: [
          "The large button punches you in. While the clock is running it turns red and reads Punch out, and the timer beside it counts up live.",
          "Hours this week and the number of shifts recorded sit next to the clock.",
          "Weekly Hours charts what you have actually worked; Export Report takes it out.",
          "Work Orders tells you how many jobs are currently assigned to you.",
          "Add job photos uploads pictures from site without leaving the page.",
        ],
        note:
          "If the button is greyed out and the page says no employee record is linked to this account, your login has not been attached to your employee record yet — you cannot punch in until it is, and only Black Phoenix can do it. Say so straight away rather than working an untracked day. After eight hours on the clock a reminder appears; it is a nudge, not a cut-off, and nothing shortens your day automatically.",
      },
      {
        name: "Timesheet",
        purpose:
          "Turning the hours you punched into hours payroll can pay, split across the work orders you actually worked on.",
        steps: [
          "Shifts & work-order split lists your completed shifts, newest first.",
          "For a shift, choose a work order from the dropdown and enter the hours that went to it.",
          "Add as many work orders as the shift needs; Remove takes one off. The split is how a day across three jobs gets billed to three jobs.",
          "Send to payroll submits the shift. It then reads Sent to payroll, and Approved by payroll once it has been accepted.",
          "Export Timesheet takes the record out for your own files.",
        ],
        note:
          "You can only bill to work orders assigned to you — that is what the dropdown lists, and the server checks it again. “Waiting on a real finish time” means the shift is still open: punch out first, then it can be sent. A shift already sent cannot be quietly edited, which protects you as much as anyone.",
      },
      {
        name: "Schedule",
        purpose: "Intended as your calendar of jobs, meetings and site visits.",
        steps: [
          "Today's Schedule lists the day's entries with their time, duration and location.",
          "Filter narrows the view; Add Event adds an entry.",
        ],
        note:
          "This tab is a demonstration layout built on example entries written into the page — a stand-up meeting in Conference Room A and the like. Nothing here comes from the database and nothing you add is saved. What you are actually assigned is on the Tasks tab, which is real.",
      },
      {
        name: "Tasks",
        purpose: "The work orders assigned to you \u2014 the jobs you can bill hours against.",
        steps: [
          "Each card is a job dispatched to you, with its customer, its site and its current status.",
          "These are the same jobs the Timesheet offers in its work-order dropdown, so anything listed here is something you can be paid for.",
          "A job appears here when the office dispatches it to you. There is nothing to accept or claim.",
        ],
        note:
          "An empty list means nothing is assigned to you right now, not that something failed. If it says no employee record is linked to this account, that is the real problem \u2014 work cannot be assigned to you until Black Phoenix attaches your login.",
      },
      {        name: "Performance",
        purpose: "Your record, counted from your own timesheet.",
        steps: [
          "Hours this week, with anything past forty named as overtime.",
          "Shifts recorded, and how many hours are not yet split to a job.",
          "Work orders assigned to you right now.",
        ],
        note:
          "Nothing on this screen is an opinion and nobody is scoring you on it. It used to show an overall rating, 142 tasks completed and 8 of 10 goals, all written into the page rather than measured \u2014 they are gone. The hours not yet split to a job are the number worth acting on: until they are attributed, they are not billable to anyone.",
      },
      {        name: "Documents",
        purpose: "Your employment documents — contracts, certifications, handbooks, anything you need to keep.",
        steps: [
          "Upload Document adds a file and asks for a Category.",
          "Search finds one by name or reference.",
          "Download takes a copy.",
        ],
        note: "25MB per file. Visible to you and to Black Phoenix, nobody else.",
      },
      {
        name: "Hour Banking",
        purpose: "Banked hours held against your account, and what has been drawn from them.",
        steps: [
          "The top panel shows hours included, used and remaining.",
          "Every logged item is listed with its date, description, hours and cost.",
        ],
        note: "These are logged by the office as work is recorded. Your own worked hours are on the Timesheet, which is a different thing.",
      },
      {
        name: "Plans & Add-ons",
        purpose: "Any plan or extras attached to your account.",
        steps: [
          "Your Active Plans shows what you are on.",
          "Set plans and add-ons can be browsed and priced; the estimated total updates as you go.",
        ],
      },
      {
        name: "Messages",
        purpose: "Your thread with the office.",
        steps: [
          "Read the conversation, reply in the box, send.",
        ],
        note:
          "This screen existed for a while with no way to open it \u2014 there was no tab. There is now. Anything about a job\u2019s scope or your hours is better here than in a text message, because it stays attached to your account.",
      },
      {        name: "Referrals",
        purpose: "Referring people you have worked with, and what it earns.",
        steps: [
          "Copy your referral link, or share it by email, SMS or WhatsApp.",
          "Each referral is listed with its date and whether the work completed and was paid.",
          "Rewards show as Potential until the referred project is paid, then Earned.",
        ],
      },
      {
        name: "Investments",
        purpose: "Investment opportunities offered through Black Phoenix.",
        steps: [
          "All Opportunities lists what is available, with projected ROI, minimum and term.",
          "Invest Now opens the interest form.",
        ],
        note: "Submitting interest registers it and moves no money. Cards marked “SAMPLE” are format illustrations.",
      },
      {
        name: "Portal Guide",
        purpose: "This page.",
        steps: [
          "Each card above is one tab of your workspace, in the order they run across the top.",
          "Your punch card, timesheet, work orders and record are all real. Schedule is the one tab that is not yet.",
        ],
        note:
          "Schedule is the only tab still marked as a demonstration layout. Everything else here reads from your real record.",
      },
    ],
  },
  advertiser: {
    title: "Your advertiser command space",
    summary:
      "Creatives go into the media library, campaigns decide where and when they run, and analytics tells you which ones earn their place. Everything counted here is counted — nothing on these screens is estimated.",
    start:
      "Media Library first: a campaign has nothing to serve until a creative exists. Then Campaigns to run it, then Performance to see which one to keep.",
    sections: [
      {
        name: "Dashboard",
        purpose: "The summary: campaign performance over time, what is running, and your best creatives.",
        steps: [
          "Campaign Performance charts impressions and clicks over time; Export Report takes the figures out.",
          "Active Campaigns lists what is running now with its budget, impressions and clicks; View All opens Campaigns.",
          "Top Performing Ads ranks your creatives by click-through rate; View Library opens the media library.",
          "Current Plan shows the tier you are on, resolved from your actual subscription.",
        ],
        note:
          "There are no conversion or return-on-spend figures anywhere in this portal, and their absence is deliberate: nothing on this platform attributes a sale back to an ad, so any such number would be invented. What you see is impressions and clicks, which are genuinely counted every time an ad is served.",
      },
      {
        name: "Media Library",
        purpose: "Your creatives. A campaign has nothing to serve until one exists here.",
        steps: [
          "Add a creative with its headline, body text and the link it should open.",
          "Choose the placement it is built for: marquee strip, banner, or reel.",
          "Each creative shows how many times it has been shown, its clicks and its CTR.",
          "“Not served yet” means exactly that — it exists but has never been put in front of anyone.",
          "Submit a Reel to the Landing Page sits at the top of this tab for reels you want on the public site; those go to Black Phoenix for approval first.",
        ],
        note:
          "Your link is checked before it is stored — only http and https are accepted. That is not fussiness: these links render inside the strip that runs across other people's portals, so a bad scheme there would run in somebody else's browser.",
      },
      {
        name: "Campaigns",
        purpose: "What is running, where, and for how long.",
        steps: [
          "Create a campaign with a name and, if it helps you, an objective.",
          "Attach the creatives it should serve.",
          "Pause stops a running campaign without deleting it; Resume starts it again; End closes it.",
          "Each campaign shows what it has been shown, its clicks and its CTR.",
        ],
        note: "Pausing is reversible and immediate. Ending is the one to think about, because the campaign stops being a thing you can resume.",
      },
      {
        name: "Advertising Hub",
        purpose: "The catalogue of what can be bought — placements, cohort pricing and what each is worth.",
        steps: [
          "Cohort Pricing Tiers shows how price moves with the number of platform users.",
          "Each offering lists its base price, current price, impressions and average CTR.",
          "Filter by All Status, Active, Draft or Paused; Add New creates an offering.",
          "Revenue Breakdown totals what the current line-up is worth per month.",
        ],
        note: "Prices here move with platform reach, which is why the current price and the base price are shown separately.",
      },
      {
        name: "Ad Placements",
        purpose: "The slots you can buy, with what each one delivers.",
        steps: [
          "Each placement shows its impressions, CTR, duration, monthly price and format.",
          "Select chooses one; Placement Details opens what it covers.",
        ],
      },
      {
        name: "Live Previews",
        purpose: "Your ad in position, on the portal it would actually appear in.",
        steps: [
          "Select Portal picks which portal to preview.",
          "Device Preview switches between screen sizes.",
          "The page shows each placement in context — inline, sidebar, vendor feed widget — with the portal's reach, available slots, mobile share and average engagement.",
          "Open Portal opens the real thing.",
        ],
        note: "This is the tab to use before buying a placement rather than after — it is much easier to judge a slot in position than from a price list.",
      },
      {
        name: "Analytics",
        purpose: "What happened, day by day.",
        steps: [
          "Day by day charts impressions and clicks over the period.",
          "Every figure is counted from real ad serves.",
        ],
        note:
          "Analytics and Performance are the same numbers cut two ways on purpose. This one is the trend — what happened. The other is the decision — what to keep.",
      },
      {
        name: "Performance",
        purpose: "Which creative earns its place, and which one to kill.",
        steps: [
          "What is working ranks your creatives by how they perform against your own average.",
          "Each shows what it was shown, its clicks and its CTR.",
          "“Still gathering” means it is running but has not been shown enough times to judge yet.",
          "“Never served” means it has had no exposure at all — check it is attached to a live campaign.",
        ],
        note: "“Against average” compares a creative to your other creatives, not to an industry figure nobody measured.",
      },
      {
        name: "Billing",
        purpose: "Your plan, what you have used of it, and what else is available.",
        steps: [
          "Your plan shows the tier you are on.",
          "What you have used shows impressions consumed and how many campaigns are active.",
          "Change your plan lists the alternatives; switch between monthly and weekly pricing.",
          "Switch to this asks your account manager to move you.",
        ],
        note:
          "Switching does not charge anything and does not take effect on its own — it tells your account manager, and they move you. The message on screen says so.",
      },
      {
        name: "Deals & Reels",
        purpose: "Deals and video reels published to Black Phoenix customers.",
        steps: [
          "Create Deal opens the form: title, description, discount type, value, optional original price, optional promo code, expiry and image.",
          "Post Deal publishes it; your live deals are listed with their status.",
          "Featured reels play above them.",
        ],
        note: "Deals need an active plan. Without one the tab says so and offers the plans rather than publishing.",
      },
      {
        name: "Plan Tracker",
        purpose: "Your subscription and any service hours attached to it.",
        steps: [
          "Plan, monthly fee, hours used and hours remaining at the top.",
          "Each logged item beneath, with date, description, hours and cost.",
        ],
      },
      {
        name: "Plans & Add-ons",
        purpose: "Change what you subscribe to, or add extras.",
        steps: [
          "Your Active Plans shows what you hold now.",
          "Take a standard tier, or describe what you need and have one built.",
          "Add to plan and Remove from plan assemble the package.",
        ],
      },
      {
        name: "Investments",
        purpose: "Investment opportunities offered through Black Phoenix.",
        steps: [
          "All Opportunities lists what is available, with projected ROI, minimum and term.",
          "Invest Now opens the interest form.",
        ],
        note: "Submitting interest registers it and moves no money. Cards marked “SAMPLE” are format illustrations.",
      },
      {
        name: "Referral Rewards",
        purpose: "Your referral link and what it has earned.",
        steps: [
          "Copy Link, or share by email, SMS or WhatsApp.",
          "Rewards are 5% of project value, Potential until the referred project is paid.",
        ],
      },
      {
        name: "Messages",
        purpose: "Your thread with the Black Phoenix team.",
        steps: [
          "Read the conversation, reply in the box, send.",
        ],
        note: "Placement and pricing questions belong here, where they stay attached to your account.",
      },
      {
        name: "Documents",
        purpose: "Your document vault — contracts, insertion orders, brand assets.",
        steps: [
          "Upload a file and give it a Category.",
          "Set “Related to” if it belongs to a campaign or reference.",
          "Search by name, project or reference.",
        ],
        note: "25MB per file.",
      },
      {
        name: "Portal Guide",
        purpose: "This page.",
        steps: [
          "Each card above is one tab of your portal, in the order they run across the top.",
          "If a step stops matching the screen, say so in Messages.",
        ],
      },
    ],
  },
  investor: {
    title: "Your investor portal guide",
    summary:
      "What you have committed, what has been paid back to you, what is currently open, and the documents behind each of them. Every figure here is counted from your own records.",
    start:
      "Portfolio tells you where you stand. Opportunities is what is open. Read Documents before committing to anything.",
    sections: [
      {
        name: "Dashboard",
        purpose: "Where your holdings stand, and what is currently raising.",
        steps: [
          "Portfolio Performance charts total value and return over time; Export Report takes the figures out.",
          "Investment Properties lists what you hold, each showing what you invested, its current value, its return and any monthly income.",
          "New Investment Opportunities runs underneath, split into Company Equity and Property, each with its minimum, projected return and how much is funded so far.",
          "Learn More opens the full detail on one.",
        ],
        note:
          "“No performance history yet” means nothing has been recorded against your holdings so far, not that they are worth nothing. Projected return is a projection: it is what the offering document states, not a measurement of anything that has happened.",
      },
      {
        name: "Portfolio",
        purpose: "The detail behind the dashboard: every commitment you have made and what has come back.",
        steps: [
          "Invested and Received are totalled at the top.",
          "Each line shows the investment, what you committed, what has been returned and its current status.",
        ],
        note:
          "A commitment is created as pending and with nothing received against it — money paid back to you is recorded separately, as a distribution, so a commitment can never quietly declare itself part-paid.",
      },
      {
        name: "Opportunities",
        purpose: "Everything currently open, in full.",
        steps: [
          "Filter by All, Company Equity or Real Estate.",
          "Each opportunity shows its minimum investment, projected return, term, and how many investors are in.",
          "Key Benefits lists what the offering claims for itself.",
          "View Full Details & Invest opens the offering and the commitment form.",
        ],
        note:
          "Anything shown as a sample is exactly that, and the server refuses commitments against it — you will be told the listing is a sample rather than having a pledge recorded against terms that were written to fill a screen.",
      },
      {
        name: "Reports",
        purpose: "Your position summarised, and any analysis prepared for you.",
        steps: [
          "Position Summary totals capital invested, distributions received, current value, return to date, active investments, completed investments, distributions paid and documents held.",
          "Analysis Reports lists anything prepared for your account.",
        ],
        note: "“No analysis reports yet” means none have been produced for you. The position summary above it is always live.",
      },
      {
        name: "Distributions",
        purpose: "Every payment made to you against your commitments.",
        steps: [
          "Total received sits at the top.",
          "Each payment is listed with its date, description, amount and status.",
        ],
        note:
          "Only you and Black Phoenix can see this. Distribution records are written by Black Phoenix, never by an investor — a payment appears here because it was made, not because it was claimed.",
      },
      {
        name: "Documents",
        purpose: "The paperwork behind each investment, and anything waiting on your signature.",
        steps: [
          "Each document shows whether it is Signed or Awaiting signature.",
          "Open reads it.",
          "Signing is done here; there is nothing to print or post.",
        ],
        note:
          "Read these before committing rather than after. The terms in the document are the agreement; the projected return on the opportunity card is a summary of it.",
      },
      {
        name: "Fee Tracker",
        purpose: "Any subscription or fee arrangement attached to your account.",
        steps: [
          "The top panel shows the plan, its monthly fee and what has been used.",
          "Each logged item is listed with its date, description and cost.",
        ],
      },
      {
        name: "Plans & Add-ons",
        purpose: "Change what you subscribe to, or add extras.",
        steps: [
          "Your Active Plans shows what you hold.",
          "Take a standard tier, or describe what you need and have one proposed.",
        ],
      },
      {
        name: "Deals & Reels",
        purpose: "Offers and short videos from Black Phoenix and its partners.",
        steps: [
          "Featured reels play at the top; offers are listed below with what they include and when they end.",
        ],
      },
      {
        name: "Referral Rewards",
        purpose: "Your referral link and what it has earned.",
        steps: [
          "Copy Link, or share by email, SMS or WhatsApp.",
          "Rewards are 5% of project value, shown as Potential until the referred project is paid.",
        ],
      },
      {
        name: "Messages",
        purpose: "Your thread with the Black Phoenix team.",
        steps: [
          "Read the conversation, reply in the box, send.",
        ],
        note:
          "Anything about terms, timing or a distribution belongs here rather than in a phone call, because it stays attached to your account where it can be found again.",
      },
      {
        name: "Portal Guide",
        purpose: "This page.",
        steps: [
          "Each card above is one tab of your portal, in the order they run across the top.",
          "If a figure here does not match what you expected, ask in Messages rather than assuming — every number in this portal is counted from a record that can be shown to you.",
        ],
      },
    ],
  },
  property_manager: {
    title: "Your property management hub",
    summary:
      "Your portfolio, the work requests waiting on your decision, who to call out of hours, and the money either way. Approving a request is the action that actually starts work.",
    start:
      "Properties first — nothing else has anything to attach to until your portfolio is in. Then Work Requests, which is where decisions wait on you.",
    sections: [
      {
        name: "Dashboard",
        purpose: "The state of the portfolio and what needs a decision.",
        steps: [
          "Four figures across the top: total properties, active tenants, units managed and open work requests. All four are counted from your own records.",
          "Recent Work Requests lists what has come in; View All opens the tab.",
          "Properties lists your portfolio with units, occupancy and address.",
        ],
        note:
          "One of these used to be a Monthly Revenue card reading $45,200, typed into the page and sitting between three real counts, which is the arrangement that makes an invented figure believable. It is gone.",
      },
      {
        name: "Properties",
        purpose: "Your managed portfolio. Everything else in this portal hangs off it.",
        steps: [
          "Add property takes a property name, street address, total units and occupied units.",
          "Each property then shows its units, how many are occupied and its address.",
          "Total Units is summed across the portfolio.",
        ],
        note:
          "Keep occupied units current — it is what the active tenants figure counts, and it is the number an owner asks about first.",
      },
      {
        name: "Work Requests",
        purpose: "Requests assigned to you, waiting on your approval or rejection.",
        steps: [
          "Each request shows what is being asked for and its current status.",
          "Approve sends it forward to be scheduled and priced.",
          "Reject closes it.",
          "Your decision is saved on the request itself, not only on this screen.",
        ],
        note:
          "You only ever see requests assigned to your management account — the server filters them and checks again on the decision, so another manager's portfolio cannot appear here and you cannot act on one. Approving is what lets work actually begin, so a request sitting undecided is a job not happening.",
      },
      {
        name: "On-Call",
        purpose: "Who gets called out of hours, and for what.",
        steps: [
          "Set up one rota per kind of emergency — heating, water, lock-outs — rather than one rota for everything.",
          "For each, give the hours it covers and the people to ring, in order.",
          "A call that nobody answers escalates down the list.",
          "If you have no cover for something, it can be sent to Black Phoenix instead.",
        ],
        note:
          "This is your rota, not ours: your own people are called first, and Black Phoenix is the backup. Set up the escalation before you need it — the first night something floods is the wrong time to find out the list is empty.",
      },
      {
        name: "Plan Tracker",
        purpose: "Your maintenance plan: hours included, used and remaining, and what overage costs.",
        steps: [
          "Plan name, monthly fee, hours this period, hours remaining and the overage rate at the top.",
          "Every logged visit beneath, with its date, description, technician, hours and cost.",
          "Invoices & Payments covers bills raised against the plan.",
        ],
        note:
          "Hours are logged by Black Phoenix as work is completed. There is also a New Hampshire compliance note on this tab: RSA 331-A requires managers handling trust funds to keep a documentation trail, and this log is part of yours.",
      },
      {
        name: "Plans & Add-ons",
        purpose: "Change your plan or add extras.",
        steps: [
          "Your Active Plans shows what you hold.",
          "Take a standard tier, or describe your portfolio and have one built.",
          "Add to plan and Remove from plan assemble the package.",
        ],
      },
      {
        name: "CRM",
        purpose: "Tenants, owners, vendors and prospects, with the history of what was said.",
        steps: [
          "Add a contact and set what they are to you.",
          "Record interactions against them so the next conversation starts where the last one ended.",
          "Search across the whole list.",
        ],
      },
      {
        name: "Deals & Reels",
        purpose: "Offers and short videos from Black Phoenix and its partners.",
        steps: [
          "Featured reels play at the top; offers are listed beneath with what they include and when they end.",
        ],
      },
      {
        name: "Payments",
        purpose: "Payments and invoices between you and Black Phoenix.",
        steps: [
          "Each row is either a payment or an invoice, labelled as such.",
          "Each shows its reference, amount, date and status.",
        ],
        note: "This is the account between you and us. It is not rent collection and not owner disbursements.",
      },
      {
        name: "Investments",
        purpose: "Investment opportunities offered through Black Phoenix.",
        steps: [
          "All Opportunities lists what is available, with projected return, minimum and term.",
          "Invest Now opens the interest form.",
        ],
        note: "Submitting interest registers it and moves no money.",
      },
      {
        name: "Revenue AI",
        purpose: "Ways to earn more from the properties you already manage.",
        steps: [
          "Each programme — parking, bulk internet resale, EV charging, maintenance subscriptions, performance reports — shows a revenue range per property or unit, how hard it is to start, and a note on how it works in New Hampshire specifically.",
          "Open Full AI Revenue Analysis runs the detailed version against your own portfolio.",
        ],
        note:
          "The Portfolio Scenario panel is a worked example for three properties running three programmes, not a projection for your portfolio. Treat the +$20,640 as an illustration of how the arithmetic goes; the full analysis is the one that uses your properties.",
      },
      {
        name: "Messages",
        purpose: "Your thread with the Black Phoenix team.",
        steps: [
          "Read the conversation, reply in the box, send.",
          "The tab shows unread replies; opening it clears the count.",
        ],
        note: "Decisions about scope or cost belong here, attached to the account, rather than in a phone call nobody can look up later.",
      },
      {
        name: "Documents",
        purpose: "Your vault — management agreements, insurance, inspection reports, owner statements.",
        steps: [
          "Upload a file and give it a Category.",
          "Set “Related to” if it belongs to a property or reference.",
          "Search by name, project or reference.",
        ],
        note: "25MB per file. Visible to you and to Black Phoenix, nobody else.",
      },
      {
        name: "Settings",
        purpose: "Your name, email and notification preferences.",
        steps: [
          "Update the property manager name and email shown on your account.",
          "Save Changes commits them.",
        ],
      },
      {
        name: "Portal Guide",
        purpose: "This page.",
        steps: [
          "Each card above is one tab of your portal, in the order they run down the side.",
          "If a step stops matching the screen, say so in Messages.",
        ],
      },
    ],
  },
  condo_manager: {
    title: "Your condo management hub",
    summary:
      "The associations you manage, their units and owners, the work requests waiting on your decision, and the money moving through the account. Approving a request is what starts work.",
    start:
      "Associations first, then Units — nothing else has anything to attach to until the roster exists. Then Work Requests, where decisions wait on you.",
    sections: [
      {
        name: "Dashboard",
        purpose: "The state of the association and what needs a decision.",
        steps: [
          "Four figures across the top: total units, occupancy rate, HOA dues collected and open work requests. All four are counted from your own records.",
          "Recent Work Requests lists what has come in; View All opens the tab.",
          "Recent HOA Dues shows the latest payments received, with the unit, the owner and the amount.",
        ],
        note:
          "The dues total used to read $48K, typed into the page, while the dues panel beside it always said none had been recorded — the payments it needed were only fetched once you opened the Financials tab. Both now come from the same real records, loaded when the portal opens.",
      },
      {
        name: "Associations",
        purpose: "The associations you manage, who is on each one, and how many sub-portals your plan allows.",
        steps: [
          "Add an association with its name, address and number of units.",
          "Say what you are to it — property manager, or board president.",
          "Add members with their name, email, unit where it applies, and role.",
          "Sub-portals shows how many you have used against what your plan allows.",
        ],
        note:
          "An association may show “awaiting board” — that means no board president has yet confirmed who administers it. You can carry on working in the meantime; it is a record of authority, not a lock. Getting it confirmed matters because it is what puts the arrangement on record.",
      },
      {
        name: "Units",
        purpose: "The unit and owner roster. Occupancy and dues status live here.",
        steps: [
          "Add unit takes the unit number, the owner's name, whether it is occupied or vacant, and whether dues are current or overdue.",
          "Each unit shows those four things at a glance.",
        ],
        note:
          "Keep occupancy and dues current — the occupancy rate on the dashboard is computed from this roster, and it is the figure a board asks about first.",
      },
      {
        name: "Owners",
        purpose: "The owners behind the units, drawn from the same roster.",
        steps: [
          "Each owner is listed with their unit and its current status.",
        ],
      },
      {
        name: "Work Requests",
        purpose: "Requests assigned to you, waiting on your approval or rejection.",
        steps: [
          "Each request shows what is being asked for and its status.",
          "Approve sends it forward to be scheduled and priced; Reject closes it.",
          "The decision is written to the request itself, not only to this screen.",
        ],
        note:
          "You only see requests assigned to your management account. The server filters them and checks again when you decide, so another association's work cannot appear here and cannot be acted on. Work on the building's common areas and exterior belongs to the association; work inside a unit belongs to that owner — which account a request sits against decides who is billed for it.",
      },
      {
        name: "Plan Tracker",
        purpose: "Your maintenance plan: hours included, used and remaining, and what overage costs.",
        steps: [
          "Plan name, monthly fee, hours this period, hours remaining and the overage rate at the top.",
          "Every logged visit beneath, with its date, description, technician, hours and cost.",
        ],
        note:
          "This tab carries a New Hampshire note worth reading: RSA 356-B requires associations to keep common areas in good repair, and a logged service history is what supports a reserve-fund case and answers a board asking where the money went.",
      },
      {
        name: "Plans & Add-ons",
        purpose: "Change your plan or add extras.",
        steps: [
          "Your Active Plans shows what you hold.",
          "Take a standard tier, or describe the associations you manage and have one built.",
        ],
        note: "Your plan is also what sets how many sub-portals you may create, which the Associations tab shows.",
      },
      {
        name: "CRM",
        purpose: "Owners, tenants, vendors and prospects, with the history of what was said.",
        steps: [
          "Add a contact and set what they are to you.",
          "Record interactions so the next conversation starts where the last one ended.",
        ],
      },
      {
        name: "Deals & Reels",
        purpose: "Offers and short videos from Black Phoenix and its partners.",
        steps: [
          "Featured reels play at the top; offers are listed beneath with what they include and when they end.",
        ],
      },
      {
        name: "Financials",
        purpose: "The money between the association account and Black Phoenix.",
        steps: [
          "Verified Payments, Pending Payments and Open Invoice Balance are totalled at the top.",
          "Each payment and invoice is listed beneath with its amount, date and status.",
        ],
        note: "Pending means recorded but not yet verified. Do not treat it as collected when reporting to a board.",
      },
      {
        name: "Investments",
        purpose: "Investment opportunities offered through Black Phoenix.",
        steps: [
          "All Opportunities lists what is available, with projected return, minimum and term.",
          "Invest Now opens the interest form.",
        ],
        note: "Submitting interest registers it and moves no money.",
      },
      {
        name: "Revenue AI",
        purpose: "Ways for the association to earn, or to hold fees down.",
        steps: [
          "Each programme shows what it could bring in annually and what that means per unit in dues.",
          "Open Full AI Revenue Analysis runs the detailed version against your own associations.",
        ],
        note:
          "The Condo Fee Impact panel is a worked example for 180 units running two programmes — an illustration of how the arithmetic goes, not a projection for your association. The tab also carries a note on RSA 356-B and what a manager may decide without a board vote, which is worth reading before proposing any of it.",
      },
      {
        name: "Messages",
        purpose: "Your thread with the Black Phoenix team.",
        steps: [
          "Read the conversation, reply in the box, send.",
          "The tab shows unread replies; opening it clears the count.",
        ],
        note: "Anything a board might later ask you to evidence belongs here rather than in a phone call.",
      },
      {
        name: "Documents",
        purpose: "Your vault — bylaws, insurance, minutes, reserve studies, inspection reports.",
        steps: [
          "Upload a file and give it a Category.",
          "Set “Related to” if it belongs to an association or reference.",
          "Search by name, project or reference.",
        ],
        note: "25MB per file. Visible to you and to Black Phoenix, nobody else.",
      },
      {
        name: "Settings",
        purpose: "Your name, email and notification preferences.",
        steps: [
          "Update the condo manager name and email shown on your account.",
          "Save Changes commits them.",
        ],
      },
      {
        name: "Portal Guide",
        purpose: "This page.",
        steps: [
          "Each card above is one tab of your portal, in the order they run down the side.",
          "If a step stops matching the screen, say so in Messages.",
        ],
      },
    ],
  },
  landlord: { title: "Your landlord portal guide", summary: "Keep properties, tenants, maintenance decisions, CRM records, plan usage, and financial activity together.", start: "Start with Maintenance to act on requests, then keep Properties and Tenants updated.", sections: [{ name: "Properties & tenants", detail: "Maintain your portfolio and tenant roster.", status: "Portfolio management" }, { name: "Maintenance", detail: "Review, approve, or reject work requests assigned to you.", status: "Maintenance workflow" }, { name: "CRM & financials", detail: "Track relationships, payments, invoices, and plan information.", status: "Account records" }, { name: "Messages & settings", detail: "Coordinate with Black Phoenix and manage preferences.", status: "Collaboration" }] },
  territory: { title: "Your territory owner portal", summary: "Manage customer and subcontractor activity, work pipeline, subscriptions, CRM, analytics, referrals, and territory operations.", start: "Review Pipeline for work activity, then use Customers and Subcontractors to manage your network.", sections: [{ name: "Pipeline & analytics", detail: "Track request movement and territory performance.", status: "Territory operations" }, { name: "Customers & subcontractors", detail: "Manage the people and partners in your territory.", status: "Network management" }, { name: "Subscriptions & plans", detail: "Review account plan activity and member benefits.", status: "Recurring services" }, { name: "CRM, deals & referrals", detail: "Grow relationships and track referrals.", status: "Growth tools" }] },
  condo_association: { title: "Your condo association portal", summary: "Review maintenance, approvals, financials, units, vendors, documents, team access, and referral tools.", start: "Start with Maintenance and Approvals, then use Units and Documents to keep the association organized.", sections: [{ name: "Maintenance & approvals", detail: "Submit and review association work requests.", status: "Association care" }, { name: "Financials & vendors", detail: "Review financial details and vendor activity.", status: "Operations control" }, { name: "Units, documents & team", detail: "Maintain association records and collaboration resources.", status: "Association records" }, { name: "Deals & referrals", detail: "Access member opportunities and referral benefits.", status: "Member benefits" }] },
  admin: {
    title: "Your operations portal guide",
    summary:
      "The portal you run the company from: provisioning everybody else's access, dispatching the work to your field team, watching what they are paying, and publishing job photos.",
    start:
      "Create Portal is the tab that matters most: it is how every other person on this platform gets in. Sent Invites tells you whether they actually did.",
    sections: [
      {
        name: "Overview",
        purpose: "The landing view: job photos, the alert and ticket panels, and the way through to the Unified Dashboard.",
        steps: [
          "Job photos sits at the top. Add job photos uploads straight from here — the files go to the gallery and stay private until you publish them.",
          "Manage & publish opens the job photos page, where you choose which ones appear on the website.",
          "Critical Alerts, Recent Tickets and Pending Employee Support summarise the three support tabs; View All opens the tab behind each.",
          "Analytics at the bottom opens the Unified Dashboard \u2014 users, revenue and platform performance together.",
        ],
        note:
          "There used to be three cards here \u2014 User Management, Revenue Analytics and System Analytics \u2014 which all opened the same page. They are now the one card that page deserves. The Critical Alerts panel is live; Recent Tickets and Pending Employee Support still summarise sample data, for the reason given on those two tabs.",
      },
      {
        name: "Create Portal",
        purpose: "How every other person on this platform gets an account. This is the most important tab in the portal.",
        steps: [
          "Enter their full name, email and phone number.",
          "Choose the portal type: Customer, Landlord, Property Manager, Condo Manager, Vendor, Subcontractor, Employee, Advertiser, Investor or Territory Owner.",
          "Decide on “Grant full access to all features”. Left on, they get complete control of every feature for the trial window, then must choose a plan to keep access.",
          "Set the trial length in months — anything from 1 to 24; it starts at 6.",
          "Choose how the invite reaches them: email the secure sign-in link, text it by SMS, generate a QR code, or any combination.",
          "Preview email shows exactly what they will receive, before you send it.",
          "Create portal & send sign-in link provisions the account and sends it.",
          "The result panel confirms each channel separately and gives you Copy sign-in link, Copy email and Download QR code.",
        ],
        note:
          "Tenants are deliberately missing from the portal type list. A tenant is invited by their landlord, from the Tenants tab of the landlord portal, because the landlord holds the relationship — a tenant invited by us has no landlord attached and their work requests route nowhere. If a send fails, the panel prints the provider's exact reason with a Copy reason button; that reason is the thing to act on, not a retry.",
      },
      {
        name: "Sent Invites",
        purpose: "Whether the people you invited actually got in — the other half of Create Portal.",
        steps: [
          "Total sent and Awaiting are counted at the top.",
          "Each invite carries a status: Accepted, “Invited · awaiting”, or Needs attention.",
          "Search by name, email, phone or portal to find one.",
          "Resend email sends the sign-in link again; Text sends it by SMS instead.",
          "Refresh pulls the latest state in.",
        ],
        note:
          "“Needs attention” means the send itself did not succeed — that person has never received a link and is not waiting on you, they are stuck. Work that list before it grows.",
      },
      {
        name: "Dispatch Center",
        purpose:
          "The board where real work requests are assigned to the field team. Assigning here is what lets a technician bill time to the job.",
        steps: [
          "The four counters across the top are Unassigned, Assigned, In Progress and Completed; the filter buttons below narrow the list to one of them.",
          "Every work request on the platform appears here \u2014 the same records the pipeline and the customer\u2019s own Projects tab show, not a copy.",
          "Click a work order to expand it and see the address, trade, priority, submitted time and notes.",
          "Dispatch (or Reassign) lists the field team with their trade and whether they are available or on a job right now. Pick one and the job is assigned.",
          "The status dropdown moves a job between Unassigned, Assigned, In Progress and Completed, and the change is written to the request itself.",
          "Inside an expanded job: Call dials the customer\u2019s number, Text messages the assigned technician, and Flag Urgent raises the priority for good.",
          "Field Team down the side lists everyone with their trade, whether they are clocked in, and their phone number; clicking the number copies it.",
        ],
        note:
          "Assigning is the step that matters most, and not only for the schedule: it records the technician\u2019s email and id against the job, and the employee portal uses exactly those to decide which jobs that person may bill hours to. A job nobody is assigned to cannot be billed against. An empty board means no work requests exist yet, not that the board is broken.",
      },
      {        name: "Maintenance Plans",
        purpose: "Every maintenance plan on the platform, who holds it, and what it is worth.",
        steps: [
          "The cards across the top are Total Plans, Active, MRR, Gift Cards Issued, and Hours Used against hours included.",
          "The table lists each plan with its owner, portal, monthly price, hours and status.",
          "The Links column expands to show the gift cards, promotions and offers attached to that plan, with their codes.",
          "Search covers plans, owners, service, gift codes and promo codes together, so a code somebody quotes you finds the plan it belongs to.",
          "Refresh reloads from the server.",
        ],
        note:
          "This is real data. MRR here is the recurring plan revenue only — it does not include store orders or one-off construction work.",
      },
      {
        name: "System Alerts",
        purpose: "What the platform has raised for your attention.",
        steps: [
          "Filter by All, Critical, Warning or Unread.",
          "Each alert shows its type, where it came from, the message, and when it fired.",
        ],
        note:
          "This reads the same alert store the rest of the platform writes into \u2014 dispatching a work order appends to it, so the two tabs are one system seen from both ends. An empty list means nothing has raised an alert, which on a quiet platform is the correct answer.",
      },
      {        name: "Customer Service",
        purpose: "Intended as the customer ticket queue.",
        steps: [
          "The table lists customer, subject, priority, status, who it is assigned to and when it last moved.",
          "Search tickets narrows the list.",
          "New Ticket raises one.",
        ],
        note:
          DEMO_TAB +
          " Real customer conversations are in the Messages tab of each customer's own portal, and those are live.",
      },
      {
        name: "Employee Support",
        purpose: "Intended as the internal queue for staff requests.",
        steps: [
          "The table lists employee, department, category, subject, status and created date.",
          "Search requests narrows the list; New Request raises one.",
        ],
        note: DEMO_TAB,
      },
      {
        name: "Investments",
        purpose: "The same investment opportunities customers and investors see, from your side.",
        steps: [
          "All Opportunities lists what is published, searchable by name, location or category.",
          "Each card shows projected ROI, the minimum and the term.",
          "My Investments and Recent Distributions show holdings and what has been paid out.",
        ],
        note:
          "Anything marked “SAMPLE — not a real offer” is an illustration of the format. Before inviting an investor, check that what they will see is what you meant to publish.",
      },
      {
        name: "Documents",
        purpose: "The company document vault.",
        steps: [
          "Upload a file and give it a Category.",
          "Set “Related to” to file it against a project or reference.",
          "Search by name, project or reference.",
        ],
        note: "25MB per file.",
      },
      {
        name: "Portal Guide",
        purpose: "This page.",
        steps: [
          "Each card above is one tab of this portal, in the order they run down the side.",
          "Where a tab says it is a demonstration layout, that is the current truth about it and not a warning about your data.",
        ],
        note:
          "The guides for the other portals are written the same way, from each portal's real tabs. If a step here stops matching the screen, the step is the thing that is wrong.",
      },
    ],
  },
};
