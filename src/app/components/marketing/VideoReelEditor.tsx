import { useState } from 'react';
import {
  Upload, Video, Image, Music, Type, Sparkles, Wand2,
  Play, Pause, Save, Send, X, Plus, Settings, Eye,
  Clock, Layers, Volume2, Scissors, Copy, Download,
  RefreshCw, Zap, MessageSquare, FileText, AlertCircle
} from 'lucide-react';
import { TextArea } from '../ui/input/TextArea';

interface VideoReelEditorProps {
  video?: any;
}

export function VideoReelEditor({ video }: VideoReelEditorProps) {
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [projectSettings, setProjectSettings] = useState({
    title: video?.title || '',
    description: video?.description || '',
    duration: '0:00',
    format: '16:9',
    quality: '1080p',
  });

  const modules = [
    { id: 'crm', name: 'CRM Management', enabled: true },
    { id: 'scheduling', name: 'Master Scheduling', enabled: true },
    { id: 'quotes', name: 'Quote Builder', enabled: false },
    { id: 'contracts', name: 'Contracts', enabled: false },
    { id: 'reports', name: 'Reports & Analytics', enabled: true },
    { id: 'customers', name: 'Customer Portal', enabled: false },
    { id: 'work-orders', name: 'Work Orders', enabled: false },
    { id: 'invoicing', name: 'Invoicing', enabled: false },
  ];

  const aiTemplates = [
    {
      id: 1,
      name: 'Product Demo',
      description: 'Create a professional product demonstration video',
      prompt: 'Create a 2-minute product demo showcasing key features and benefits',
      icon: Video
    },
    {
      id: 2,
      name: 'Tutorial',
      description: 'Step-by-step instructional video',
      prompt: 'Create a tutorial video explaining how to use this feature step by step',
      icon: FileText
    },
    {
      id: 3,
      name: 'Customer Testimonial',
      description: 'Customer success story video',
      prompt: 'Create a customer testimonial video highlighting success and ROI',
      icon: MessageSquare
    },
    {
      id: 4,
      name: 'Feature Highlight',
      description: 'Quick feature showcase reel',
      prompt: 'Create a 30-second reel highlighting this feature with dynamic transitions',
      icon: Zap
    },
  ];

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      setShowAIAssistant(false);
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Preview */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="aspect-video bg-gray-900 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Video Preview Area</p>
                  <p className="text-sm text-gray-400 mt-2">Upload or create content to preview</p>
                </div>
              </div>
              {/* Playback Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                <div className="flex items-center gap-4">
                  <button className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white">
                    <Play className="w-5 h-5" />
                  </button>
                  <div className="flex-1 h-1 bg-white bg-opacity-30 rounded-full">
                    <div className="h-full w-1/3 bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-white text-sm">0:45 / 2:30</span>
                  <button className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white">
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline/Layers */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Timeline
              </h3>
              <div className="flex gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded" title="Zoom In">
                  <Plus className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded" title="Zoom Out">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {/* Video Layer */}
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 w-20">Video</span>
                <div className="flex-1 h-8 bg-blue-100 border border-blue-300 rounded relative">
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-xs text-blue-900 font-medium">Main Clip</span>
                  </div>
                </div>
              </div>

              {/* Audio Layer */}
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 w-20">Audio</span>
                <div className="flex-1 h-8 bg-green-100 border border-green-300 rounded relative">
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-xs text-green-900 font-medium">Background Music</span>
                  </div>
                </div>
              </div>

              {/* Text Layer */}
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 w-20">Text</span>
                <div className="flex-1 h-8 bg-purple-100 border border-purple-300 rounded relative">
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-xs text-purple-900 font-medium">Title Overlay</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editing Tools */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Editing Tools</h3>
            <div className="grid grid-cols-4 gap-3">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors">
                <Upload className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <span className="text-xs text-gray-700 block">Upload</span>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors">
                <Scissors className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <span className="text-xs text-gray-700 block">Trim</span>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors">
                <Type className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <span className="text-xs text-gray-700 block">Text</span>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors">
                <Music className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <span className="text-xs text-gray-700 block">Audio</span>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors">
                <Image className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <span className="text-xs text-gray-700 block">Images</span>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <span className="text-xs text-gray-700 block">Transitions</span>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors">
                <Settings className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <span className="text-xs text-gray-700 block">Effects</span>
              </button>
              <button 
                onClick={() => setShowAIAssistant(true)}
                className="p-4 border-2 border-purple-300 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <span className="text-xs text-purple-700 block font-medium">AI Create</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Project Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Project Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={projectSettings.title}
                  onChange={(e) => setProjectSettings({...projectSettings, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <TextArea
                  value={projectSettings.description}
                  onChange={(value) => setProjectSettings({...projectSettings, description: value})}
                  rows={3}
                  placeholder="Enter video description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Format
                  </label>
                  <select 
                    value={projectSettings.format}
                    onChange={(e) => setProjectSettings({...projectSettings, format: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>16:9</option>
                    <option>9:16</option>
                    <option>1:1</option>
                    <option>4:5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quality
                  </label>
                  <select 
                    value={projectSettings.quality}
                    onChange={(e) => setProjectSettings({...projectSettings, quality: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>4K</option>
                    <option>1080p</option>
                    <option>720p</option>
                    <option>480p</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Module Integration */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Display in Modules</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {modules.map((module) => (
                <label key={module.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={module.enabled}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{module.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="space-y-3">
              <button className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Submit for Approval
              </button>
              <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Export Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white bg-opacity-20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">AI Video Assistant</h2>
                    <p className="text-sm text-white text-opacity-90">Create professional videos in seconds</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAIAssistant(false)}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* AI Templates */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Templates</h3>
                <div className="grid grid-cols-2 gap-3">
                  {aiTemplates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => setAiPrompt(template.prompt)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
                      >
                        <Icon className="w-6 h-6 text-purple-600 mb-2" />
                        <p className="font-medium text-gray-900 text-sm mb-1">{template.name}</p>
                        <p className="text-xs text-gray-600">{template.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your video
                </label>
                <TextArea
                  value={aiPrompt}
                  onChange={setAiPrompt}
                  rows={4}
                  placeholder="Example: Create a 2-minute product demo video showcasing our CRM features with professional transitions and background music..."
                />
              </div>

              {/* AI Options */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">AI will automatically:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>Select relevant footage and images</li>
                      <li>Add professional transitions and effects</li>
                      <li>Generate voiceover and captions</li>
                      <li>Add background music</li>
                      <li>Optimize for selected modules</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAIAssistant(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAIGenerate}
                  disabled={!aiPrompt || isGenerating}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generate Video
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
