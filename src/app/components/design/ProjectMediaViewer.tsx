import React, { useState } from 'react';
import { Camera, Video, X, Maximize2, Play, Pause, ExternalLink, Download, Info, Folder } from 'lucide-react';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { SecondaryButton } from '../ui/button/SecondaryButton';

interface ProjectData {
  id: string;
  name: string;
  client: string;
  type: string;
  photos: string[];
  videos: string[];
}

interface ProjectMediaViewerProps {
  projectData: ProjectData | null;
}

export function ProjectMediaViewer({ projectData }: ProjectMediaViewerProps) {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'photo' | 'video'>('photo');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  if (!projectData) {
    return (
      <div className="p-4">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 text-center">
          <Folder className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-400 mb-2">No Project Loaded</h3>
          <p className="text-xs text-gray-500">
            Load a quote to view project photos and videos
          </p>
        </div>
      </div>
    );
  }

  const hasMedia = projectData.photos.length > 0 || projectData.videos.length > 0;

  if (!hasMedia) {
    return (
      <div className="p-4 space-y-4">
        {/* Project Info */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-orange-500" />
            Project Information
          </h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-gray-400">Project:</dt>
              <dd className="text-white font-medium">{projectData.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Client:</dt>
              <dd className="text-white font-medium">{projectData.client}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Type:</dt>
              <dd className="text-white font-medium">{projectData.type}</dd>
            </div>
          </dl>
        </div>

        {/* No Media Message */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 text-center">
          <Camera className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-400 mb-2">No Media Available</h3>
          <p className="text-xs text-gray-500">
            This project doesn't have any photos or videos yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project Info Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Folder className="w-4 h-4 text-orange-500" />
          Project Details
        </h3>
        <dl className="space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-gray-400">Name:</dt>
            <dd className="text-white font-medium truncate ml-2">{projectData.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Client:</dt>
            <dd className="text-white font-medium truncate ml-2">{projectData.client}</dd>
          </div>
        </dl>
      </div>

      {/* Media Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Photos Section */}
        {projectData.photos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-400" />
              Photos ({projectData.photos.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {projectData.photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedMediaIndex(index);
                    setSelectedMediaType('photo');
                    setIsFullscreen(true);
                  }}
                  className="relative aspect-square bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-orange-500 transition group"
                >
                  <img
                    src={photo}
                    alt={`Project photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-xs text-white font-medium">Photo {index + 1}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Videos Section */}
        {projectData.videos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-400" />
              Videos ({projectData.videos.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {projectData.videos.map((video, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedMediaIndex(index);
                    setSelectedMediaType('video');
                    setIsFullscreen(true);
                  }}
                  className="relative aspect-square bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-purple-500 transition group"
                >
                  <video
                    src={video}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-purple-500/80 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-xs text-white font-medium">Video {index + 1}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Media Viewer */}
      {isFullscreen && selectedMediaIndex !== null && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[200] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/50 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              {selectedMediaType === 'photo' ? (
                <Camera className="w-5 h-5 text-blue-400" />
              ) : (
                <Video className="w-5 h-5 text-purple-400" />
              )}
              <div>
                <h3 className="text-white font-semibold">
                  {selectedMediaType === 'photo' ? 'Photo' : 'Video'} {selectedMediaIndex + 1}
                </h3>
                <p className="text-xs text-gray-400">{projectData.name}</p>
              </div>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Media Display */}
          <div className="flex-1 flex items-center justify-center p-8">
            {selectedMediaType === 'photo' ? (
              <img
                src={projectData.photos[selectedMediaIndex]}
                alt={`Project photo ${selectedMediaIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <video
                src={projectData.videos[selectedMediaIndex]}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg shadow-2xl"
              />
            )}
          </div>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/50 border-t border-zinc-800">
            <SecondaryButton
              onClick={() => {
                const mediaArray = selectedMediaType === 'photo' ? projectData.photos : projectData.videos;
                const newIndex = selectedMediaIndex > 0 ? selectedMediaIndex - 1 : mediaArray.length - 1;
                setSelectedMediaIndex(newIndex);
              }}
            >
              Previous
            </SecondaryButton>
            <span className="text-sm text-gray-400">
              {selectedMediaIndex + 1} of {selectedMediaType === 'photo' ? projectData.photos.length : projectData.videos.length}
            </span>
            <PrimaryButton
              onClick={() => {
                const mediaArray = selectedMediaType === 'photo' ? projectData.photos : projectData.videos;
                const newIndex = selectedMediaIndex < mediaArray.length - 1 ? selectedMediaIndex + 1 : 0;
                setSelectedMediaIndex(newIndex);
              }}
            >
              Next
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
