/**
 * SubmitReelForApproval — used by vendors, subcontractors, and advertisers
 * to submit a video reel for Eric's review. Once approved in the Admin
 * Control Center, it automatically publishes to the landing page and
 * customer dashboard.
 */

import { useState } from 'react';
import { Upload, Film, CheckCircle, Clock, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

interface Props {
  submitterName: string;
  submitterType: 'vendor' | 'subcontractor' | 'advertiser';
}

export default function SubmitReelForApproval({ submitterName, submitterType }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Please add a title for your reel'); return; }
    if (!videoUrl.trim() && !thumbnailUrl.trim()) { toast.error('Please provide a video URL or thumbnail image URL'); return; }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/social/submit-reel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title, description, videoUrl, thumbnailUrl, linkUrl,
            submitterName, submitterType,
          }),
        }
      );

      if (res.ok) {
        setSubmitted(true);
        toast.success('Reel submitted for approval! You\'ll be notified once it\'s live.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Submission failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 flex items-center gap-4">
        <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
        <div>
          <p className="font-bold text-white">Reel submitted for review!</p>
          <p className="text-sm text-gray-400 mt-0.5">The Black Phoenix team will review and approve your reel. Once approved it will appear on the main landing page and customer dashboard automatically.</p>
        </div>
        <button onClick={() => { setSubmitted(false); setTitle(''); setDescription(''); setVideoUrl(''); setThumbnailUrl(''); setLinkUrl(''); }}
          className="ml-auto text-gray-500 hover:text-white flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center">
          <Film className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white">Submit a Reel to the Landing Page</h3>
          <p className="text-xs text-gray-400">Once approved by Black Phoenix, your reel will show on the main website & customer dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Reel Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Summer Plumbing Special"
            className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Your Website / Link (optional)</label>
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://yourwebsite.com"
            className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is this reel about? What deal or service are you showcasing?"
            rows={2}
            className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Video URL (YouTube, Vimeo, direct .mp4)</label>
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Thumbnail Image URL</label>
          <input
            value={thumbnailUrl}
            onChange={e => setThumbnailUrl(e.target.value)}
            placeholder="https://... (image shown as preview)"
            className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Preview */}
      {thumbnailUrl && (
        <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
          <img src={thumbnailUrl} alt="Preview" className="w-12 h-20 object-cover rounded-lg" />
          <div>
            <p className="text-sm font-bold text-white">{title || 'Reel Title'}</p>
            <p className="text-xs text-gray-500">{submitterName}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl transition disabled:opacity-50"
        >
          {submitting
            ? <><Clock className="w-4 h-4 animate-spin" /> Submitting...</>
            : <><Upload className="w-4 h-4" /> Submit for Approval</>
          }
        </button>
      </div>

      <p className="text-xs text-gray-600 text-center">
        Submitted reels go through a quick review before going live. Usually approved within 24 hours.
      </p>
    </div>
  );
}
