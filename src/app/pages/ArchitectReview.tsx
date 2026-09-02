/**
 * What the architect opens.
 *
 * They have no account here and will not be getting one — see
 * architect-review.tsx for why. So this page authenticates nothing, holds no
 * session, and reads exactly one snapshot by the token in the URL.
 *
 * IT IS WRITTEN TO BE TRUSTED
 *
 * An unexpected link asking a professional to approve a construction document
 * looks like phishing, and a reviewer who is unsure quietly does nothing. So it
 * says who sent it, what it is, when it expires, and that they are being asked
 * to answer once. Nothing on the page asks for a password, a payment, or
 * anything beyond a name and an opinion.
 *
 * ONE ANSWER
 *
 * The server refuses a second response, so an approval on the record cannot be
 * overwritten later. The page says that before they commit rather than after.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  FileCheck2, Loader2, Check, AlertTriangle, ShieldCheck, HelpCircle, Clock,
} from 'lucide-react';
import { projectId as supabaseProjectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Member {
  id: string; role: string; location: string; size: string;
  count?: number; spacingIn?: number; spanFt?: number; loadPlf?: number;
  utilisation?: number; deflectionRatio?: number; note?: string;
}
interface Question { id: string; question: string; assumedAnswer?: string; ifWrong?: string }
interface Response {
  verdict: 'approved' | 'changes-requested';
  reviewer: string; credential?: string; comments: string; respondedAt: string;
}
interface View {
  title: string; revision: number; siteAddress?: string; state: string;
  members: Member[]; assumptions: Record<string, any>; questions: Question[];
  standingDetails: string[]; calcWarnings: string[];
  preparedBy?: string; preparedOn?: string;
}

const ASSUMPTION_ORDER: Array<[string, string, string]> = [
  ['codeEdition', 'Code edition', ''],
  ['groundSnowPsf', 'Ground snow', ' psf'],
  ['liveLoadPsf', 'Live load', ' psf'],
  ['deadLoadPsf', 'Dead load', ' psf'],
  ['species', 'Species and grade', ''],
  ['deflectionLimit', 'Deflection limit', ''],
  ['soilBearingPsf', 'Soil bearing', ' psf'],
  ['frostDepthIn', 'Frost depth', ' in'],
];

/**
 * The token rides in the path — /architect-review/<token>.
 *
 * Read here rather than passed in, because the route registry hands pages no
 * props and a token in a query string is more likely to be logged by whatever
 * sits in front of the app.
 */
function tokenFromPath(): string {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[0] === 'architect-review' ? decodeURIComponent(parts[1] || '') : '';
}

export default function ArchitectReview({ token: given }: { token?: string } = {}) {
  const [token] = useState(() => given || tokenFromPath());
  const [view, setView] = useState<View | null>(null);
  const [response, setResponse] = useState<Response | null>(null);
  const [issuedBy, setIssuedBy] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  const [reviewer, setReviewer] = useState('');
  const [credential, setCredential] = useState('');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/architect-review/review/${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFatal(data?.error || 'This review link is not valid. Ask for a new one.');
        return;
      }
      setView(data.view);
      setResponse(data.response || null);
      setIssuedBy(data.issuedBy || null);
      setExpiresAt(data.expiresAt || null);
    } catch {
      setFatal('This review link could not be opened.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const respond = async (verdict: 'approved' | 'changes-requested') => {
    if (!reviewer.trim()) { setFatal(null); alert('Please give your name.'); return; }
    if (verdict === 'changes-requested' && !comments.trim()) {
      alert('Please say what needs changing — a rejection with no reason cannot be acted on.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${SERVER}/architect-review/review/${encodeURIComponent(token)}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ verdict, reviewer: reviewer.trim(), credential: credential.trim(), comments: comments.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { alert(data?.error || 'That could not be recorded.'); return; }
      setResponse(data.response);
    } catch {
      alert('That could not be recorded.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={wrap}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#ea580c' }} />
      </div>
    );
  }

  if (fatal || !view) {
    return (
      <div style={wrap}>
        <div style={{ ...panel, maxWidth: 460, textAlign: 'center' }}>
          <AlertTriangle className="w-8 h-8" style={{ color: '#f59e0b', margin: '0 auto 12px' }} />
          <p style={{ color: '#e5e7eb', fontSize: 15 }}>{fatal || 'Not available.'}</p>
          <p style={{ color: '#6b7280', fontSize: 12.5, marginTop: 8 }}>
            Review links expire and can be withdrawn. Ask whoever sent it for a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...wrap, alignItems: 'flex-start', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 860 }}>

        {/* Who sent it, first. An unexpected link asking a professional to
            approve a document looks like phishing until it says otherwise. */}
        <div style={{ ...panel, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <FileCheck2 className="w-5 h-5" style={{ color: '#ea580c' }} />
            <h1 style={{ fontSize: 19, fontWeight: 800, color: '#fff', margin: 0 }}>
              {view.title}
            </h1>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
              Revision {view.revision}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
            Black Phoenix Builds{issuedBy ? ` (${issuedBy})` : ''} has asked you to review this
            framing submittal{view.siteAddress ? ` for ${view.siteAddress}` : ''}.
            You are not being asked to sign in or to pay for anything — a name and an opinion.
          </p>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 0,
                      display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock className="w-3.5 h-3.5" />
            This link stops working on{' '}
            {expiresAt ? new Date(expiresAt).toLocaleDateString() : 'its expiry date'}, and
            it takes one answer.
          </p>
        </div>

        {/* Assumptions before the schedule, because nothing below can be
            checked without them. */}
        <Section title="What these numbers assumed">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
            {ASSUMPTION_ORDER.map(([key, label, unit]) => {
              const raw = view.assumptions?.[key];
              const missing = raw === undefined || raw === null || raw === '';
              const shown = missing ? 'not stated'
                : key === 'deflectionLimit' ? `L/${raw}` : `${raw}${unit}`;
              return (
                <div key={key} style={{
                  borderRadius: 12, padding: 8,
                  border: `1px solid ${missing ? 'rgba(245,158,11,0.3)' : '#2A2A2A'}`,
                  background: missing ? 'rgba(245,158,11,0.05)' : '#0A0A0A',
                }}>
                  <p style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: '2px 0 0',
                              color: missing ? '#fcd34d' : '#fff' }}>{shown}</p>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Member schedule">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #2A2A2A' }}>
                  <th style={th}>Where</th><th style={th}>Size</th>
                  <th style={{ ...th, textAlign: 'right' }}>Span</th>
                  <th style={{ ...th, textAlign: 'right' }}>Load</th>
                  <th style={{ ...th, textAlign: 'right' }}>Utilisation</th>
                  <th style={{ ...th, textAlign: 'right' }}>Deflection</th>
                </tr>
              </thead>
              <tbody>
                {view.members.map(m => {
                  const passes = typeof m.utilisation === 'number' ? m.utilisation <= 1 : null;
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #1A1A1A' }}>
                      <td style={td}>
                        {m.location}
                        {m.spacingIn ? <span style={{ color: '#6b7280' }}> @ {m.spacingIn}in</span> : null}
                      </td>
                      <td style={{ ...td, color: '#fff', fontWeight: 600 }}>
                        {m.count && m.count > 1 ? `${m.count}× ` : ''}{m.size}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>{m.spanFt !== undefined ? `${m.spanFt} ft` : '—'}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{m.loadPlf !== undefined ? `${m.loadPlf} plf` : '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700,
                                   color: passes === false ? '#f87171' : passes ? '#34d399' : '#6b7280' }}>
                        {m.utilisation !== undefined ? m.utilisation.toFixed(2) : 'not calculated'}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {m.deflectionRatio !== undefined ? `L/${m.deflectionRatio}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11.5, color: '#6b7280', marginTop: 10, marginBottom: 0 }}>
            Bending taken as M = wL²/8 against section modulus; deflection as 5wL⁴/384EI.
            Utilisation is the worse of the two as a fraction of allowable.
          </p>
        </Section>

        {view.calcWarnings.length > 0 && (
          <Section title="Raised by the calculation">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {view.calcWarnings.map((w, i) => (
                <li key={i} style={{ fontSize: 13, color: '#fcd34d', marginBottom: 4 }}>{w}</li>
              ))}
            </ul>
          </Section>
        )}

        {view.standingDetails.length > 0 && (
          <Section title="How this contractor builds" icon={ShieldCheck}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {view.standingDetails.map((d, i) => (
                <li key={i} style={{ fontSize: 13, color: '#d1d5db', marginBottom: 6 }}>{d}</li>
              ))}
            </ul>
          </Section>
        )}

        {view.questions.length > 0 && (
          <Section title="What we would like a ruling on" icon={HelpCircle}>
            {view.questions.map(q => (
              <div key={q.id} style={{
                borderRadius: 12, border: '1px solid #2A2A2A', background: '#0A0A0A',
                padding: 10, marginBottom: 8,
              }}>
                <p style={{ fontSize: 13.5, color: '#fff', margin: 0, fontWeight: 600 }}>{q.question}</p>
                {q.assumedAnswer && (
                  <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '4px 0 0' }}>
                    Assumed in the meantime: {q.assumedAnswer}
                  </p>
                )}
                {q.ifWrong && (
                  <p style={{ fontSize: 12.5, color: '#fcd34d', margin: '2px 0 0' }}>
                    If that is wrong: {q.ifWrong}
                  </p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* ── the answer ── */}
        {response ? (
          <div style={{
            ...panel,
            border: `1px solid ${response.verdict === 'approved' ? 'rgba(52,211,153,0.35)' : 'rgba(245,158,11,0.35)'}`,
            background: response.verdict === 'approved' ? 'rgba(52,211,153,0.06)' : 'rgba(245,158,11,0.06)',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0,
                         color: response.verdict === 'approved' ? '#34d399' : '#fcd34d' }}>
              {response.verdict === 'approved' ? 'Approved' : 'Changes requested'}
            </h2>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '4px 0 0' }}>
              Recorded from {response.reviewer}{response.credential ? `, ${response.credential}` : ''} on{' '}
              {new Date(response.respondedAt).toLocaleDateString()}. Thank you — nothing else is needed.
            </p>
            {response.comments && (
              <p style={{ fontSize: 13, color: '#d1d5db', marginTop: 10, whiteSpace: 'pre-wrap' }}>
                {response.comments}
              </p>
            )}
          </div>
        ) : (
          <div style={panel}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>Your answer</h2>
            <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '0 0 12px' }}>
              This is recorded once and cannot be changed afterwards. If you need to revise it,
              ask for a new link rather than sending a correction — an approval that can be
              edited later is worth nothing to either of us.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginBottom: 8 }}>
              <input value={reviewer} onChange={e => setReviewer(e.target.value)}
                placeholder="Your name" style={inputStyle} />
              <input value={credential} onChange={e => setCredential(e.target.value)}
                placeholder="Licence or firm (optional)" style={inputStyle} />
            </div>
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={4}
              placeholder="Comments, conditions, or what needs changing…"
              style={{ ...inputStyle, width: '100%', resize: 'vertical', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => respond('approved')} disabled={busy}
                style={{ ...btn, background: '#059669', opacity: busy ? 0.5 : 1 }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve
              </button>
              <button onClick={() => respond('changes-requested')} disabled={busy}
                style={{ ...btn, background: '#b45309', opacity: busy ? 0.5 : 1 }}>
                <AlertTriangle className="w-4 h-4" /> Request changes
              </button>
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, color: '#4b5563', textAlign: 'center', marginTop: 20 }}>
          Black Phoenix Builds · this page shows one submittal and nothing else about the project.
        </p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: any }) {
  return (
    <div style={{ ...panel, marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 0 10px',
                   display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon className="w-4 h-4" style={{ color: '#ea580c' }} />}
        {title}
      </h2>
      {children}
    </div>
  );
}

const wrap: any = {
  minHeight: '100vh', background: '#0A0A0A', display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 16,
};
const panel: any = {
  background: '#111', border: '1px solid #2A2A2A', borderRadius: 16, padding: 16,
};
const th: any = { padding: '6px 8px', fontWeight: 600, fontSize: 12 };
const td: any = { padding: '6px 8px', color: '#d1d5db' };
const inputStyle: any = {
  padding: '8px 10px', background: '#0A0A0A', border: '1px solid #2A2A2A',
  borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none',
};
const btn: any = {
  padding: '9px 16px', borderRadius: 10, border: 'none', color: '#fff',
  fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 7,
};
