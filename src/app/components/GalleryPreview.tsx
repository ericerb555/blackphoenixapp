/**
 * GalleryPreview — shows 3 before/after projects on the landing page
 * with a "View All Our Work" button linking to the full gallery.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const PLACEHOLDERS = [
  { id: 'p1', title: 'Full Kitchen Remodel', category: 'Kitchen', beforeUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80', afterUrl: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80' },
  { id: 'p2', title: 'Bathroom Renovation', category: 'Bathroom', beforeUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80', afterUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80' },
  { id: 'p3', title: 'Exterior Home Makeover', category: 'Exterior', beforeUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80', afterUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80' },
];

function MiniSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const update = useCallback((clientX: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos(Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  useEffect(() => {
    const mm = (e: MouseEvent) => { if (dragging) update(e.clientX); };
    const mu = () => setDragging(false);
    const tm = (e: TouchEvent) => { if (dragging) update(e.touches[0].clientX); };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    window.addEventListener('touchmove', tm);
    window.addEventListener('touchend', mu);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', mu);
    };
  }, [dragging, update]);

  return (
    <div ref={ref} className="relative w-full aspect-[4/3] overflow-hidden cursor-col-resize" style={{ touchAction: 'none' }}>
      <img src={after} alt="after" className="absolute inset-0 w-full h-full object-cover" />
      <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">AFTER</span>
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt="before" className="w-full h-full object-cover" style={{ width: `${100 / (pos / 100)}%` }} />
        <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">BEFORE</span>
      </div>
      {/* Divider */}
      <div className="absolute inset-y-0 z-10" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        onMouseDown={e => { e.preventDefault(); setDragging(true); }}
        onTouchStart={e => { e.preventDefault(); setDragging(true); }}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/80" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <ChevronLeft className="w-2.5 h-2.5 text-gray-700" />
            <ChevronRight className="w-2.5 h-2.5 text-gray-700" />
          </div>
        </div>
      </div>
      {pos === 50 && (
        <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
          <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">← drag →</span>
        </div>
      )}
    </div>
  );
}

export default function GalleryPreview({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [projects, setProjects] = useState(PLACEHOLDERS);

  useEffect(() => {
    fetch(`${SERVER}/gallery`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      .then(r => r.ok ? r.json() : { projects: [] })
      .then(d => { if (d.projects?.length >= 3) setProjects(d.projects.slice(0, 3)); })
      .catch(() => {});
  }, []);

  return (
    <section className="py-14 px-4 flex justify-center">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">Our Work</h2>
            <p className="text-gray-400">Real projects — drag the slider to see the transformation</p>
          </div>
          <button
            onClick={() => onNavigate ? onNavigate('gallery') : (window.location.href = '/gallery')}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-[#2A2A2A] hover:border-orange-500/40 text-gray-300 hover:text-white text-sm font-semibold rounded-xl transition"
          >
            View All Projects <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3 project cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.slice(0, 3).map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-orange-500/30 transition group"
            >
              <MiniSlider before={p.beforeUrl} after={p.afterUrl} />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">{p.title}</p>
                  <p className="text-xs text-gray-500">{p.category}</p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">{p.category}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-6 flex justify-center sm:hidden">
          <button
            onClick={() => onNavigate ? onNavigate('gallery') : (window.location.href = '/gallery')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl transition"
          >
            View All Our Work <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
