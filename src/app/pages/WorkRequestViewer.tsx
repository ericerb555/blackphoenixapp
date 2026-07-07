/**
 * Work Request Viewer — standalone page showing every submitted work request
 * with full details, photos, and videos. Accessible from the pipeline,
 * admin alerts, and the sidebar nav.
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft, Camera, Video, FileText, User, MapPin, DollarSign,
  Clock, Wrench, Home, Palette, UtensilsCrossed, Phone, Mail,
  Play, ZoomIn, X, ChevronDown, ChevronUp, RefreshCw, Eye,
  Calendar, Sparkles
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

interface WorkRequestViewerProps {
  onNavigate?: (page: string) => void;
  preloadedId?: string; // auto-open a specific request
}

export default function WorkRequestViewer({ onNavigate, preloadedId }: WorkRequestViewerProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string>('photos');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;

      // Try server endpoint first
      let all: any[] = [];
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/work-requests`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          all = Array.isArray(data) ? data : (data.workRequests || []);
        }
      } catch {}

      // Fallback: read directly from KV store if server returned nothing
      if (all.length === 0) {
        try {
          // Read all_work_requests directly from kv_store table
          const { data: kvData } = await supabase
            .from('kv_store_57095a78')
            .select('value')
            .eq('key', 'all_work_requests')
            .single();
          if (kvData?.value && Array.isArray(kvData.value)) {
            all = kvData.value;
            console.log('✅ Loaded work requests directly from KV store:', all.length);
          }
        } catch {}
      }

      // Fallback 2: check wr_index and individual wr: keys
      if (all.length === 0) {
        try {
          const { data: indexData } = await supabase
            .from('kv_store_57095a78')
            .select('value')
            .eq('key', 'wr_index')
            .single();
          if (indexData?.value && Array.isArray(indexData.value) && indexData.value.length > 0) {
            const ids: string[] = indexData.value;
            const { data: items } = await supabase
              .from('kv_store_57095a78')
              .select('key, value')
              .in('key', ids.slice(0, 50).map(id => `wr:${id}`));
            if (items) all = items.map((i: any) => i.value).filter(Boolean);
            console.log('✅ Loaded work requests from wr: keys:', all.length);
          }
        } catch {}
      }

      setRequests(all);

      // Auto-open if a specific ID was passed or stored
      const openId = preloadedId || localStorage.getItem('viewer_open_request');
      if (openId) {
        localStorage.removeItem('viewer_open_request');
        const target = all.find((r: any) => r.id === openId);
        if (target) setSelected(target);
      }
    } catch (err) {
      console.error('Failed to load work requests:', err);
    }
    setLoading(false);
  };

  const toggle = (s: string) => setOpenSection(prev => prev === s ? '' : s);

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────
  if (selected) {
    const wr = selected;
    const media = wr.media_attachments || wr.media || {};
    // Accept any URL (https) or even base64 data URIs for photos
    const photos: string[] = (media.photos || wr.photos || []).filter((u: string) => u && u.length > 5);
    const videos: string[] = (media.videos || wr.videos || []).filter((u: string) => u && u.length > 5);
    const blueprints: string[] = (media.blueprints || wr.blueprints || []).filter((u: string) => u && u.length > 5);
    const budget = wr.budget_range;
    const style = wr.style_preferences || {};
    const kitchen = wr.kitchen_preferences || {};
    const clientName  = wr.client_name  || wr.client_info?.name  || 'Customer';
    const clientEmail = wr.client_email || wr.client_info?.email || '';
    const clientPhone = wr.client_phone || wr.client_info?.phone || '';

    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#2A2A2A] px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">All Requests</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{wr.project_name || wr.title || `${wr.serviceType} — ${clientName}`}</h1>
            <p className="text-xs text-gray-500">{wr.serviceType || wr.project_type} · {wr.created_at ? new Date(wr.created_at).toLocaleDateString() : 'Recently submitted'}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-3">

          {/* ── PHOTOS ─────────────────────────────────────── */}
          {photos.length > 0 && (
            <Accordion title={`Photos — ${photos.length} uploaded`} icon={<Camera className="w-4 h-4 text-orange-400" />} id="photos" open={openSection} toggle={toggle}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((url, i) => (
                  <div key={i} onClick={() => setLightbox(url)} className="aspect-square rounded-xl overflow-hidden cursor-pointer group relative bg-black border border-[#2A2A2A] hover:border-orange-500 transition">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <span className="absolute bottom-2 left-2 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">#{i + 1}</span>
                  </div>
                ))}
              </div>
            </Accordion>
          )}

          {/* ── VIDEOS ─────────────────────────────────────── */}
          {videos.length > 0 && (
            <Accordion title={`Videos — ${videos.length} uploaded`} icon={<Video className="w-4 h-4 text-blue-400" />} id="videos" open={openSection} toggle={toggle}>
              <div className="space-y-4">
                {videos.map((url, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-[#2A2A2A] bg-black">
                    <p className="px-4 py-2 text-xs text-gray-500 border-b border-[#2A2A2A]">Video {i + 1}</p>
                    {playingVideo === url ? (
                      <video src={url} controls autoPlay className="w-full max-h-96" />
                    ) : (
                      <div onClick={() => setPlayingVideo(url)} className="aspect-video flex items-center justify-center cursor-pointer bg-gradient-to-br from-blue-900/20 to-purple-900/20 hover:from-blue-900/30 hover:to-purple-900/30 transition group">
                        <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition shadow-xl">
                          <Play className="w-7 h-7 text-white ml-1" fill="white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Accordion>
          )}

          {/* ── BLUEPRINTS ─────────────────────────────────── */}
          {blueprints.length > 0 && (
            <Accordion title={`Plans / Blueprints — ${blueprints.length} uploaded`} icon={<FileText className="w-4 h-4 text-green-400" />} id="blueprints" open={openSection} toggle={toggle}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {blueprints.map((url, i) => (
                  <div key={i} onClick={() => setLightbox(url)} className="rounded-xl overflow-hidden border border-[#2A2A2A] hover:border-green-500 transition cursor-pointer bg-white">
                    <img src={url} alt={`Blueprint ${i + 1}`} className="w-full object-contain max-h-64" />
                  </div>
                ))}
              </div>
            </Accordion>
          )}

          {/* No media — show what IS stored for debugging */}
          {photos.length === 0 && videos.length === 0 && blueprints.length === 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center gap-3">
                <Camera className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-400">No media found in this request</span>
              </div>
              <div className="px-5 py-4 space-y-2">
                <p className="text-xs text-gray-500 mb-3">
                  This request was submitted without photos/videos, or the files failed to upload.
                  Storage buckets are now auto-created — future submissions will work correctly.
                </p>
                <p className="text-xs text-gray-600 font-mono">media_attachments: {JSON.stringify(wr.media_attachments || wr.media || {})}</p>
                {/* Check if there are any photo-like fields anywhere in the work request */}
                {Object.entries(wr).filter(([k]) => k.toLowerCase().includes('photo') || k.toLowerCase().includes('video') || k.toLowerCase().includes('image')).map(([k, v]) => (
                  <p key={k} className="text-xs text-gray-600 font-mono">{k}: {JSON.stringify(v)}</p>
                ))}
              </div>
            </div>
          )}

          {/* ── CLIENT INFO ────────────────────────────────── */}
          <Accordion title="Client Information" icon={<User className="w-4 h-4 text-orange-400" />} id="client" open={openSection} toggle={toggle}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard label="Full Name" value={clientName} />
              <InfoCard label="Email" value={clientEmail} icon={<Mail className="w-3.5 h-3.5 text-gray-500" />} />
              <InfoCard label="Phone" value={clientPhone || 'Not provided'} icon={<Phone className="w-3.5 h-3.5 text-gray-500" />} />
              <InfoCard label="Address" value={[wr.site_address, wr.city, wr.state, wr.zip_code].filter(Boolean).join(', ') || 'Not provided'} icon={<MapPin className="w-3.5 h-3.5 text-gray-500" />} />
            </div>
          </Accordion>

          {/* ── PROJECT DETAILS ────────────────────────────── */}
          <Accordion title="Project Details" icon={<Wrench className="w-4 h-4 text-orange-400" />} id="project" open={openSection} toggle={toggle}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCard label="Service Type" value={wr.serviceType || wr.project_type} icon={<Wrench className="w-3.5 h-3.5 text-gray-500" />} />
              <InfoCard label="Priority" value={wr.priority_level || 'Normal'} />
              <InfoCard label="Timeline" value={wr.timeline || 'Not specified'} icon={<Clock className="w-3.5 h-3.5 text-gray-500" />} />
              <InfoCard label="Property Type" value={wr.property_type || 'Not specified'} icon={<Home className="w-3.5 h-3.5 text-gray-500" />} />
              <InfoCard label="Year Built" value={wr.year_built || 'Unknown'} icon={<Calendar className="w-3.5 h-3.5 text-gray-500" />} />
              <InfoCard label="Square Footage" value={wr.total_square_feet > 0 ? `${Number(wr.total_square_feet).toLocaleString()} sqft` : 'Not specified'} />
              {budget && <InfoCard label="Budget Range" value={`$${(budget.min || 0).toLocaleString()} – $${(budget.max || 0).toLocaleString()}`} icon={<DollarSign className="w-3.5 h-3.5 text-gray-500" />} />}
            </div>
            {wr.description && (
              <div className="mt-4 bg-black/40 border border-[#2A2A2A] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2">Customer Description</p>
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{wr.description}</p>
              </div>
            )}
          </Accordion>

          {/* ── DESIGN PREFERENCES ─────────────────────────── */}
          {(style.primary || style.interior || style.colorPalette || kitchen.layoutType) && (
            <Accordion title="Design & Style Preferences" icon={<Palette className="w-4 h-4 text-purple-400" />} id="design" open={openSection} toggle={toggle}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {style.primary && <InfoCard label="Arch Style" value={style.primary} />}
                {style.interior && <InfoCard label="Interior Style" value={style.interior} />}
                {style.colorPalette && <InfoCard label="Color Palette" value={style.colorPalette} />}
                {kitchen.layoutType && <InfoCard label="Kitchen Layout" value={kitchen.layoutType} icon={<UtensilsCrossed className="w-3.5 h-3.5 text-gray-500" />} />}
                {kitchen.style && <InfoCard label="Cabinet Style" value={kitchen.style} />}
                {kitchen.countertop && <InfoCard label="Countertop" value={kitchen.countertop} />}
              </div>
            </Accordion>
          )}

          {/* ── AI VIDEO ANALYSIS ──────────────────────────── */}
          {wr.aiVideoAnalysis && (
            <Accordion title="AI Video Analysis" icon={<Sparkles className="w-4 h-4 text-green-400" />} id="ai" open={openSection} toggle={toggle}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {wr.aiVideoAnalysis.roomType && <InfoCard label="Room Type" value={wr.aiVideoAnalysis.roomType} />}
                {wr.aiVideoAnalysis.dimensions && (
                  <InfoCard label="Dimensions" value={`${wr.aiVideoAnalysis.dimensions.length}′ × ${wr.aiVideoAnalysis.dimensions.width}′`} />
                )}
                {wr.aiVideoAnalysis.overallCondition && <InfoCard label="Condition" value={wr.aiVideoAnalysis.overallCondition} />}
              </div>
              {wr.aiVideoAnalysis.recommendations?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Recommendations</p>
                  <ul className="space-y-1.5">
                    {wr.aiVideoAnalysis.recommendations.slice(0, 6).map((r: any, i: number) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-green-400 flex-shrink-0">→</span>
                        {typeof r === 'string' ? r : r.recommendation || r.description || ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Accordion>
          )}

        </div>

        {/* Lightbox */}
        {lightbox && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#2A2A2A] px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        {onNavigate && (
          <button onClick={() => onNavigate('unified-dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold">Work Requests</h1>
          <p className="text-xs text-gray-500">{requests.length} submitted</p>
        </div>
        <button onClick={loadRequests} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-[#2A2A2A] rounded-lg text-sm text-gray-400 hover:text-white transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-400">No work requests yet</p>
            <p className="text-sm mt-1">Submitted work requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((wr: any) => {
              const media = wr.media_attachments || wr.media || {};
              const photoCount = (media.photos || wr.photos || []).filter((u: string) => u?.startsWith('https://')).length;
              const videoCount = (media.videos || wr.videos || []).filter((u: string) => u?.startsWith('https://')).length;
              const clientName = wr.client_name || wr.client_info?.name || wr.clientName || 'Customer';
              const budget = wr.budget_range;

              return (
                <button
                  key={wr.id}
                  onClick={() => { setSelected(wr); setOpenSection('photos'); setPlayingVideo(null); }}
                  className="w-full text-left bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 rounded-2xl p-5 transition-all hover:bg-orange-500/5 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${wr.status === 'pending' ? 'bg-orange-400' : wr.status === 'in-progress' ? 'bg-blue-400' : 'bg-green-400'}`} />
                        <h3 className="font-bold text-white group-hover:text-orange-300 transition truncate">
                          {wr.project_name || wr.title || `${wr.serviceType || 'Service'} — ${clientName}`}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{clientName}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{wr.client_email || wr.client_info?.email || ''}</span>
                        {wr.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{wr.city}, {wr.state}</span>}
                        {budget && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${(budget.min||0).toLocaleString()}–${(budget.max||0).toLocaleString()}</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{wr.created_at ? new Date(wr.created_at).toLocaleDateString() : 'Recent'}</span>
                      </div>
                      <div className="flex gap-2">
                        {photoCount > 0 && <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full flex items-center gap-1"><Camera className="w-3 h-3" />{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>}
                        {videoCount > 0 && <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full flex items-center gap-1"><Video className="w-3 h-3" />{videoCount} video{videoCount !== 1 ? 's' : ''}</span>}
                        <span className="text-xs px-2 py-0.5 bg-[#2A2A2A] text-gray-400 rounded-full capitalize">{wr.status || 'pending'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-orange-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        <Eye className="w-3.5 h-3.5" /> View
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Accordion({ title, icon, id, open, toggle, children }: any) {
  const isOpen = open === id;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition text-left">
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-white text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {isOpen && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  if (!value || value === 'Not provided' || value === 'Not specified' || value === 'Unknown') {
    return (
      <div className="bg-black/30 border border-[#1A1A1A] rounded-xl p-3">
        <p className="text-xs text-gray-600 mb-0.5">{label}</p>
        <p className="text-sm text-gray-600 italic">Not provided</p>
      </div>
    );
  }
  return (
    <div className="bg-black/40 border border-[#2A2A2A] rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}
