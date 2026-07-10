/**
 * Before/After Gallery — showcase completed projects with a drag-to-reveal slider.
 * Accessible from the landing page and the admin portal for uploads.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Upload, Plus, Trash2, Eye, EyeOff, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const CATEGORIES = ['All', 'Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Exterior', 'Landscaping', 'Commercial', 'Trash Removal', 'Other'];

// Placeholder projects until real ones are uploaded
const PLACEHOLDERS = [
  { id: 'p1', title: 'Full Kitchen Remodel', category: 'Kitchen', description: 'Complete gut renovation with custom cabinets, quartz countertops, and new appliances.', beforeUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80', afterUrl: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80', published: true, createdAt: '' },
  { id: 'p2', title: 'Master Bathroom Renovation', category: 'Bathroom', description: 'Spa-like transformation with walk-in shower, double vanity, and heated floors.', beforeUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80', afterUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80', published: true, createdAt: '' },
  { id: 'p3', title: 'Open Concept Living Room', category: 'Living Room', description: 'Removed wall between kitchen and living area to create bright, open floor plan.', beforeUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80', afterUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&q=80', published: true, createdAt: '' },
  { id: 'p4', title: 'Exterior Home Makeover', category: 'Exterior', description: 'New siding, windows, front door, and landscaping for complete curb appeal transformation.', beforeUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80', afterUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', published: true, createdAt: '' },
  { id: 'p5', title: 'Basement Conversion', category: 'Other', description: 'Converted unfinished basement into a full entertainment room with bar and home theater.', beforeUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', afterUrl: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80', published: true, createdAt: '' },
  { id: 'p6', title: 'Junk Removal & Cleanup', category: 'Trash Removal', description: 'Complete property cleanout — 3 dumpster loads removed in a single day.', beforeUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', afterUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&q=80', published: true, createdAt: '' },
];

// ── Before/After Slider ──────────────────────────────────────────────────────
function BeforeAfterSlider({ before, after, title }: { before: string; after: string; title: string }) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); setDragging(true); };
  const onMouseMove = useCallback((e: MouseEvent) => { if (dragging) updatePosition(e.clientX); }, [dragging, updatePosition]);
  const onMouseUp = useCallback(() => setDragging(false), []);
  const onTouchMove = useCallback((e: TouchEvent) => { if (dragging) updatePosition(e.touches[0].clientX); }, [dragging, updatePosition]);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [onMouseMove, onMouseUp, onTouchMove]);

  return (
    <div ref={containerRef} className="relative w-full aspect-video overflow-hidden rounded-xl select-none cursor-col-resize" style={{ touchAction: 'none' }}>
      {/* After (full width, behind) */}
      <img src={after} alt={`${title} after`} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-bold rounded-lg">AFTER</div>

      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img src={before} alt={`${title} before`} className="w-full h-full object-cover" style={{ width: `${100 / (position / 100)}%` }} />
        <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-bold rounded-lg">BEFORE</div>
      </div>

      {/* Divider */}
      <div className="absolute inset-y-0 z-10" style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        onMouseDown={onMouseDown}
        onTouchStart={e => { e.preventDefault(); setDragging(true); }}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white shadow-lg" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center cursor-col-resize">
          <div className="flex gap-0.5">
            <ChevronLeft className="w-3 h-3 text-gray-700" />
            <ChevronRight className="w-3 h-3 text-gray-700" />
          </div>
        </div>
      </div>

      {/* Drag hint */}
      {position === 50 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium opacity-80">← Drag to compare →</div>
        </div>
      )}
    </div>
  );
}

// ── Main Gallery Page ────────────────────────────────────────────────────────
interface Props { onNavigate?: (page: string) => void; isAdmin?: boolean; }

export default function BeforeAfterGallery({ onNavigate, isAdmin }: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/gallery`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects?.length > 0 ? data.projects : PLACEHOLDERS);
      } else setProjects(PLACEHOLDERS);
    } catch { setProjects(PLACEHOLDERS); }
    setLoading(false);
  };

  const filtered = category === 'All' ? projects : projects.filter(p => p.category === category);

  const openProject = (project: any, idx: number) => {
    setSelectedProject(project);
    setCurrentIdx(idx);
  };

  const navigate = (dir: number) => {
    const newIdx = (currentIdx + dir + filtered.length) % filtered.length;
    setCurrentIdx(newIdx);
    setSelectedProject(filtered[newIdx]);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#2A2A2A] px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onNavigate && (
            <button onClick={() => onNavigate('landing')} className="text-gray-400 hover:text-white transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">Our Work</h1>
            <p className="text-xs text-gray-500">Drag the slider to see the transformation</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-bold rounded-xl transition hover:opacity-90">
            <Plus className="w-4 h-4" /> Add Project
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="px-4 sm:px-6 py-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition ${category === cat ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-6 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 text-orange-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium">No projects in this category yet</p>
            {isAdmin && <button onClick={() => setShowUploadModal(true)} className="mt-4 px-6 py-2.5 bg-orange-600 text-white rounded-xl font-semibold text-sm">Add First Project</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((project, idx) => (
              <motion.div key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
                onClick={() => openProject(project, idx)}
              >
                <div className="relative rounded-2xl overflow-hidden border border-[#2A2A2A] hover:border-orange-500/40 transition bg-[#1A1A1A]">
                  <BeforeAfterSlider before={project.beforeUrl} after={project.afterUrl} title={project.title} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-white text-sm">{project.title}</h3>
                      <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">{project.category}</span>
                    </div>
                    {project.description && <p className="text-xs text-gray-500 line-clamp-2">{project.description}</p>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A] flex-shrink-0">
            <div>
              <h2 className="font-bold text-white">{selectedProject.title}</h2>
              <p className="text-xs text-gray-500">{selectedProject.category}</p>
            </div>
            <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
            <div className="w-full max-w-4xl">
              <BeforeAfterSlider before={selectedProject.beforeUrl} after={selectedProject.afterUrl} title={selectedProject.title} />
            </div>
            {selectedProject.description && <p className="text-gray-300 text-sm max-w-2xl text-center">{selectedProject.description}</p>}
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"><ChevronLeft className="w-5 h-5 text-white" /></button>
              <span className="text-xs text-gray-500">{currentIdx + 1} / {filtered.length}</span>
              <button onClick={() => navigate(1)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"><ChevronRight className="w-5 h-5 text-white" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && isAdmin && (
        <UploadModal onClose={() => setShowUploadModal(false)} onSaved={() => { setShowUploadModal(false); loadProjects(); }} />
      )}
    </div>
  );
}

// ── Upload Modal (Admin) ─────────────────────────────────────────────────────
function UploadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', category: 'Kitchen', description: '', beforeUrl: '', afterUrl: '' });
  const [beforePreview, setBeforePreview] = useState('');
  const [afterPreview, setAfterPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadPhoto = async (file: File, type: 'before' | 'after') => {
    const reader = new FileReader();
    reader.onload = async e => {
      const base64 = e.target?.result as string;
      if (type === 'before') setBeforePreview(base64);
      else setAfterPreview(base64);

      setUploading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || publicAnonKey;
        const res = await fetch(`${SERVER}/gallery/upload-image`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, filename: file.name, type }),
        });
        const data = await res.json();
        if (data.url) {
          if (type === 'before') setForm(f => ({ ...f, beforeUrl: data.url }));
          else setForm(f => ({ ...f, afterUrl: data.url }));
          toast.success(`${type} photo uploaded!`);
        } else toast.error(data.error || 'Upload failed');
      } catch { toast.error('Upload failed'); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.title || !form.beforeUrl || !form.afterUrl) { toast.error('Add a title and both photos'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      const res = await fetch(`${SERVER}/gallery`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { toast.success('Project added to gallery!'); onSaved(); }
      else { const d = await res.json(); toast.error(d.error || 'Save failed'); }
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Add Before/After Project</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Project Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Kitchen Remodel" className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none">
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Description (optional)</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Describe the transformation..." className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none resize-none" />
        </div>

        {/* Photo uploads */}
        <div className="grid grid-cols-2 gap-4">
          {(['before', 'after'] as const).map(type => (
            <div key={type}>
              <label className="text-xs text-gray-400 mb-1.5 block capitalize">{type} Photo *</label>
              <label className="block cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0], type)} />
                <div className={`aspect-video rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition ${(type === 'before' ? beforePreview : afterPreview) ? 'border-orange-500/50' : 'border-[#2A2A2A] hover:border-orange-500/30'}`}>
                  {(type === 'before' ? beforePreview : afterPreview) ? (
                    <img src={type === 'before' ? beforePreview : afterPreview} alt={type} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3">
                      <Upload className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Upload {type}</p>
                    </div>
                  )}
                </div>
              </label>
              {form[`${type}Url` as 'beforeUrl' | 'afterUrl'] && <p className="text-xs text-green-400 mt-1">✓ Uploaded</p>}
            </div>
          ))}
        </div>

        {uploading && <p className="text-xs text-orange-400 text-center">Uploading photo...</p>}

        <button onClick={save} disabled={saving || uploading || !form.beforeUrl || !form.afterUrl}
          className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl transition disabled:opacity-50">
          {saving ? 'Saving...' : 'Save to Gallery'}
        </button>
      </div>
    </div>
  );
}
