/**
 * The blog — the page published articles have never had.
 *
 * Both content engines in this app could write an article and mark it
 * published, and neither had anywhere to publish it to: the status changed and
 * nothing became readable. This is the destination, and /blog/{id} is the
 * address that makes an article findable at all.
 *
 * The body arrives as markdown from a language model. It is rendered here with
 * a deliberately small converter rather than a markdown library: the input is
 * one known shape from one known writer, and pulling in a parser to handle
 * syntax nothing produces is weight for nothing. Anything it does not
 * understand falls through as text, which reads as plain prose rather than
 * breaking the page.
 */
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Phone, Calendar } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface ArticleSummary {
  id: string;
  title: string;
  excerpt: string;
  type: string;
  keyword: string;
  publishedAt: string;
}

interface Article extends ArticleSummary { body: string }

function articleIdFromPath(): string | null {
  const parts = window.location.pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
  return parts[0] === 'blog' && parts[1] ? decodeURIComponent(parts[1]) : null;
}

/** Escape first, then add the few tags we actually emit. */
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(md: string): string {
  const lines = esc(String(md || '')).split('\n');
  const out: string[] = [];
  let inList = false;

  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { closeList(); continue; }

    const heading = t.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 5);
      const cls = level <= 2 ? 'text-2xl font-bold text-white mt-8 mb-3'
        : level === 3 ? 'text-xl font-bold text-white mt-6 mb-2'
        : 'text-base font-bold text-gray-200 mt-4 mb-2';
      out.push(`<h${level} class="${cls}">${inline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = t.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) { out.push('<ul class="list-disc pl-5 space-y-1 my-3 text-gray-300">'); inList = true; }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p class="text-gray-300 leading-relaxed my-3">${inline(t)}</p>`);
  }
  closeList();
  return out.join('\n');
}

function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" class="text-[#ea580c] underline">$1</a>');
}

export default function Blog() {
  const [list, setList] = useState<ArticleSummary[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(articleIdFromPath());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const headers = { Authorization: `Bearer ${publicAnonKey}` };
    const work = openId
      ? fetch(`${SERVER}/blog/${encodeURIComponent(openId)}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (!cancelled) setArticle(d?.article || null); })
      : fetch(`${SERVER}/blog`, { headers })
          .then(r => r.ok ? r.json() : { articles: [] })
          .then(d => { if (!cancelled) setList(Array.isArray(d?.articles) ? d.articles : []); });

    work.catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [openId]);

  useEffect(() => {
    const onPop = () => setOpenId(articleIdFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = (id: string) => {
    window.history.pushState({}, '', `/blog/${encodeURIComponent(id)}`);
    setOpenId(id);
    window.scrollTo({ top: 0 });
  };

  const backToIndex = () => {
    window.history.pushState({}, '', '/blog');
    setOpenId(null);
    setArticle(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#ea580c] animate-spin" />
      </div>
    );
  }

  const cta = (
    <div className="mt-10 rounded-2xl border border-[#2A2A2A] bg-[#111] p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-white font-bold">Planning a renovation?</p>
        <p className="text-sm text-gray-400">
          Black Phoenix Builds — Salem, NH, serving southern NH and northern MA.
        </p>
      </div>
      <a href="tel:+16032072248"
        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
        <Phone className="w-4 h-4" /> 603-207-2248
      </a>
    </div>
  );

  if (openId) {
    if (!article) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-white font-bold mb-1">That article is not available.</p>
            <p className="text-sm text-gray-500 mb-4">It may not be published yet.</p>
            <button onClick={backToIndex}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
              All articles
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <button onClick={backToIndex}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition">
            <ArrowLeft className="w-4 h-4" /> All articles
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{article.title}</h1>
          {article.publishedAt && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500 mb-8">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
          <article dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }} />
          {cta}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Advice &amp; guides</h1>
        <p className="text-gray-400 mb-8">
          Renovation notes from Black Phoenix Builds.
        </p>

        {!list.length ? (
          <div className="rounded-2xl border border-dashed border-[#2A2A2A] p-12 text-center">
            <p className="text-sm text-gray-400">No articles published yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(a => (
              <button key={a.id} onClick={() => open(a.id)}
                className="w-full text-left bg-[#111] border border-[#2A2A2A] rounded-2xl p-5 hover:border-orange-500/40 transition">
                <p className="text-lg font-bold text-white mb-1">{a.title}</p>
                {a.excerpt && <p className="text-sm text-gray-400 line-clamp-2">{a.excerpt}</p>}
                {a.publishedAt && (
                  <p className="text-[11px] text-gray-600 mt-2">
                    {new Date(a.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
        {cta}
      </div>
    </div>
  );
}
