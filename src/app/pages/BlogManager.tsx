import { useState, useMemo } from 'react';
import { BookOpen, Plus, Edit3, Trash2, Eye, Search, Tag, Calendar, User, Globe, Save, X, Image, Copy, CheckCircle, ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type PostStatus = 'published' | 'draft' | 'scheduled';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  author: string;
  status: PostStatus;
  tags: string[];
  category: string;
  coverImage: string;
  publishedAt: string;
  createdAt: string;
  readTime: number;
  seoTitle: string;
  seoDescription: string;
  views: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function readTime(body: string) {
  return Math.max(1, Math.ceil(body.split(/\s+/).length / 200));
}

function load(): BlogPost[] {
  try { return JSON.parse(localStorage.getItem('blog_posts') || 'null') || DEFAULT_POSTS; } catch { return DEFAULT_POSTS; }
}

function persist(posts: BlogPost[]) {
  localStorage.setItem('blog_posts', JSON.stringify(posts));
}

// ─── Default Content ──────────────────────────────────────────────────────────

const DEFAULT_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    title: '5 Signs Your Roof Needs to Be Replaced This Year',
    slug: '5-signs-your-roof-needs-replacement',
    excerpt: 'Missing shingles, water stains, and sagging are just a few warning signs that your roof may be past its prime. Here\'s what to look for.',
    body: `# 5 Signs Your Roof Needs to Be Replaced This Year

Your roof is one of the most important parts of your home, but it's easy to overlook until a serious problem develops. Here are five warning signs that it might be time for a replacement.

## 1. Missing or Curling Shingles

Shingles that are missing, cracked, or curling at the edges are a clear sign of aging. Once shingles start deteriorating, they can no longer effectively protect your home from water infiltration.

## 2. Granules in Your Gutters

If you notice dark, sand-like granules collecting in your gutters, your asphalt shingles are shedding their protective coating. This is normal near the end of a roof's lifespan (typically 20-30 years for asphalt).

## 3. Daylight Through Roof Boards

Head up to your attic on a sunny day. If you can see daylight coming through the boards, your roof has gaps — and where light gets in, so does rain and cold air.

## 4. Water Stains on Ceilings or Walls

Brown stains on interior ceilings are a telltale sign of a leaking roof. Even small leaks can lead to mold, structural damage, and costly repairs if left untreated.

## 5. Sagging Roof Sections

A sagging roofline indicates structural problems — often caused by trapped moisture rotting the decking. This is a serious issue that needs immediate attention.

---

**When in doubt, get a professional inspection.** Black Phoenix Builds offers free roof assessments throughout New Hampshire. Contact us today to schedule yours.`,
    author: 'Eric Erb',
    status: 'published',
    tags: ['roofing', 'home-maintenance', 'nh'],
    category: 'Roofing',
    coverImage: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a82c7c1f9.png',
    publishedAt: '2026-06-15',
    createdAt: '2026-06-14',
    readTime: 3,
    seoTitle: '5 Signs Your Roof Needs Replacement | Black Phoenix Builds NH',
    seoDescription: 'Learn the 5 most common warning signs that your roof needs to be replaced. Expert advice from Black Phoenix Builds, serving all of New Hampshire.',
    views: 142,
  },
  {
    id: 'post-2',
    title: 'How to Choose the Right Siding for Your New Hampshire Home',
    slug: 'choose-siding-new-hampshire',
    excerpt: 'With harsh winters and humid summers, NH homeowners need siding that can handle it all. We break down the top options and what to expect.',
    body: `# How to Choose the Right Siding for Your New Hampshire Home

New Hampshire weather is no joke. From ice storms in January to humidity spikes in July, your home's siding takes a beating. Here's what you need to know before making a decision.

## Vinyl Siding: The Popular Choice

Vinyl is the most common siding choice in NH for good reason — it's affordable, low-maintenance, and holds up well to temperature swings. Modern vinyl comes in dozens of colors and styles, including options that mimic wood grain.

**Pros:** Budget-friendly, no painting needed, resistant to moisture
**Cons:** Can crack in extreme cold, not as premium-looking as fiber cement

## Fiber Cement: The Premium Option

Fiber cement (James Hardie is the most popular brand) is highly durable and fire-resistant. It can be painted any color and holds paint much longer than wood.

**Pros:** Extremely durable, looks like wood, great resale value
**Cons:** Higher upfront cost, heavier (requires professional installation)

## Wood and Cedar: The Classic Look

If you love the authentic New England look, cedar siding is hard to beat. However, it requires regular maintenance — painting or staining every 5-7 years — and proper sealing against moisture.

**Pros:** Beautiful, natural look; adds curb appeal
**Cons:** High maintenance, susceptible to moisture and insects

---

Black Phoenix Builds installs all major siding types throughout New Hampshire. Call us for a free estimate and we'll help you find the right fit for your home and budget.`,
    author: 'Eric Erb',
    status: 'published',
    tags: ['siding', 'home-improvement', 'nh', 'exterior'],
    category: 'Siding',
    coverImage: 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d15d350aa.jpg',
    publishedAt: '2026-06-28',
    createdAt: '2026-06-27',
    readTime: 4,
    seoTitle: 'Best Siding Options for NH Homes | Black Phoenix Builds',
    seoDescription: 'Vinyl, fiber cement, or wood? Compare siding options for New Hampshire homes with expert advice from Black Phoenix Builds.',
    views: 89,
  },
  {
    id: 'post-3',
    title: 'Deck Building in NH: What to Expect and How to Plan',
    slug: 'deck-building-new-hampshire-guide',
    excerpt: 'Thinking about adding a deck? Here\'s everything you need to know before the first nail goes in — from permits to materials to timeline.',
    body: `# Deck Building in NH: What to Expect and How to Plan

A new deck can transform your backyard into an outdoor living space you use all summer long. But before you break ground, there are a few important things to know.

## Permits First

In New Hampshire, most decks attached to the house require a building permit. The rules vary by town, but generally any deck over 200 square feet or more than 30" above grade needs approval. Black Phoenix Builds handles all permit applications as part of our process.

## Choosing Your Decking Material

**Pressure-Treated Wood** — The most affordable option. Requires sealing and periodic staining. Life expectancy: 15-25 years.

**Composite Decking (Trex, TimberTech)** — Low maintenance, no splinters, won't rot. Higher upfront cost but saves money over time. Life expectancy: 25-30 years.

**Cedar or Redwood** — Beautiful natural option. Requires regular maintenance but is naturally rot-resistant.

## Timeline

A typical 400 sq ft deck takes 3-5 days to build, weather permitting. Add 1-2 weeks for permit approval. Best time to build: late spring through early fall.

## What It Costs

Expect to invest $15-$35 per square foot installed, depending on materials and complexity. A simple 400 sq ft PT wood deck runs around $8,000-$12,000. Composite decks with railings can reach $20,000+.

---

Ready to get started? We offer free deck estimates throughout NH. Contact Black Phoenix Builds today!`,
    author: 'Eric Erb',
    status: 'draft',
    tags: ['decks', 'outdoor-living', 'nh', 'construction'],
    category: 'Decks & Outdoor',
    coverImage: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e63a256d83.jpg',
    publishedAt: '',
    createdAt: '2026-07-08',
    readTime: 4,
    seoTitle: 'Deck Building Guide for NH Homeowners | Black Phoenix Builds',
    seoDescription: 'Everything you need to know about building a deck in New Hampshire — permits, materials, cost, and timeline. Free estimates from Black Phoenix Builds.',
    views: 0,
  },
];

const CATEGORIES = ['Roofing', 'Siding', 'Gutters', 'Windows & Doors', 'Decks & Outdoor', 'Interior Remodeling', 'Electrical', 'Plumbing', 'HVAC', 'Painting', 'Flooring', 'General Tips'];

const BLANK = (): BlogPost => ({
  id: `post-${Date.now()}`,
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  author: 'Eric Erb',
  status: 'draft',
  tags: [],
  category: 'General Tips',
  coverImage: '',
  publishedAt: '',
  createdAt: new Date().toISOString().split('T')[0],
  readTime: 1,
  seoTitle: '',
  seoDescription: '',
  views: 0,
});

// ─── Post Editor ──────────────────────────────────────────────────────────────

function PostEditor({ post, onSave, onClose }: { post: BlogPost; onSave: (p: BlogPost) => void; onClose: () => void }) {
  const [p, setP] = useState<BlogPost>({ ...post });
  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState(false);

  function f(key: keyof BlogPost, val: any) {
    setP(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'title' && !post.slug) next.slug = slugify(val);
      if (key === 'body') next.readTime = readTime(val);
      if (key === 'title' && !post.seoTitle) next.seoTitle = val;
      return next;
    });
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !p.tags.includes(t)) {
      f('tags', [...p.tags, t]);
    }
    setTagInput('');
  }

  function removeTag(t: string) { f('tags', p.tags.filter(x => x !== t)); }

  function handleSave(status?: PostStatus) {
    const final = { ...p, status: status || p.status };
    if (status === 'published' && !final.publishedAt) final.publishedAt = new Date().toISOString().split('T')[0];
    onSave(final);
  }

  return (
    <div className="fixed inset-0 bg-[#080808] z-50 overflow-auto">
      {/* Topbar */}
      <div className="sticky top-0 bg-[#0e0e0e] border-b border-[#1a1a1a] px-5 py-3 flex items-center justify-between z-10">
        <button onClick={onClose} className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition">
            <Eye className="w-4 h-4" />
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button onClick={() => handleSave('draft')}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition">
            Save Draft
          </button>
          <button onClick={() => handleSave('published')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white transition">
            <Globe className="w-4 h-4" />
            {p.status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8 grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-5">
          {preview ? (
            <div className="prose prose-invert max-w-none bg-[#111] border border-[#222] rounded-xl p-8">
              {p.coverImage && <img src={p.coverImage} alt="" className="w-full h-48 object-cover rounded-xl mb-6" />}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                <span>{p.category}</span>
                <span>·</span>
                <span>{p.readTime} min read</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">{p.title || 'Untitled Post'}</h1>
              {p.excerpt && <p className="text-gray-400 text-sm mb-6 italic">{p.excerpt}</p>}
              <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {p.body || <span className="text-gray-600">No content yet.</span>}
              </div>
            </div>
          ) : (
            <>
              <div>
                <input value={p.title} onChange={e => f('title', e.target.value)}
                  placeholder="Post title..."
                  className="w-full bg-transparent text-2xl font-bold text-white placeholder-gray-700 focus:outline-none border-b border-[#1a1a1a] pb-3" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Excerpt / Summary</label>
                <textarea rows={2} value={p.excerpt} onChange={e => f('excerpt', e.target.value)}
                  placeholder="Short description shown in blog listings and social shares..."
                  className="w-full bg-[#111] border border-[#1a1a1a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition resize-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-gray-500">Content (Markdown supported)</label>
                  <span className="text-xs text-gray-600">{p.readTime} min read · {p.body.split(/\s+/).filter(Boolean).length} words</span>
                </div>
                <textarea rows={20} value={p.body} onChange={e => f('body', e.target.value)}
                  placeholder="Write your post here. Use # for headings, **bold**, *italic*..."
                  className="w-full bg-[#111] border border-[#1a1a1a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition resize-none font-mono leading-relaxed" />
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
            <label className="text-xs text-gray-400 font-medium block mb-2">Status</label>
            <select value={p.status} onChange={e => f('status', e.target.value as PostStatus)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
            {p.status === 'published' && (
              <div className="mt-3">
                <label className="text-xs text-gray-500 block mb-1">Publish Date</label>
                <input type="date" value={p.publishedAt} onChange={e => f('publishedAt', e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition" />
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
            <label className="text-xs text-gray-400 font-medium block">Post Details</label>
            <div>
              <label className="text-[10px] text-gray-600 block mb-1">Category</label>
              <select value={p.category} onChange={e => f('category', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-600 block mb-1">Author</label>
              <input value={p.author} onChange={e => f('author', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition" />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 block mb-1">URL Slug</label>
              <input value={p.slug} onChange={e => f('slug', slugify(e.target.value))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500 transition" />
            </div>
          </div>

          {/* Cover image */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
            <label className="text-xs text-gray-400 font-medium block mb-2">Cover Image URL</label>
            <input value={p.coverImage} onChange={e => f('coverImage', e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition" />
            {p.coverImage && <img src={p.coverImage} alt="" className="w-full h-24 object-cover rounded-lg mt-2" onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />}
          </div>

          {/* Tags */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
            <label className="text-xs text-gray-400 font-medium block mb-2">Tags</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {p.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 text-[10px] px-2 py-0.5 rounded-full">
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="Add tag..."
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none" />
              <button onClick={addTag} className="px-2 py-1.5 bg-[#222] hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SEO */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
            <label className="text-xs text-gray-400 font-medium block">SEO Settings</label>
            <div>
              <label className="text-[10px] text-gray-600 block mb-1">SEO Title <span className="text-gray-700">({(p.seoTitle || '').length}/60)</span></label>
              <input value={p.seoTitle} onChange={e => f('seoTitle', e.target.value)} maxLength={60}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition" />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 block mb-1">Meta Description <span className="text-gray-700">({(p.seoDescription || '').length}/160)</span></label>
              <textarea rows={3} value={p.seoDescription} onChange={e => f('seoDescription', e.target.value)} maxLength={160}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition resize-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, onEdit, onDelete, onToggleStatus }: {
  post: BlogPost;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  const statusColors = {
    published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-orange-500/20 transition group">
      {post.coverImage && (
        <div className="h-32 overflow-hidden">
          <img src={post.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" onError={e => ((e.target as HTMLImageElement).parentElement!.style.display = 'none')} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full capitalize ${statusColors[post.status]}`}>{post.status}</span>
            <span className="text-[10px] text-gray-600">{post.category}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 hover:bg-[#1a1a1a] rounded-lg text-gray-600 hover:text-white transition">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 hover:bg-[#1a1a1a] rounded-lg text-gray-600 hover:text-red-400 transition">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">{post.title || 'Untitled'}</h3>
        {post.excerpt && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{post.excerpt}</p>}

        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}m</span>
            {post.publishedAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.publishedAt}</span>}
          </div>
          {post.status === 'published' && <span className="text-gray-600">{post.views} views</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>(load);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | PostStatus>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  function save(p: BlogPost) {
    const next = posts.find(x => x.id === p.id) ? posts.map(x => x.id === p.id ? p : x) : [...posts, p];
    setPosts(next);
    persist(next);
    setEditing(null);
    toast.success(`Post "${p.title}" ${p.status === 'published' ? 'published!' : 'saved.'}`);
  }

  function del(id: string) {
    const next = posts.filter(p => p.id !== id);
    setPosts(next);
    persist(next);
    toast.success('Post deleted.');
  }

  const filtered = useMemo(() => posts.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.tags.join(' ').includes(search.toLowerCase())) return false;
    return true;
  }), [posts, search, filterStatus, filterCategory]);

  const published = posts.filter(p => p.status === 'published').length;
  const totalViews = posts.reduce((s, p) => s + p.views, 0);

  if (editing) return <PostEditor post={editing} onSave={save} onClose={() => setEditing(null)} />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Blog Manager</h1>
            <p className="text-sm text-gray-400">Write, publish, and manage your content</p>
          </div>
        </div>
        <button onClick={() => setEditing(BLANK())}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition">
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Posts', value: posts.length },
          { label: 'Published', value: published, color: 'text-emerald-400' },
          { label: 'Drafts', value: posts.filter(p => p.status === 'draft').length, color: 'text-yellow-400' },
          { label: 'Total Views', value: totalViews, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color || 'text-white'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="w-full bg-[#111] border border-[#222] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-[#111] border border-[#222] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Post grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{posts.length === 0 ? 'No posts yet. Click New Post to get started.' : 'No posts match your filters.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(post => (
            <PostCard key={post.id} post={post} onEdit={() => setEditing(post)} onDelete={() => del(post.id)} onToggleStatus={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
