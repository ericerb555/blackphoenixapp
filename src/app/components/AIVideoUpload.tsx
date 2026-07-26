// AI Video/Image Upload Component for Floor Plan Generation
import { useState, useRef } from 'react';
import { Upload, Camera, Video, Image as ImageIcon, Wand2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CanvasElement {
  id: string;
  type: 'wall' | 'door' | 'window' | 'room' | 'furniture';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color?: string;
  label?: string;
}

interface AIVideoUploadProps {
  onFloorPlanGenerated: (elements: CanvasElement[], metadata: any) => void;
  onClose: () => void;
  onNavigateToCamera: (cameraType: 'change-order' | 'work-request') => void;
}

type UploadMode = 'image' | 'video' | 'description' | 'camera';

export default function AIVideoUpload({
  onFloorPlanGenerated,
  onClose,
  onNavigateToCamera
}: AIVideoUploadProps) {
  const [mode, setMode] = useState<UploadMode>('image');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (mode === 'image' && !file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (mode === 'video' && !file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyzeImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log('🔍 Analyzing image with AI...');

      // Convert image to base64
      const imageBase64 = await convertFileToBase64(selectedFile);

      // Call AI analysis endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/ai-floorplan/analyze-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            imageBase64,
            analysisType: 'full-analysis'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const data = await response.json();
      console.log('✅ AI Analysis complete:', data);

      if (data.success && data.project) {
        setSuccess(true);
        setTimeout(() => {
          onFloorPlanGenerated(data.project.elements, {
            source: 'ai-image',
            measurements: data.project.measurements,
            rawAnalysis: data.rawAnalysis
          });
        }, 1000);
      } else {
        throw new Error('No floor plan data returned');
      }

    } catch (err: any) {
      console.error('Error analyzing image:', err);
      setError(err.message || 'Failed to analyze image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateFromDescription = async () => {
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log('📝 Generating floor plan from description...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/ai-floorplan/generate-from-description`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ description })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate floor plan');
      }

      const data = await response.json();
      console.log('✅ Floor plan generated:', data);

      if (data.success && data.project) {
        setSuccess(true);
        setTimeout(() => {
          onFloorPlanGenerated(data.project.elements, {
            source: 'ai-description',
            description,
            measurements: data.project.measurements,
            rawAnalysis: data.rawAnalysis
          });
        }, 1000);
      } else {
        throw new Error('No floor plan data returned');
      }

    } catch (err: any) {
      console.error('Error generating from description:', err);
      setError(err.message || 'Failed to generate floor plan. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const renderModeContent = () => {
    switch (mode) {
      case 'image':
        return (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-12 text-center hover:border-[#ea580c] transition-colors cursor-pointer"
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-64 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-gray-400">
                    {selectedFile?.name}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="text-sm text-[#ea580c] hover:underline"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-white mb-2">Click to upload an image</p>
                  <p className="text-sm text-gray-400">
                    JPG, PNG, or WebP • Max 10MB
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile && (
              <button
                onClick={handleAnalyzeImage}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Floor Plan
                  </>
                )}
              </button>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-12 text-center">
              <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-white mb-2">Video Processing</p>
              <p className="text-sm text-gray-400 mb-4">
                Full video frame extraction coming in Phase 3
              </p>
              <div className="text-sm text-gray-500 italic">
                For now, please extract a frame from your video and upload it as an image
              </div>
            </div>
          </div>
        );

      case 'description':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Describe Your Space
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: A 3 bedroom house with an open concept living room and kitchen. The master bedroom has an ensuite bathroom. Total area approximately 1500 sq ft."
                className="w-full h-40 px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] resize-none"
              />
            </div>

            <button
              onClick={handleGenerateFromDescription}
              disabled={processing || !description.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Floor Plan
                </>
              )}
            </button>
          </div>
        );

      case 'camera':
        return (
          <div className="space-y-4">
            <p className="text-gray-400 mb-4">
              Connect to existing camera systems to capture space images
            </p>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => onNavigateToCamera('change-order')}
                className="p-6 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors text-left"
              >
                <Camera className="w-8 h-8 text-[#ea580c] mb-3" />
                <h3 className="font-semibold text-white mb-2">Change Order Camera</h3>
                <p className="text-sm text-gray-400">
                  Capture existing spaces for renovation planning
                </p>
              </button>

              <button
                onClick={() => onNavigateToCamera('work-request')}
                className="p-6 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors text-left"
              >
                <Video className="w-8 h-8 text-[#ea580c] mb-3" />
                <h3 className="font-semibold text-white mb-2">Work Request Camera</h3>
                <p className="text-sm text-gray-400">
                  Document work areas with video/photo capture
                </p>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              AI Floor Plan Generator
            </h2>
            <p className="text-sm text-gray-400">
              Upload images, describe your space, or connect to camera systems
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 p-4 border-b border-[#2A2A2A]">
          <button
            onClick={() => setMode('image')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              mode === 'image'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Image Upload
          </button>

          <button
            onClick={() => setMode('video')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              mode === 'video'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
          >
            <Video className="w-4 h-4" />
            Video
          </button>

          <button
            onClick={() => setMode('description')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              mode === 'description'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            AI Description
          </button>

          <button
            onClick={() => setMode('camera')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              mode === 'camera'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
          >
            <Camera className="w-4 h-4" />
            Camera Systems
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderModeContent()}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-500 font-semibold">Error</p>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-500 font-semibold">Success!</p>
                <p className="text-sm text-green-400">
                  Floor plan generated successfully. Loading...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A2A] bg-[#0A0A0A] rounded-b-xl">
          <p className="text-xs text-gray-500 text-center">
            Powered by OpenAI Vision API • Phase 2 - AI Video Processing
          </p>
        </div>
      </div>
    </div>
  );
}
