/**
 * WorkRequestFullView — full-screen view of a submitted work request
 * Shows everything: all form fields, photos, videos, floor plan, quote
 */

import { useState, useRef } from 'react';
import {
  X, User, MapPin, Calendar, DollarSign, Clock, Wrench,
  Camera, Video, FileText, ChevronDown, ChevronUp, Play,
  Home, Palette, UtensilsCrossed, Phone, Mail, ZoomIn,
  Upload, Plus, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface Props {
  workRequest: any;
  onClose: () => void;
  embedded?: boolean; // when true, renders inline without fixed overlay
}

export default function WorkRequestFullView({ workRequest: wr, onClose, embedded }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>('photos');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [localVideos, setLocalVideos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `admin-upload/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
      if (error) { console.error('Upload error:', error.message); return null; }
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return publicUrl;
    } catch (e) { return null; }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    toast.loading(`Uploading ${files.length} photo(s)...`, { id: 'upload' });
    const urls: string[] = [];
    for (const f of files) {
      const url = await uploadFile(f, 'project-photos');
      if (url) urls.push(url);
    }
    if (urls.length) {
      setLocalPhotos(prev => [...prev, ...urls]);
      // Also save back to the work request on the server
      await saveMediaToWorkRequest(wr.id, [...allPhotos, ...urls], allVideos);
      toast.success(`${urls.length} photo(s) added!`, { id: 'upload' });
    } else {
      toast.error('Upload failed — check storage bucket permissions', { id: 'upload' });
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    toast.loading(`Uploading video...`, { id: 'upload' });
    const urls: string[] = [];
    for (const f of files) {
      const url = await uploadFile(f, 'project-videos');
      if (url) urls.push(url);
    }
    if (urls.length) {
      setLocalVideos(prev => [...prev, ...urls]);
      await saveMediaToWorkRequest(wr.id, allPhotos, [...allVideos, ...urls]);
      toast.success(`Video added!`, { id: 'upload' });
    } else {
      toast.error('Upload failed', { id: 'upload' });
    }
    setUploading(false);
    e.target.value = '';
  };

  const saveMediaToWorkRequest = async (wrId: string, photos: string[], videos: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests/${wrId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_attachments: { photos, videos } }),
      });
    } catch {}
  };

  const renderContent = () => (
    <div className="space-y-3">
      {photos.length > 0 && (
        <Section title={`📸 Photos (${photos.length})`} id="photos" expanded={expandedSection} toggle={toggle}>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((url, i) => (
              <div key={i} onClick={() => setLightboxUrl(url)} className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500 transition">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                  <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
      {videos.length > 0 && (
        <Section title={`🎥 Videos (${videos.length})`} id="videos" expanded={expandedSection} toggle={toggle}>
          <div className="space-y-3">
            {videos.map((url, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-[#2A2A2A] bg-black">
                <video src={url} controls className="w-full max-h-48" />
              </div>
            ))}
          </div>
        </Section>
      )}
      {blueprints.length > 0 && (
        <Section title={`📋 Blueprints (${blueprints.length})`} id="blueprints" expanded={expandedSection} toggle={toggle}>
          <div className="space-y-2">
            {blueprints.map((url, i) => (
              <div key={i} onClick={() => setLightboxUrl(url)} className="rounded-lg overflow-hidden border border-[#2A2A2A] hover:border-green-500 transition cursor-pointer bg-white">
                <img src={url} alt={`Blueprint ${i + 1}`} className="w-full object-contain max-h-48" />
              </div>
            ))}
          </div>
        </Section>
      )}
      {/* Upload area — always visible so admin can add media */}
      <div className="bg-[#1A1A1A] border border-dashed border-[#3A3A3A] rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3 text-center">
          {photos.length === 0 && videos.length === 0
            ? '📎 No media was uploaded with this request — add photos or videos below'
            : '➕ Add more photos or videos'}
        </p>
        <div className="flex gap-2">
          <input ref={photoInputRef} type="file" multiple accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          <input ref={videoInputRef} type="file" accept="video/*" capture="environment" onChange={handleVideoUpload} className="hidden" />
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 text-xs font-bold rounded-lg transition disabled:opacity-50"
          >
            {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            Add Photos
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-lg transition disabled:opacity-50"
          >
            {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
            Add Video
          </button>
        </div>
      </div>
      <Section title="👤 Client" id="client" expanded={expandedSection} toggle={toggle}>
        <div className="space-y-1.5 text-sm">
          <p className="text-white font-medium">{clientName}</p>
          {clientEmail && <p className="text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{clientEmail}</p>}
          {clientPhone && <p className="text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{clientPhone}</p>}
          {wr.site_address && <p className="text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{wr.site_address}, {wr.city}</p>}
        </div>
      </Section>
      <Section title="🔧 Project Details" id="project" expanded={expandedSection} toggle={toggle}>
        <div className="space-y-1.5 text-sm">
          {wr.serviceType && <Row label="Service" value={wr.serviceType} />}
          {wr.timeline && <Row label="Timeline" value={wr.timeline} />}
          {wr.priority_level && <Row label="Priority" value={wr.priority_level} />}
          {wr.property_type && <Row label="Property" value={wr.property_type} />}
          {wr.total_square_feet > 0 && <Row label="Sq Ft" value={`${wr.total_square_feet} sqft`} />}
          {wr.budget_range && <Row label="Budget" value={`$${(wr.budget_range.min||0).toLocaleString()} – $${(wr.budget_range.max||0).toLocaleString()}`} />}
        </div>
        {wr.description && <p className="mt-3 text-xs text-gray-300 bg-black/40 rounded-lg p-3 leading-relaxed">{wr.description}</p>}
      </Section>
      {(wr.style_preferences?.primary || wr.kitchen_preferences?.layoutType) && (
        <Section title="🎨 Style Preferences" id="style" expanded={expandedSection} toggle={toggle}>
          <div className="space-y-1.5 text-sm">
            {wr.style_preferences?.primary && <Row label="Style" value={wr.style_preferences.primary} />}
            {wr.style_preferences?.interior && <Row label="Interior" value={wr.style_preferences.interior} />}
            {wr.style_preferences?.colorPalette && <Row label="Colors" value={wr.style_preferences.colorPalette} />}
            {wr.kitchen_preferences?.layoutType && <Row label="Kitchen" value={wr.kitchen_preferences.layoutType} />}
            {wr.kitchen_preferences?.countertop && <Row label="Countertop" value={wr.kitchen_preferences.countertop} />}
          </div>
        </Section>
      )}
    </div>
  );
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const toggle = (s: string) => setExpandedSection(prev => prev === s ? null : s);

  const media = wr.media_attachments || wr.media || {};
  const storedPhotos: string[] = (media.photos || wr.photos || []).filter((u: string) => u && u.length > 4);
  const storedVideos: string[] = (media.videos || wr.videos || []).filter((u: string) => u && u.length > 4);
  const blueprints: string[] = (media.blueprints || wr.blueprints || []).filter((u: string) => u && u.length > 4);
  // Combine stored + just-uploaded
  const allPhotos = [...storedPhotos, ...localPhotos];
  const allVideos = [...storedVideos, ...localVideos];
  const photos = allPhotos;
  const videos = allVideos;

  const budget = wr.budget_range;
  const style = wr.style_preferences || {};
  const kitchen = wr.kitchen_preferences || {};

  const clientName  = wr.client_name  || wr.client_info?.name  || 'Customer';
  const clientEmail = wr.client_email || wr.client_info?.email || '';
  const clientPhone = wr.client_phone || wr.client_info?.phone || '';

  if (embedded) {
    // Inline mode — no overlay, renders inside a scrollable panel
    return (
      <div className="flex flex-col h-full">
        {/* Compact header */}
        <div className="px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A] flex-shrink-0">
          <h3 className="font-bold text-white text-sm truncate">{wr.project_name || wr.title || `Work Request — ${clientName}`}</h3>
          <p className="text-xs text-gray-500">{wr.serviceType || wr.project_type} · {clientName} · {clientEmail}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {renderContent()}
        </div>
        {lightboxUrl && (
          <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
            <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
            <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><X className="w-5 h-5 text-white" /></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0A0A0A] border-b border-[#2A2A2A] flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white">{wr.project_name || wr.title || `Work Request — ${clientName}`}</h2>
          <p className="text-sm text-gray-400">{wr.serviceType || wr.project_type} · Submitted {wr.created_at ? new Date(wr.created_at).toLocaleDateString() : 'recently'}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition"><X className="w-6 h-6 text-gray-400" /></button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">

          {/* ── PHOTOS ────────────────────────────────── */}
          {photos.length > 0 && (
            <Section title={`Photos (${photos.length})`} icon={<Camera className="w-5 h-5 text-orange-400" />} id="photos" expanded={expandedSection} toggle={toggle}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((url, i) => (
                  <div key={i} onClick={() => setLightboxUrl(url)} className="aspect-square rounded-xl overflow-hidden cursor-pointer group relative bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500 transition">
                    <img src={url} alt={`Photo ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── VIDEOS ────────────────────────────────── */}
          {videos.length > 0 && (
            <Section title={`Videos (${videos.length})`} icon={<Video className="w-5 h-5 text-blue-400" />} id="videos" expanded={expandedSection} toggle={toggle}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videos.map((url, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-[#2A2A2A] bg-[#0A0A0A]">
                    {playingVideo === url ? (
                      <video src={url} controls autoPlay className="w-full aspect-video" />
                    ) : (
                      <div onClick={() => setPlayingVideo(url)} className="aspect-video flex items-center justify-center cursor-pointer group bg-gradient-to-br from-blue-900/30 to-purple-900/30 hover:from-blue-900/50 hover:to-purple-900/50 transition">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition">
                          <Play className="w-8 h-8 text-white ml-1" fill="white" />
                        </div>
                      </div>
                    )}
                    <p className="px-3 py-2 text-xs text-gray-500">Video {i+1}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── BLUEPRINTS ────────────────────────────── */}
          {blueprints.length > 0 && (
            <Section title={`Blueprints / Plans (${blueprints.length})`} icon={<FileText className="w-5 h-5 text-green-400" />} id="blueprints" expanded={expandedSection} toggle={toggle}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {blueprints.map((url, i) => (
                  <div key={i} onClick={() => setLightboxUrl(url)} className="aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border border-[#2A2A2A] hover:border-green-500 transition bg-white">
                    <img src={url} alt={`Blueprint ${i+1}`} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── CLIENT INFO ───────────────────────────── */}
          <Section title="Client Information" icon={<User className="w-5 h-5 text-orange-400" />} id="client" expanded={expandedSection} toggle={toggle}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" value={clientName} />
              <Field label="Email" value={clientEmail} icon={<Mail className="w-4 h-4 text-gray-500" />} />
              <Field label="Phone" value={clientPhone || 'Not provided'} icon={<Phone className="w-4 h-4 text-gray-500" />} />
              <Field label="Address" value={[wr.site_address, wr.city, wr.state, wr.zip_code].filter(Boolean).join(', ')} icon={<MapPin className="w-4 h-4 text-gray-500" />} />
            </div>
          </Section>

          {/* ── PROJECT DETAILS ───────────────────────── */}
          <Section title="Project Details" icon={<Wrench className="w-5 h-5 text-orange-400" />} id="project" expanded={expandedSection} toggle={toggle}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Service Type" value={wr.serviceType || wr.project_type} />
              <Field label="Priority" value={wr.priority_level || 'Normal'} />
              <Field label="Timeline" value={wr.timeline || 'Not specified'} icon={<Clock className="w-4 h-4 text-gray-500" />} />
              <Field label="Property Type" value={wr.property_type || 'Not specified'} icon={<Home className="w-4 h-4 text-gray-500" />} />
              <Field label="Year Built" value={wr.year_built || 'Unknown'} icon={<Calendar className="w-4 h-4 text-gray-500" />} />
              <Field label="Sq Footage" value={wr.total_square_feet > 0 ? `${wr.total_square_feet?.toLocaleString()} sqft` : 'Not specified'} />
              {budget && <Field label="Budget" value={`$${(budget.min||0).toLocaleString()} – $${(budget.max||0).toLocaleString()}`} icon={<DollarSign className="w-4 h-4 text-gray-500" />} />}
            </div>
            {wr.description && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Customer Description</p>
                <p className="text-sm text-gray-200 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 leading-relaxed">{wr.description}</p>
              </div>
            )}
          </Section>

          {/* ── DESIGN PREFERENCES ────────────────────── */}
          {(style.primary || style.interior || style.colorPalette || kitchen.layoutType) && (
            <Section title="Design & Style Preferences" icon={<Palette className="w-5 h-5 text-purple-400" />} id="design" expanded={expandedSection} toggle={toggle}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {style.primary && <Field label="Arch Style" value={style.primary} />}
                {style.interior && <Field label="Interior Style" value={style.interior} />}
                {style.colorPalette && <Field label="Color Palette" value={style.colorPalette} />}
                {kitchen.layoutType && <Field label="Kitchen Layout" value={kitchen.layoutType} icon={<UtensilsCrossed className="w-4 h-4 text-gray-500" />} />}
                {kitchen.style && <Field label="Cabinet Style" value={kitchen.style} />}
                {kitchen.countertop && <Field label="Countertop" value={kitchen.countertop} />}
              </div>
            </Section>
          )}

          {/* ── AI VIDEO ANALYSIS ─────────────────────── */}
          {wr.aiVideoAnalysis && (
            <Section title="AI Video Analysis Results" icon={<Video className="w-5 h-5 text-green-400" />} id="ai" expanded={expandedSection} toggle={toggle}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {wr.aiVideoAnalysis.roomType && <Field label="Room Type" value={wr.aiVideoAnalysis.roomType} />}
                {wr.aiVideoAnalysis.dimensions && (
                  <Field label="Dimensions" value={`${wr.aiVideoAnalysis.dimensions.length}′ × ${wr.aiVideoAnalysis.dimensions.width}′`} />
                )}
                {wr.aiVideoAnalysis.overallCondition && <Field label="Condition" value={wr.aiVideoAnalysis.overallCondition} />}
                {wr.aiVideoAnalysis.estimatedRenovationCost && (
                  <Field label="AI Cost Est." value={`$${wr.aiVideoAnalysis.estimatedRenovationCost.min?.toLocaleString()} – $${wr.aiVideoAnalysis.estimatedRenovationCost.max?.toLocaleString()}`} />
                )}
              </div>
              {wr.aiVideoAnalysis.recommendations?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">AI Recommendations</p>
                  <ul className="space-y-1">
                    {wr.aiVideoAnalysis.recommendations.slice(0, 5).map((r: any, i: number) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-green-400 mt-0.5 flex-shrink-0">→</span>
                        {typeof r === 'string' ? r : r.recommendation || r.description || JSON.stringify(r)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Full size" className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, id, expanded, toggle, children }: any) {
  const isOpen = expanded === id;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-white text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-white text-right">{value}</span>
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}
