/**
 * AiSeoEngine — GrandRanker-style AI SEO autopilot.
 *
 * Discovers winnable keywords, writes SEO/GEO-optimized articles on demand,
 * manages a publish queue (draft → scheduled → published), and tracks whether
 * the brand gets cited by AI assistants. All AI runs server-side via the
 * seo-engine backend module (real OpenAI, KV-persisted — no mock data).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Loader2, Search, FileText, Eye, Trash2, RefreshCw, TrendingUp,
  Bot, Send, CheckCircle2, Calendar, Gauge, Rocket, X, PenLine,
} from 'lucide-react';
import AIRankingEngine from './AIRankingEngine';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey, 'Content-Type': 'application/json' };

interface Keyword {
  id: string; keyword: string; intent: string; volume: number;
  difficulty: number; roiScore: number; rationale: string; status: string;
}
interface Article {
  id: string; keyword: string; title: string; slug: string; metaTitle: string;
  metaDescription: string; keywords: string[]; headings: string[]; contentHtml: string;
  internalLinkSuggestions: string[]; seoScore: number; geoScore: number; scoreNotes: string;
  status: string; scheduledFor: string | null; publishedAt: string | null; createdAt: string;
  blogPostId?: string; blogPublishError?: string;
}
interface VisCheck {
  id: string; brand: string; query: string; mentionedByYou: boolean;
  assistants: Record<string, number>; answer: string; recommendation: string; checkedAt: string;
}
interface Settings {
  business: string; website: string; niche: string; audience: string; brandName: string;
  autopilot: boolean; articlesPerDay: number;
}

type Tab = 'overview' | 'keywords' | 'articles' | 'content' | 'visibility' | 'settings';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'keywords', label: 'Keywords', icon: Search },
  { id: 'articles', label: 'Articles', icon: FileText },
  { id: 'content', label: 'Ranking Content', icon: Rocket },
  { id: 'visibility', label: 'AI Visibility', icon: Bot },
  { id: 'settings', label: 'Settings', icon: PenLine },
];

function scoreColor(n: number) {
  if (n >= 70) return 'text-emerald-600 bg-emerald-50';
  if (n >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-rose-600 bg-rose-50';
}
function diffColor(n: number) {
  if (n <= 30) return 'text-emerald-600';
  if (n <= 60) return 'text-amber-600';
  return 'text-rose-600';
}

export default function AiSeoEngine() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [checks, setChecks] = useState<VisCheck[]>([]);
  const [settings, setSettings] = useState<Settings>({
    business: '', website: '', niche: '', audience: '', brandName: '', autopilot: false, articlesPerDay: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // action states
  const [discovering, setDiscovering] = useState(false);
  const [writingId, setWritingId] = useState('');
  const [useBrandKit, setUseBrandKit] = useState(true);
  const [brandConfigured, setBrandConfigured] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState('');
  const [preview, setPreview] = useState<Article | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // visibility form
  const [visQuery, setVisQuery] = useState('');
  const [checking, setChecking] = useState(false);

  async function loadAll() {
    setLoading(true); setError('');
    try {
      const [ov, kw, art, vis, set, bk] = await Promise.all([
        fetch(`${SERVER}/seo-engine/overview`, { headers: authHeaders }),
        fetch(`${SERVER}/seo-engine/keywords`, { headers: authHeaders }),
        fetch(`${SERVER}/seo-engine/articles`, { headers: authHeaders }),
        fetch(`${SERVER}/seo-engine/visibility`, { headers: authHeaders }),
        fetch(`${SERVER}/seo-engine/settings`, { headers: authHeaders }),
        fetch(`${SERVER}/content-studio/brand-kit`, { headers: authHeaders }),
      ]);
      if (ov.ok) setOverview((await ov.json()).overview);
      if (kw.ok) setKeywords((await kw.json()).keywords || []);
      if (art.ok) setArticles((await art.json()).articles || []);
      if (vis.ok) setChecks((await vis.json()).checks || []);
      if (set.ok) setSettings((await set.json()).settings);
      if (bk.ok) {
        const kit = (await bk.json()).brandKit || {};
        setBrandConfigured(Object.keys(kit).some((k) => k !== 'updatedAt' && kit[k] && (!Array.isArray(kit[k]) || kit[k].length)));
      }
    } catch (e) {
      setError(`Failed to load SEO engine data: ${e}`);
      console.error('[AiSeoEngine] load error', e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  async function discoverKeywords() {
    setDiscovering(true); setError('');
    try {
      const res = await fetch(`${SERVER}/seo-engine/keywords/discover`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          business: settings.business, niche: settings.niche,
          website: settings.website, audience: settings.audience, count: 20,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Discovery failed');
      await loadAll();
      setTab('keywords');
    } catch (e) {
      setError(`Keyword discovery failed: ${(e as any)?.message || e}`);
    } finally {
      setDiscovering(false);
    }
  }

  async function writeArticle(keyword: string, kwId?: string) {
    setWritingId(kwId || keyword); setError('');
    try {
      const res = await fetch(`${SERVER}/seo-engine/articles/generate`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ keyword, useBrandKit }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');
      await loadAll();
      setTab('articles');
      setPreview(data.article);
    } catch (e) {
      setError(`Article generation failed: ${(e as any)?.message || e}`);
    } finally {
      setWritingId('');
    }
  }

  async function setArticleStatus(a: Article, status: string, scheduledFor?: string | null) {
    setBusyId(a.id);
    try {
      const res = await fetch(`${SERVER}/seo-engine/articles/${a.id}`, {
        method: 'PUT', headers: authHeaders, body: JSON.stringify({ status, scheduledFor: scheduledFor ?? a.scheduledFor }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      await loadAll();
    } catch (e) {
      setError(`Could not update article: ${(e as any)?.message || e}`);
    } finally {
      setBusyId('');
    }
  }

  async function deleteArticle(id: string) {
    setBusyId(id);
    try {
      await fetch(`${SERVER}/seo-engine/articles/${id}`, { method: 'DELETE', headers: authHeaders });
      await loadAll();
    } finally { setBusyId(''); }
  }
  async function deleteKeyword(id: string) {
    setBusyId(id);
    try {
      await fetch(`${SERVER}/seo-engine/keywords/${id}`, { method: 'DELETE', headers: authHeaders });
      await loadAll();
    } finally { setBusyId(''); }
  }

  async function runVisibility() {
    if (!visQuery.trim()) return;
    setChecking(true); setError('');
    try {
      const res = await fetch(`${SERVER}/seo-engine/visibility/check`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ query: visQuery, brand: settings.brandName || settings.business }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Check failed');
      setVisQuery('');
      await loadAll();
    } catch (e) {
      setError(`Visibility check failed: ${(e as any)?.message || e}`);
    } finally {
      setChecking(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true); setError('');
    try {
      const res = await fetch(`${SERVER}/seo-engine/settings`, {
        method: 'PUT', headers: authHeaders, body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      await loadAll();
    } catch (e) {
      setError(`Could not save settings: ${(e as any)?.message || e}`);
    } finally {
      setSavingSettings(false);
    }
  }

  const hasProfile = useMemo(() => Boolean(settings.business || settings.niche), [settings]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI SEO Engine</h1>
              <p className="text-white/80 text-sm">
                Find winnable keywords, write ranking articles on autopilot, and get cited by AI assistants.
              </p>
            </div>
            <button
              onClick={loadAll}
              className="ml-auto inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Tabs */}
        <div className="flex gap-1 -mt-4 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm">
            <X className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {!hasProfile && tab !== 'settings' && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm flex items-center justify-between">
            <span>Set up your business profile first so the AI knows what to rank for.</span>
            <button onClick={() => setTab('settings')} className="font-semibold underline">Go to Settings</button>
          </div>
        )}

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="pb-12 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Search} label="Keywords" value={overview?.keywordCount ?? 0} sub={`${overview?.winnableKeywords ?? 0} winnable`} />
              <StatCard icon={FileText} label="Articles" value={overview?.articleCount ?? 0} sub={`${overview?.published ?? 0} published`} />
              <StatCard icon={Calendar} label="Scheduled" value={overview?.scheduled ?? 0} sub={`${overview?.drafts ?? 0} drafts`} />
              <StatCard icon={Gauge} label="Avg SEO Score" value={overview?.avgSeoScore ?? 0} sub="across all articles" />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Start growing organic traffic</h3>
              <p className="text-sm text-gray-500 mb-4">Three steps: discover keywords → generate articles → publish and track AI visibility.</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={discoverKeywords}
                  disabled={discovering || !hasProfile}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium"
                >
                  {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Discover keywords
                </button>
                <button onClick={() => setTab('articles')} className="inline-flex items-center gap-2 border border-gray-200 hover:bg-gray-50 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700">
                  <FileText className="w-4 h-4" /> View articles
                </button>
                <button onClick={() => setTab('visibility')} className="inline-flex items-center gap-2 border border-gray-200 hover:bg-gray-50 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700">
                  <Bot className="w-4 h-4" /> Check AI visibility
                </button>
              </div>
            </div>

            {overview?.latestVisibility && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Bot className="w-4 h-4 text-indigo-600" /> Latest AI Visibility</h3>
                <p className="text-sm text-gray-500 mb-3">“{overview.latestVisibility.query}”</p>
                <AssistantBars assistants={overview.latestVisibility.assistants} />
              </div>
            )}
          </div>
        )}

        {/* KEYWORDS */}
        {tab === 'keywords' && (
          <div className="pb-12">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Keyword Opportunities</h3>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer" title="Write articles in your Brand Kit voice">
                  <input type="checkbox" checked={useBrandKit} onChange={(e) => setUseBrandKit(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                  Apply Brand Kit
                </label>
                <button
                  onClick={discoverKeywords}
                  disabled={discovering || !hasProfile}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
                >
                  {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Discover keywords
                </button>
              </div>
            </div>
            {useBrandKit && brandConfigured === false && (
              <p className="mb-4 text-xs text-amber-600">Brand Kit is empty — set your brand voice in Content Studio → Brand Kit so articles sound like your brand.</p>
            )}
            {keywords.length === 0 ? (
              <Empty text="No keywords yet. Run discovery to find winnable keywords for your business." />
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Keyword</th>
                      <th className="px-4 py-3 font-medium">Intent</th>
                      <th className="px-4 py-3 font-medium">Volume</th>
                      <th className="px-4 py-3 font-medium">Difficulty</th>
                      <th className="px-4 py-3 font-medium">ROI</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {keywords.map((k) => (
                      <tr key={k.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{k.keyword}</div>
                          {k.rationale && <div className="text-xs text-gray-400 max-w-md truncate">{k.rationale}</div>}
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-600">{k.intent}</td>
                        <td className="px-4 py-3 text-gray-600">{k.volume.toLocaleString()}</td>
                        <td className={`px-4 py-3 font-semibold ${diffColor(k.difficulty)}`}>{k.difficulty}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${scoreColor(k.roiScore)}`}>{k.roiScore}</span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => writeArticle(k.keyword, k.id)}
                            disabled={writingId === k.id}
                            className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-md px-3 py-1.5 text-xs font-medium"
                          >
                            {writingId === k.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
                            Write article
                          </button>
                          <button
                            onClick={() => deleteKeyword(k.id)}
                            disabled={busyId === k.id}
                            className="ml-1 inline-flex items-center text-gray-400 hover:text-rose-600 p-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ARTICLES */}
        {tab === 'articles' && (
          <div className="pb-12">
            <h3 className="font-semibold text-gray-900 mb-4">Content Queue</h3>
            {articles.length === 0 ? (
              <Empty text="No articles yet. Pick a keyword and click “Write article”." />
            ) : (
              <div className="grid gap-3">
                {articles.map((a) => (
                  <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusPill status={a.status} />
                          <span className="text-xs text-gray-400">Target: {a.keyword}</span>
                          {a.status === 'published' && a.blogPostId && (
                            <button
                              onClick={() => { window.location.href = '/blog-manager'; }}
                              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Live in Blog Manager
                            </button>
                          )}
                          {a.blogPublishError && (
                            <span className="text-xs text-rose-500">Blog publish failed: {a.blogPublishError}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 mt-1 truncate">{a.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-1">{a.metaDescription}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${scoreColor(a.seoScore)}`}>SEO {a.seoScore}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${scoreColor(a.geoScore)}`}>GEO {a.geoScore}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <button onClick={() => setPreview(a)} className="inline-flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700">
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                        <div className="flex gap-1.5">
                          {a.status !== 'scheduled' && a.status !== 'published' && (
                            <button onClick={() => setArticleStatus(a, 'scheduled', new Date(Date.now() + 86400000).toISOString())} disabled={busyId === a.id} className="inline-flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 rounded-md px-2 py-1.5 text-xs font-medium">
                              <Calendar className="w-3.5 h-3.5" /> Schedule
                            </button>
                          )}
                          {a.status !== 'published' && (
                            <button onClick={() => setArticleStatus(a, 'published')} disabled={busyId === a.id} className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-2.5 py-1.5 text-xs font-medium">
                              {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />} Publish
                            </button>
                          )}
                          <button onClick={() => deleteArticle(a.id)} disabled={busyId === a.id} className="text-gray-400 hover:text-rose-600 p-1.5">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISIBILITY */}
        {tab === 'visibility' && (
          <div className="pb-12 space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Are you cited by AI assistants?</h3>
              <p className="text-sm text-gray-500 mb-4">Enter a question your buyers might ask an AI. We probe whether your brand shows up.</p>
              <div className="flex gap-2">
                <input
                  value={visQuery}
                  onChange={(e) => setVisQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runVisibility()}
                  placeholder='e.g. "best contractor CRM for small builders"'
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={runVisibility} disabled={checking || !visQuery.trim()} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium">
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Check
                </button>
              </div>
            </div>
            {checks.length === 0 ? (
              <Empty text="No visibility checks yet." />
            ) : (
              checks.map((v) => (
                <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    {v.mentionedByYou ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                    <span className="font-medium text-gray-900">“{v.query}”</span>
                    <span className="ml-auto text-xs text-gray-400">{new Date(v.checkedAt).toLocaleDateString()}</span>
                  </div>
                  <AssistantBars assistants={v.assistants} />
                  {v.recommendation && <p className="text-xs text-gray-500 mt-3 flex items-start gap-1.5"><TrendingUp className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" />{v.recommendation}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* RANKING CONTENT
            The AI Ranking Engine, rendered in place rather than reimplemented.
            It was a second, separate screen writing the same kind of thing as
            the Articles tab — two generators, two stores, two places to look.
            Embedding it puts both under one roof without rewriting a thousand
            working lines, which is the safe half of consolidating them; merging
            the two back ends is a later job and a riskier one. */}
        {tab === 'content' && (
          <div className="pb-12">
            <p className="text-xs text-gray-500 mb-4">
              Blog posts, FAQs, service and local landing pages. Anything published here
              appears at <a href="/blog" className="text-[#ea580c] underline">/blog</a>.
            </p>
            <AIRankingEngine embedded />
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="pb-12">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-2xl">
              <h3 className="font-semibold text-gray-900 mb-4">Business Profile</h3>
              <div className="grid gap-4">
                <Field label="Business description" value={settings.business} onChange={(v) => setSettings({ ...settings, business: v })} placeholder="What your business does" />
                <Field label="Brand name" value={settings.brandName} onChange={(v) => setSettings({ ...settings, brandName: v })} placeholder="Brand to promote / track" />
                <Field label="Website" value={settings.website} onChange={(v) => setSettings({ ...settings, website: v })} placeholder="https://…" />
                <Field label="Niche" value={settings.niche} onChange={(v) => setSettings({ ...settings, niche: v })} placeholder="e.g. residential construction software" />
                <Field label="Target audience" value={settings.audience} onChange={(v) => setSettings({ ...settings, audience: v })} placeholder="Who you're writing for" />
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={settings.autopilot} onChange={(e) => setSettings({ ...settings, autopilot: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-gray-700">Enable autopilot (queue articles automatically)</span>
                </label>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Articles per day</label>
                  <input type="number" min={1} max={10} value={settings.articlesPerDay}
                    onChange={(e) => setSettings({ ...settings, articlesPerDay: Number(e.target.value) || 1 })}
                    className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <button onClick={saveSettings} disabled={savingSettings} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium w-fit">
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Article preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{preview.title}</h3>
                <p className="text-xs text-gray-400">/{preview.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${scoreColor(preview.seoScore)}`}>SEO {preview.seoScore}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${scoreColor(preview.geoScore)}`}>GEO {preview.geoScore}</span>
                <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700 p-1"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <div className="text-xs text-gray-500 mb-4">
                <div><span className="font-semibold">Meta title:</span> {preview.metaTitle}</div>
                <div><span className="font-semibold">Meta description:</span> {preview.metaDescription}</div>
                {preview.scoreNotes && <div className="mt-1"><span className="font-semibold">Notes:</span> {preview.scoreNotes}</div>}
              </div>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: preview.contentHtml }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-2"><Icon className="w-4 h-4" /> {label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    scheduled: 'bg-indigo-50 text-indigo-600',
    published: 'bg-emerald-50 text-emerald-600',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || map.draft}`}>{status}</span>;
}

function AssistantBars({ assistants }: { assistants: Record<string, number> }) {
  const labels: Record<string, string> = { chatgpt: 'ChatGPT', gemini: 'Gemini', perplexity: 'Perplexity', claude: 'Claude', copilot: 'Copilot' };
  return (
    <div className="space-y-2">
      {Object.keys(labels).map((k) => {
        const v = Number(assistants?.[k]) || 0;
        return (
          <div key={k} className="flex items-center gap-3">
            <span className="w-20 text-xs text-gray-500">{labels[k]}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${Math.min(100, v)}%` }} />
            </div>
            <span className="w-9 text-right text-xs font-semibold text-gray-600">{v}%</span>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-400">
      {text}
    </div>
  );
}
