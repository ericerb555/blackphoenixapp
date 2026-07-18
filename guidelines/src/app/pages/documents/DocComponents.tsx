import { useState, ReactNode } from 'react';
import { CheckSquare, Square, ExternalLink, AlertTriangle, Info, Scale, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Callout ─────────────────────────────────────────────────────────────────

type CalloutType = 'law' | 'tip' | 'warning' | 'info' | 'key';
const CALLOUT_STYLES: Record<CalloutType, { bg: string; border: string; icon: any; label: string; color: string }> = {
  law:     { bg: 'bg-violet-950/40', border: 'border-violet-500/40', icon: Scale,         label: 'NH Law',     color: 'text-violet-300' },
  tip:     { bg: 'bg-teal-950/40',   border: 'border-teal-500/40',   icon: Lightbulb,     label: 'Pro Tip',    color: 'text-teal-300' },
  warning: { bg: 'bg-red-950/40',    border: 'border-red-500/40',    icon: AlertTriangle, label: 'Warning',    color: 'text-red-300' },
  info:    { bg: 'bg-blue-950/40',   border: 'border-blue-500/40',   icon: Info,          label: 'Note',       color: 'text-blue-300' },
  key:     { bg: 'bg-orange-950/40', border: 'border-orange-500/40', icon: Lightbulb,     label: 'Key Point',  color: 'text-orange-300' },
};

export function DocCallout({ type = 'info', title, children }: { type?: CalloutType; title?: string; children: ReactNode }) {
  const s = CALLOUT_STYLES[type];
  const Icon = s.icon;
  return (
    <div className={`my-6 rounded-xl border ${s.border} ${s.bg} p-4 print:border-gray-300 print:bg-gray-50`}>
      <div className={`flex items-center gap-2 font-bold text-sm mb-2 ${s.color}`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        {title || s.label}
      </div>
      <div className="text-sm text-gray-300 leading-relaxed print:text-gray-700">{children}</div>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function DocSection({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <div className="mb-6 pb-3 border-b border-[#2A2A2A] print:border-gray-300">
        <h2 className="text-2xl font-black text-white print:text-black">{title}</h2>
        {subtitle && <p className="text-gray-400 mt-1 text-sm print:text-gray-600">{subtitle}</p>}
      </div>
      <div className="prose-doc">{children}</div>
    </section>
  );
}

export function DocSubSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <div id={id} className="mb-8 scroll-mt-20">
      <h3 className="text-lg font-bold text-white mb-3 print:text-black">{title}</h3>
      {children}
    </div>
  );
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export function DocChecklist({ items, category }: { items: string[]; category?: string }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setChecked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  return (
    <div className="my-4 space-y-2 print:space-y-1">
      {category && <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{category}</p>}
      {items.map((item, i) => (
        <button key={i} onClick={() => toggle(i)}
          className={`w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-lg border transition-all
            ${checked.has(i) ? 'bg-green-500/10 border-green-500/30 text-gray-400 line-through' : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-200 hover:border-[#3A3A3A]'}
            print:flex print:bg-white print:border-gray-200 print:no-underline`}>
          {checked.has(i)
            ? <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5 print:text-black" />
            : <Square className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />}
          <span className="text-sm leading-snug">{item}</span>
        </button>
      ))}
      <p className="text-xs text-gray-500 mt-2">{checked.size}/{items.length} completed</p>
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

export function DocTable({ headers, rows }: { headers: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-[#2A2A2A] print:border-gray-300">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1A1A1A] print:bg-gray-100">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-bold text-gray-300 border-b border-[#2A2A2A] print:text-gray-700 print:border-gray-300">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={`border-b border-[#1E1E1E] last:border-0 ${ri % 2 === 1 ? 'bg-[#0F0F0F] print:bg-gray-50' : ''}`}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-gray-300 print:text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────

export function DocSteps({ steps }: { steps: { title: string; body: string | ReactNode; badge?: string }[] }) {
  return (
    <div className="my-6 space-y-4">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-4 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] print:border-gray-200 print:bg-white">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center font-black text-white text-sm">{i + 1}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-white print:text-black">{s.title}</p>
              {s.badge && <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-xs font-semibold border border-orange-500/30">{s.badge}</span>}
            </div>
            <div className="text-sm text-gray-400 leading-relaxed print:text-gray-600">{s.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stat cards ──────────────────────────────────────────────────────────────

export function DocStats({ stats }: { stats: { label: string; value: string; sub?: string; color?: string }[] }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${Math.min(stats.length, 4)} gap-3 my-6`}>
      {stats.map((s, i) => (
        <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center print:border-gray-200">
          <p className={`text-2xl font-black ${s.color || 'text-orange-400'}`}>{s.value}</p>
          <p className="text-xs font-bold text-gray-400 mt-0.5 print:text-gray-600">{s.label}</p>
          {s.sub && <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Paragraph & List helpers ─────────────────────────────────────────────────

export function P({ children }: { children: ReactNode }) {
  return <p className="text-gray-300 leading-relaxed mb-4 text-sm print:text-gray-700">{children}</p>;
}

export function UL({ items }: { items: (string | ReactNode)[] }) {
  return (
    <ul className="my-4 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-300 print:text-gray-700">
          <span className="text-orange-400 mt-1 flex-shrink-0">•</span>
          <span className="leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function OL({ items }: { items: (string | ReactNode)[] }) {
  return (
    <ol className="my-4 space-y-2 list-none">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-300 print:text-gray-700">
          <span className="text-orange-400 font-bold mt-0.5 flex-shrink-0 w-5 text-right">{i + 1}.</span>
          <span className="leading-snug">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function Bold({ children }: { children: ReactNode }) {
  return <strong className="text-white font-bold print:text-black">{children}</strong>;
}

// ─── Accordion ───────────────────────────────────────────────────────────────

export function DocAccordion({ items }: { items: { q: string; a: string | ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="my-4 space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-[#2A2A2A] rounded-xl overflow-hidden print:border-gray-200">
          <button onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-200 hover:bg-[#1A1A1A] transition print:text-gray-800">
            {item.q}
            {open === i ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
          </button>
          {open === i && (
            <div className="px-4 pb-4 text-sm text-gray-400 leading-relaxed border-t border-[#2A2A2A] pt-3 print:text-gray-600">{item.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── External link ────────────────────────────────────────────────────────────

export function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 underline underline-offset-2 print:text-blue-600">
      {children}<ExternalLink className="w-3 h-3 flex-shrink-0" />
    </a>
  );
}

// ─── Input (for calculators) ──────────────────────────────────────────────────

export function CalcInput({
  label, value, onChange, prefix, suffix, type = 'number', min, max, step, hint,
}: {
  label: string; value: number | string; onChange: (v: number) => void;
  prefix?: string; suffix?: string; type?: string;
  min?: number; max?: number; step?: number; hint?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{label}</label>
      {hint && <p className="text-xs text-gray-600 mb-1.5">{hint}</p>}
      <div className="flex items-center bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg overflow-hidden focus-within:border-orange-500/60 transition">
        {prefix && <span className="px-3 text-gray-500 font-bold text-sm border-r border-[#2A2A2A]">{prefix}</span>}
        <input
          type={type} value={value} min={min} max={max} step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm outline-none"
        />
        {suffix && <span className="px-3 text-gray-500 text-sm border-l border-[#2A2A2A]">{suffix}</span>}
      </div>
    </div>
  );
}

export function CalcResult({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[#1A1A1A] border-[#2A2A2A]'}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-black ${highlight ? 'text-orange-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function DocDivider() {
  return <hr className="my-8 border-[#2A2A2A] print:border-gray-300" />;
}

// ─── Page break (print) ──────────────────────────────────────────────────────

export function PageBreak() {
  return <div className="hidden print:block print:break-before-page" />;
}
