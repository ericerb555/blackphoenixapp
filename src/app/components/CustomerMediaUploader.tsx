/**
 * Customer Media Uploader
 * 
 * Allows uploading photos and videos for work orders
 * In production, this would integrate with cloud storage (S3, Cloudinary, etc.)
 * For testing, provides instructions for using free hosting services
 */

import { useState } from 'react';
import { Upload, Image, Video, X, Link2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from './ui/button/PrimaryButton';
import { DangerButton } from './ui/button/DangerButton';

interface CustomerMediaUploaderProps {
  workOrderId: string;
  currentPhotos: string[];
  currentVideos: string[];
  onMediaUpdated: (photos: string[], videos: string[]) => void;
}

export default function CustomerMediaUploader({
  workOrderId,
  currentPhotos,
  currentVideos,
  onMediaUpdated
}: CustomerMediaUploaderProps) {
  const [photos, setPhotos] = useState<string[]>(currentPhotos);
  const [videos, setVideos] = useState<string[]>(currentVideos);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const addPhoto = () => {
    if (!newPhotoUrl.trim()) {
      toast.error('Please enter a photo URL');
      return;
    }
    
    // Validate URL
    if (!newPhotoUrl.startsWith('http')) {
      toast.error('Please enter a valid URL starting with http:// or https://');
      return;
    }
    
    const updated = [...photos, newPhotoUrl];
    setPhotos(updated);
    setNewPhotoUrl('');
    onMediaUpdated(updated, videos);
    toast.success('Photo added successfully');
  };

  const addVideo = () => {
    if (!newVideoUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }
    
    // Validate URL
    if (!newVideoUrl.startsWith('http')) {
      toast.error('Please enter a valid URL starting with http:// or https://');
      return;
    }
    
    const updated = [...videos, newVideoUrl];
    setVideos(updated);
    setNewVideoUrl('');
    onMediaUpdated(photos, updated);
    toast.success('Video added successfully');
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    onMediaUpdated(updated, videos);
    toast.success('Photo removed');
  };

  const removeVideo = (index: number) => {
    const updated = videos.filter((_, i) => i !== index);
    setVideos(updated);
    onMediaUpdated(photos, updated);
    toast.success('Video removed');
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Customer Media</h3>
          <p className="text-sm text-gray-400">
            Work Order: {workOrderId}
          </p>
        </div>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition border border-blue-500/30"
        >
          {showInstructions ? 'Hide' : 'Show'} Instructions
        </button>
      </div>

      {/* Instructions */}
      {showInstructions && (
        <div className="bg-blue-950/20 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-2">How to Upload Your Own Kitchen Photos/Videos:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Take 5-10 photos of YOUR actual kitchen from different angles</li>
                <li>Record 1-2 walkthrough videos of YOUR kitchen</li>
                <li>Upload to a free hosting service:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                    <li><strong>ImgBB.com</strong> - Free image hosting, no account needed</li>
                    <li><strong>Imgur.com</strong> - Free image/video hosting</li>
                    <li><strong>Google Drive</strong> - Upload and set to "Anyone with link can view"</li>
                    <li><strong>Dropbox</strong> - Share public link</li>
                  </ul>
                </li>
                <li>Copy the direct image/video URL</li>
                <li>Paste below and click "Add"</li>
              </ol>
              <p className="mt-3 font-semibold text-yellow-300">
                ⚠️ CRITICAL: ALL photos and videos must be of the SAME kitchen!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Photos Section */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Image className="w-5 h-5 text-orange-400" />
          Photos ({photos.length})
        </h4>

        {/* Current Photos */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={photo}
                  alt={`Photo ${idx + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border border-[#2A2A2A]"
                />
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 rounded-lg opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                  Photo {idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Photo */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newPhotoUrl}
            onChange={(e) => setNewPhotoUrl(e.target.value)}
            placeholder="Paste photo URL (e.g., https://i.ibb.co/...)"
            className="flex-1 px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
            onKeyDown={(e) => e.key === 'Enter' && addPhoto()}
          />
          <button
            onClick={addPhoto}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-semibold flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Add Photo
          </button>
        </div>
      </div>

      {/* Videos Section */}
      <div>
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Video className="w-5 h-5 text-purple-400" />
          Videos ({videos.length})
        </h4>

        {/* Current Videos */}
        {videos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {videos.map((video, idx) => (
              <div key={idx} className="relative group">
                <video
                  src={video}
                  className="w-full aspect-video object-cover rounded-lg border border-[#2A2A2A]"
                  controls
                />
                <button
                  onClick={() => removeVideo(idx)}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 rounded-lg opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                  Video {idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Video */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            placeholder="Paste video URL (e.g., https://www.dropbox.com/...)"
            className="flex-1 px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            onKeyDown={(e) => e.key === 'Enter' && addVideo()}
          />
          <button
            onClick={addVideo}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-semibold flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Add Video
          </button>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
        <h5 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
          Media Requirements
        </h5>
        <div className="space-y-2 text-sm">
          <div className={`flex items-center gap-2 ${photos.length >= 5 ? 'text-green-400' : 'text-yellow-400'}`}>
            {photos.length >= 5 ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>
              {photos.length >= 5 
                ? `✓ ${photos.length} photos (minimum 5 met)` 
                : `${photos.length}/5 photos (need ${5 - photos.length} more)`}
            </span>
          </div>
          <div className={`flex items-center gap-2 ${videos.length >= 1 ? 'text-green-400' : 'text-yellow-400'}`}>
            {videos.length >= 1 ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>
              {videos.length >= 1 
                ? `✓ ${videos.length} video(s) (minimum 1 met)` 
                : `${videos.length}/1 videos (need ${1 - videos.length} more)`}
            </span>
          </div>
          <div className={`flex items-center gap-2 text-blue-400`}>
            <AlertCircle className="w-4 h-4" />
            <span>
              All media must be of the SAME kitchen location
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
