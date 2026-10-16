/**
 * Security — public, standalone trust page.
 * Linked from the global footer and the landing page. Route keys: security,
 * trust, security-policy.
 *
 * WHAT THIS PAGE IS FOR
 *
 * Three audiences ask the same questions and currently get no answer: a
 * property manager deciding whether to put their tenants' records in here, an
 * enterprise customer's IT reviewer, and an acquirer's diligence checklist.
 * "Where is the data, is it encrypted, who can reach it, have you been tested"
 * is the standard set, and a company that cannot answer it in writing looks
 * like one that has not thought about it.
 *
 * TWO RULES FOR EDITING THIS FILE
 *
 * 1. EVERY CLAIM HERE MUST BE TRUE AND VERIFIABLE TODAY. This page is a set of
 *    representations to customers; a buyer who finds one of them false has
 *    found something far worse than the gap it was covering. Each statement
 *    below was confirmed against production on 2026-10-16 — see
 *    tasks/security-audit-2026-10-16.md for how each one was tested. If a
 *    control changes, change the line. Do not let it drift.
 *
 * 2. NOTHING HERE MAY HELP AN ATTACKER. Describe the shape of a control, never
 *    its configuration: "authorisation is default-deny" is fine, naming which
 *    routes are exempt is not. No version numbers, no endpoint paths, no
 *    internal table names, no open findings.
 *
 * The ROADMAP block is deliberately public. A trust page that lists what is
 * still being built reads as honest and is far more persuasive than boilerplate
 * claiming everything is finished — and the alternative, implying we already
 * have a penetration test, is a lie we would be held to.
 */
import {
  Shield, Home, Lock, Server, KeyRound, CreditCard, Globe2,
  FileCheck, Mail, CheckCircle2, CircleDashed,
} from 'lucide-react';

const COMPANY = 'Black Phoenix Builds';
const SECURITY_EMAIL = 'security@blackphoenixbuilds.com';
const LAST_REVIEWED = 'October 16, 2026';

/** The questions every diligence checklist opens with, answered in one line each. */
const QUICK_ANSWERS: Array<{ icon: typeof Shield; q: string; a: string }> = [
  {
    icon: Globe2,
    q: 'Where is our data stored?',
    a: 'In the United States — Amazon Web Services, Northern Virginia (us-east-1). Databases, files, and accounts all reside there.',
  },
  {
    icon: Lock,
    q: 'Is it encrypted?',
    a: 'Yes. TLS 1.2+ in transit on every connection, and AES-256 at rest for the database, file storage, and backups.',
  },
  {
    icon: KeyRound,
    q: 'Who can see my records?',
    a: 'Only you and the people you grant access to. Isolation is enforced in the database itself, not only in the application.',
  },
  {
    icon: CreditCard,
    q: 'Do you store card numbers?',
    a: 'No. Payments are handled entirely by Stripe. Full card numbers never reach our servers and we never see them.',
  },
];

/**
 * Honest status. `done` means in place and verified today; `building` means
 * committed and under way. Nothing is listed as done that is not.
 */
const ROADMAP: Array<{ status: 'done' | 'building'; label: string; detail: string }> = [
  {
    status: 'done',
    label: 'Default-deny authorisation',
    detail: 'Every endpoint requires a verified session unless it has been deliberately and individually published. A new feature is private because nobody listed it, rather than exposed because nobody remembered to guard it.',
  },
  {
    status: 'done',
    label: 'Database-level tenant isolation',
    detail: 'Row-level security on every table holding customer data. A flaw in application code cannot by itself expose another account’s records.',
  },
  {
    status: 'done',
    label: 'Server-authoritative pricing and payments',
    detail: 'Prices, tax, and totals are computed from our own records. Nothing a browser sends can change what is charged, and payment events are accepted only with a verified cryptographic signature from Stripe.',
  },
  {
    status: 'done',
    label: 'Privilege separation',
    detail: 'An account’s role is read only from fields the account holder cannot write. Retired versions of our API are fully decommissioned rather than left running.',
  },
  {
    status: 'building',
    label: 'Continuous automated security scanning',
    detail: 'Dependency, static-analysis, and secret scanning on every change, with an automated check after each deployment that re-tests the access controls described on this page.',
  },
  {
    status: 'building',
    label: 'Independent penetration test',
    detail: 'An annual third-party test of the platform. We have not yet commissioned one, and we would rather say so here than imply otherwise.',
  },
  {
    status: 'building',
    label: 'Multi-factor authentication',
    detail: 'MFA for administrator accounts first, then available to every portal account.',
  },
  {
    /**
     * Written, not finished — and the status stays amber until it is.
     *
     * docs/security/incident-response.md exists as of 2026-10-16 and is
     * followable today. What it still lacks is a lawyer on retainer, a cyber
     * insurance policy, and a completed access inventory. Flipping this to
     * "In place" on the strength of a document would be the exact kind of
     * claim this page must not make: a reviewer who asks for the plan and
     * finds three blank contact rows has caught us overstating, which costs
     * more than the blank rows did.
     */
    status: 'building',
    label: 'Incident response plan',
    detail: 'A written plan covering severity classification, evidence preservation, containment, and customer notification — including the timelines required by New Hampshire RSA 359-C:20 — is in place internally. Remaining: retained legal counsel and a completed access review.',
  },
];

/**
 * The subprocessor list, and the reason it names a country for each.
 *
 * "Is any of our data processed outside the United States?" is a question with
 * a yes in it, and the yes is fulfilment: shipping a physical order requires
 * giving the supplier a name and an address. Disclosing that plainly costs
 * nothing. Being caught not disclosing it costs a sale.
 */
const SUBPROCESSORS: Array<{ name: string; purpose: string; region: string; offshore?: boolean }> = [
  { name: 'Supabase / Amazon Web Services', purpose: 'Database, file storage, authentication', region: 'United States' },
  { name: 'Vercel', purpose: 'Website delivery', region: 'United States' },
  { name: 'Stripe', purpose: 'Payment processing and payouts', region: 'United States' },
  { name: 'OpenAI, Anthropic', purpose: 'AI features — estimates, drafting, assistants', region: 'United States' },
  { name: 'Resend', purpose: 'Transactional email', region: 'United States' },
  { name: 'Twilio', purpose: 'SMS notifications', region: 'United States' },
  { name: 'CJ Dropshipping', purpose: 'Store order fulfilment — receives the recipient name and shipping address for physical orders only', region: 'China', offshore: true },
  { name: 'MapTiler', purpose: 'Directory maps', region: 'European Union' },
  { name: 'Regrid', purpose: 'Public property parcel records', region: 'United States' },
];

interface SecurityProps {
  onNavigate?: (page: string) => void;
}

export default function Security({ onNavigate }: SecurityProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-[#ea580c]/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#ea580c]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Security</h1>
            <p className="text-sm text-gray-400">Last reviewed: {LAST_REVIEWED}</p>
          </div>
        </div>

        <div className="mt-6 space-y-10 text-[15px] leading-relaxed text-gray-300">

          <section>
            <p>
              {COMPANY} holds information that matters to the people who trust us with
              it — customer addresses, tenant records, invoices, and payment history.
              This page sets out how that information is protected, where it lives, and
              who can reach it. It also sets out, plainly, what we are still building.
            </p>
          </section>

          {/* The four questions everyone asks first */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">The short answers</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {QUICK_ANSWERS.map(({ icon: Icon, q, a }) => (
                <div key={q} className="rounded-xl border border-[#2A2A2A] bg-[#121212] p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-4 h-4 text-[#ea580c] flex-shrink-0" />
                    <h3 className="text-sm font-semibold text-white">{q}</h3>
                  </div>
                  <p className="text-sm text-gray-400">{a}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Server className="w-4 h-4 text-[#ea580c]" /> Where your data lives
            </h2>
            <p>
              All primary data is stored in the United States, in Amazon Web Services'
              Northern Virginia region, through our hosting provider Supabase. That
              includes the database, uploaded files and photographs, and account records.
              Our website is served from United States infrastructure, with only static
              files — images, scripts, stylesheets — distributed through a global
              content network. No customer data is held at the network edge.
            </p>
            <p className="mt-3">
              Some information is passed to the service providers listed further down
              this page so that they can do the job we use them for. One of them,
              our store fulfilment partner, operates outside the United States; that is
              stated explicitly in the table rather than buried.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#ea580c]" /> Encryption
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-white">In transit:</strong> every connection to
                our website and API is encrypted with TLS 1.2 or better. Unencrypted
                requests are redirected, and browsers are instructed to refuse
                unencrypted connections to our domain for two years after their first
                visit.
              </li>
              <li>
                <strong className="text-white">At rest:</strong> the database, file
                storage, and all automated backups are encrypted with AES-256 by the
                hosting platform.
              </li>
              <li>
                <strong className="text-white">Credentials:</strong> passwords are
                stored only as salted one-way hashes. Nobody at {COMPANY} can read
                your password, and we will never ask you for it.
              </li>
              <li>
                <strong className="text-white">Third-party keys:</strong> API keys and
                signing secrets are held in the hosting platform's encrypted secret
                store. None is committed to source code.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#ea580c]" /> Access control
            </h2>
            <p>
              Separation between accounts is enforced in two independent places, so
              that a mistake in one does not expose anything on its own.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-3">
              <li>
                <strong className="text-white">In the application:</strong> authorisation
                is default-deny. Every endpoint requires a verified session unless it has
                been deliberately published — a public price list, for example. New
                functionality is private by default rather than exposed by oversight.
              </li>
              <li>
                <strong className="text-white">In the database:</strong> row-level
                security policies restrict every table of customer data to the account
                that owns it. These run inside the database engine, beneath the
                application.
              </li>
              <li>
                <strong className="text-white">Roles cannot be self-assigned:</strong> an
                account's permissions are read only from fields that the account holder
                has no ability to modify.
              </li>
              <li>
                <strong className="text-white">Shared links are real credentials:</strong>{' '}
                links we send for quotes, approvals, and applications carry
                cryptographically random tokens that expire, can be revoked, and are
                stored only as hashes.
              </li>
              <li>
                <strong className="text-white">Old systems are shut off, not left
                running:</strong> previous versions of our API have been fully
                decommissioned and refuse all requests.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#ea580c]" /> Payments
            </h2>
            <p>
              Card payments are processed entirely by Stripe, a PCI-DSS Level 1 service
              provider. Card details are entered directly into Stripe's own hosted
              fields and never pass through or rest on our servers — we hold only a
              reference to the transaction, the last four digits, and the amount.
            </p>
            <p className="mt-3">
              Every price, tax figure, and total is calculated on our servers from our
              own records. Nothing submitted by a web browser can alter what is charged.
              Payment confirmations from Stripe are accepted only when they carry a valid
              cryptographic signature and arrive within a short time window, and they are
              re-confirmed directly with Stripe before any order is fulfilled.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#ea580c]" /> Where we are, and what we are building
            </h2>
            <p className="mb-4">
              Security is not a state a company arrives at. Below is what is in place
              today and what is in progress — listed honestly, because a page that
              claimed everything was finished would not be worth reading.
            </p>
            <div className="space-y-2.5">
              {ROADMAP.map(({ status, label, detail }) => (
                <div key={label} className="flex gap-3 rounded-xl border border-[#2A2A2A] bg-[#121212] p-4">
                  {status === 'done'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden />
                    : <CircleDashed className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden />}
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {label}
                      <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider ${status === 'done' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {status === 'done' ? 'In place' : 'In progress'}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-[#ea580c]" /> Service providers
            </h2>
            <p className="mb-4">
              We do not sell personal information. We share it only with the providers
              below, each of which is contractually required to protect it and to use it
              only to deliver the service we engage them for.
            </p>
            <div className="overflow-x-auto rounded-xl border border-[#2A2A2A]">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="bg-[#121212] text-left">
                    <th className="px-4 py-2.5 font-semibold text-white">Provider</th>
                    <th className="px-4 py-2.5 font-semibold text-white">Purpose</th>
                    <th className="px-4 py-2.5 font-semibold text-white">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {SUBPROCESSORS.map(({ name, purpose, region, offshore }) => (
                    <tr key={name} className="border-t border-[#2A2A2A] align-top">
                      <td className="px-4 py-2.5 text-white whitespace-nowrap">{name}</td>
                      <td className="px-4 py-2.5 text-gray-400">{purpose}</td>
                      <td className={`px-4 py-2.5 whitespace-nowrap ${offshore ? 'text-amber-400' : 'text-gray-400'}`}>
                        {region}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-gray-400">
              Processing outside the United States is limited to store order fulfilment,
              shown in amber above, and involves only the recipient name and shipping
              address needed to deliver a physical parcel.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#ea580c]" /> Reporting a vulnerability
            </h2>
            <p>
              If you believe you have found a security problem, please tell us at{' '}
              <a href={`mailto:${SECURITY_EMAIL}`} className="text-[#ea580c] hover:underline">
                {SECURITY_EMAIL}
              </a>
              . Include enough detail to reproduce it. We will acknowledge your report
              within three business days and keep you informed until it is resolved.
            </p>
            <p className="mt-3">
              We will not pursue legal action against anyone who reports a problem in
              good faith, gives us a reasonable opportunity to fix it before disclosing
              it publicly, and does not access, alter, or delete other people's data
              while investigating.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">Questions</h2>
            <p>
              For a security questionnaire, a data processing agreement, or anything
              else your review requires, write to{' '}
              <a href={`mailto:${SECURITY_EMAIL}`} className="text-[#ea580c] hover:underline">
                {SECURITY_EMAIL}
              </a>{' '}
              and we will answer it. See also our{' '}
              <button
                onClick={() => onNavigate?.('privacy-policy')}
                className="text-[#ea580c] hover:underline"
              >
                Privacy Policy
              </button>{' '}
              and{' '}
              <button
                onClick={() => onNavigate?.('terms-of-service')}
                className="text-[#ea580c] hover:underline"
              >
                Terms of Service
              </button>
              .
            </p>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t border-[#2A2A2A]">
          <button
            onClick={() => onNavigate?.('directory-landing-page')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-gray-300 hover:text-white transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
