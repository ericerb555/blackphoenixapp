import { ArrowRight, BookOpenCheck, CheckCircle2, Compass, Info, Sparkles } from "lucide-react";
import { GUIDES, type Guide, type GuideSection, type PortalGuideKey } from "./portalGuides";

export type { PortalGuideKey };

/**
 * The guide renders in one of two shapes, decided by the content itself.
 *
 * A portal whose sections carry `steps` gets the full walkthrough: a jump list,
 * then one card per tab with numbered instructions. A portal still on the older
 * one-line `detail` keeps the two-column summary grid it has always had.
 *
 * Both shapes exist on purpose while the twelve portals are rewritten one at a
 * time — the alternative was rewriting every portal's content in one commit,
 * which is how a guide ends up full of confident sentences nobody checked.
 */
const isWalkthrough = (guide: Guide) => guide.sections.some((s) => (s.steps?.length ?? 0) > 0);

const anchorFor = (portal: PortalGuideKey, name: string) =>
  `guide-${portal}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

function StepCard({ section, index, portal }: { section: GuideSection; index: number; portal: PortalGuideKey }) {
  return (
    <article id={anchorFor(portal, section.name)} className="scroll-mt-24 border border-white/10 bg-[#151515] p-5 transition hover:border-orange-400/30 md:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-300">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-white">{section.name}</h3>
          {section.purpose && <p className="mt-1 text-sm leading-6 text-gray-400">{section.purpose}</p>}

          {section.steps && section.steps.length > 0 && (
            <ol className="mt-4 space-y-2.5">
              {section.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-6 text-gray-300">
                  <span className="mt-0.5 shrink-0 text-xs font-bold tabular-nums text-orange-300/80">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}

          {section.note && (
            <p className="mt-4 flex gap-2 border-l-2 border-orange-400/40 bg-orange-500/[0.04] p-3 text-sm leading-6 text-gray-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
              <span>{section.note}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function PortalFeatureGuide({ portal }: { portal: PortalGuideKey }) {
  const guide = GUIDES[portal];
  const walkthrough = isWalkthrough(guide);

  return <section className="mx-auto max-w-6xl space-y-6">
    <div className="overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-[#17120e] to-[#111111] p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300"><BookOpenCheck className="h-4 w-4" /> Portal guide</p><h2 className="mt-3 text-2xl font-semibold text-white md:text-3xl">{guide.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">{guide.summary}</p></div><div className="max-w-sm border border-white/10 bg-black/20 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-white"><Compass className="h-4 w-4 text-orange-300" /> Where to start</p><p className="mt-2 text-sm leading-6 text-gray-400">{guide.start}</p></div></div>
    </div>

    {walkthrough ? (
      <>
        {/* Seventeen tabs is a long page; the jump list is how you use it twice. */}
        <nav className="flex flex-wrap gap-2 border border-white/10 bg-[#121212] p-4">
          {guide.sections.map((section) => (
            <a
              key={section.name}
              href={`#${anchorFor(portal, section.name)}`}
              className="border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-orange-400/40 hover:text-orange-200"
            >
              {section.name}
            </a>
          ))}
        </nav>
        <div className="space-y-4">
          {guide.sections.map((section, index) => (
            <StepCard key={section.name} section={section} index={index} portal={portal} />
          ))}
        </div>
      </>
    ) : (
      <div className="grid gap-4 md:grid-cols-2">{guide.sections.map((section, index) => <article key={section.name} className="border border-white/10 bg-[#151515] p-5 transition hover:border-orange-400/30"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-300">{String(index + 1).padStart(2, "0")}</span><div><h3 className="font-semibold text-white">{section.name}</h3><p className="mt-2 text-sm leading-6 text-gray-400">{section.detail}</p></div></div><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400/80" /></div><p className="mt-4 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.13em] text-orange-200"><Sparkles className="h-3.5 w-3.5" /> {section.status} <ArrowRight className="h-3.5 w-3.5" /></p></article>)}</div>
    )}
  </section>;
}
