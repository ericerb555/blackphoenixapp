/**
 * Our Work — the public gallery, and every project's own page.
 *
 * The landing page has always had a "View All Our Work" button pointing at a
 * gallery that did not exist. This is that page, and it is also where each job
 * gets an address of its own: /work for everything, /work/{id} for one project.
 *
 * WHY THE URL MATTERS MORE THAN THE LAYOUT
 *
 * Until now the whole store and the whole gallery lived at a single address, so
 * there was nothing for a search engine to rank and nothing specific for a
 * shared link to point at — send someone a kitchen and they got the homepage.
 * A page per job is the thing that makes the rest of the marketing work
 * possible, which is why this is worth more than it looks.
 *
 * It renders both views because they are one screen with a filter, and two
 * components sharing one fetch would only be able to disagree.
 */
import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Phone, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Project {
  id: string;
  title: string;
  category: string;
  image: string;
  before?: string | null;
}

/** The id after /work/, or null on the index. */
function projectIdFromPath(): string | null {
  const parts = window.location.pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
  return parts[0] === 'work' && parts[1] ? decodeURIComponent(parts[1]) : null;
}

function go(path: string) {
  const nav = (window as any).__navigateApp;
  // The app's router owns navigation; the assign is only for when it is absent,
  // which is what a crawler or a cold link hitting this page directly looks like.
  if (typeof nav === 'function') {
    window.history.pushState({}, '', path);
    nav(path.replace(/^\//, ''));
  } else {
    window.location.assign(path);
  }
}

export default function OurWork() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('All');
  const [openId, setOpenId] = useState<string | null>(projectIdFromPath());

  useEffect(() => {
    fetch(`${SERVER}/gallery`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      .then(r => r.ok ? r.json() : { projects: [] })
      .then(d => setProjects(Array.isArray(d?.projects) ? d.projects : []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  // Back and forward have to work: this page has real URLs now, and a browser
  // button that does nothing is how people conclude a site is broken.
  useEffect(() => {
    const onPop = () => setOpenId(projectIdFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = openId ? projects.find(p => p.id === openId) : null;
  const categories = ['All', ...Array.from(new Set(projects.map(p => p.category).filter(Boolean)))];
  const shown = category === 'All' ? projects : projects.filter(p => p.category === category);

  const openProject = (p: Project) => {
    window.history.pushState({}, '', `/work/${encodeURIComponent(p.id)}`);
    setOpenId(p.id);
    window.scrollTo({ top: 0 });
  };

  const backToIndex = () => {
    window.history.pushState({}, '', '/work');
    setOpenId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#ea580c] animate-spin" />
      </div>
    );
  }

  // ── One project ────────────────────────────────────────────────────────────
  if (openId && open) {
    const others = projects.filter(p => p.id !== open.id && p.category === open.category).slice(0, 3);
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <button onClick={backToIndex}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition">
            <ArrowLeft className="w-4 h-4" /> All our work
          </button>

          <p className="text-xs uppercase tracking-wide text-[#ea580c] font-semibold">{open.category}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-1 mb-6">{open.title}</h1>

          <div className="rounded-2xl overflow-hidden border border-[#2A2A2A] bg-[#111]">
            <img src={open.image} alt={open.title} className="w-full h-auto" />
          </div>

          {open.before && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Before</p>
              <div className="rounded-2xl overflow-hidden border border-[#2A2A2A]">
                <img src={open.before} alt={`${open.title} before`} className="w-full h-auto" />
              </div>
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-[#2A2A2A] bg-[#111] p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold">Thinking about something similar?</p>
              <p className="text-sm text-gray-400">
                Black Phoenix Builds — full-service renovation across southern New Hampshire.
              </p>
            </div>
            <a href="tel:+16032072248"
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
              <Phone className="w-4 h-4" /> 603-207-2248
            </a>
          </div>

          {others.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-bold text-white mb-4">More {open.category.toLowerCase()}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {others.map(p => (
                  <button key={p.id} onClick={() => openProject(p)}
                    className="text-left rounded-2xl overflow-hidden border border-[#2A2A2A] bg-[#111] hover:border-orange-500/40 transition">
                    <img src={p.image} alt={p.title} loading="lazy" className="w-full aspect-[4/3] object-cover" />
                    <p className="p-3 text-sm font-semibold text-white">{p.title}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // A link to a project that has been unpublished or deleted. Say so rather
  // than rendering an empty page that looks broken.
  if (openId && !open) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white font-bold mb-1">That project is not available.</p>
          <p className="text-sm text-gray-500 mb-4">It may have been taken down.</p>
          <button onClick={backToIndex}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
            See all our work
          </button>
        </div>
      </div>
    );
  }

  // ── The index ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Our work</h1>
        <p className="text-gray-400 mb-6">
          Kitchens, bathrooms and whole-home renovations across southern New Hampshire.
        </p>

        {categories.length > 2 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  category === cat ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:bg-white/5'}`}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {!projects.length ? (
          <div className="rounded-2xl border border-dashed border-[#2A2A2A] p-12 text-center">
            <p className="text-sm text-gray-400">No projects published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shown.map(p => (
              <button key={p.id} onClick={() => openProject(p)}
                className="text-left bg-[#111] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-orange-500/40 transition group">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={p.image} alt={p.title} loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition duration-300" />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-sm">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#ea580c] transition" />
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-[#2A2A2A] bg-[#111] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold">Planning a renovation?</p>
            <p className="text-sm text-gray-400">Salem, NH — serving southern NH and northern MA.</p>
          </div>
          <a href="tel:+16032072248"
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
            <Phone className="w-4 h-4" /> 603-207-2248
          </a>
        </div>
      </div>
    </div>
  );
}
