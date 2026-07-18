/**
 * Change Order Camera App
 * Mobile-optimized tool for field workers to instantly create change orders
 * Features: photo capture, voice-to-text, markup tools, instant quotes, client approval
 */

import { useState, useRef, useEffect } from 'react';
import {
  Camera, Mic, Edit3, Send, DollarSign, Check, X, Image as ImageIcon,
  Trash2, ZoomIn, ZoomOut, RotateCw, Save, Upload, FileText,
  AlertCircle, CheckCircle, Clock, User, MapPin, Calendar, Phone,
  MessageSquare, Pencil, Square, Circle, ArrowRight, ChevronLeft,
  Sparkles, TrendingUp, Package, Wrench, Home, Plus, Minus, ArrowLeft,
  Video, Play, Pause, StopCircle, Mail
} from 'lucide-react';
import { StandardButton } from '../components/ui/button/StandardButton';
import { TextInput } from '../components/ui/input/TextInput';
import { TextArea } from '../components/ui/input/TextArea';
import { Select } from '../components/ui/input/Select';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/modal';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ChangeOrder {
  id: string;
  projectId: string;
  projectName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  title: string;
  description: string;
  photos: {
    id: string;
    url: string;
    caption: string;
    annotations: Annotation[];
    timestamp: string;
  }[];
  audioDescription?: {
    url: string;
    transcription: string;
    duration: number;
  };
  estimatedCost: number;
  laborHours: number;
  materials: {
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'completed';
  createdBy: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'square' | 'text' | 'freehand';
  coordinates: { x: number; y: number; x2?: number; y2?: number };
  text?: string;
  color: string;
}

export default function ChangeOrderCameraApp({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

  // Current step in the flow
  const [currentStep, setCurrentStep] = useState<'select_project' | 'capture' | 'annotate' | 'details' | 'pricing' | 'review' | 'send'>('select_project');
  
  // Project selection
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Photo capture
  const [photos, setPhotos] = useState<any[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Annotation tools
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<'arrow' | 'circle' | 'square' | 'text' | 'freehand'>('arrow');
  const [annotationColor, setAnnotationColor] = useState('#ea580c');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Video recording
  const [videos, setVideos] = useState<any[]>([]);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoRecordingTime, setVideoRecordingTime] = useState(0);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const videoMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Change order form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as ChangeOrder['priority'],
    estimatedCost: '',
    laborHours: '',
    materials: [] as ChangeOrder['materials']
  });

  // Materials
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    quantity: '',
    unitCost: ''
  });

  // AI Quote generation
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  useEffect(() => {
    loadProjects();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    let interval: any;
    if (isVideoRecording) {
      interval = setInterval(() => {
        setVideoRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVideoRecording]);

  const loadProjects = async () => {
    try {
      const response = await fetch(`${API_BASE}/work-orders`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.slice(0, 10)); // Show recent projects
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1920, height: 1080 },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const newPhoto = {
              id: `photo-${Date.now()}`,
              url,
              blob,
              caption: '',
              annotations: [],
              timestamp: new Date().toISOString()
            };
            setPhotos([...photos, newPhoto]);
            toast.success('Photo captured!');
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const url = URL.createObjectURL(file);
        const newPhoto = {
          id: `photo-${Date.now()}-${Math.random()}`,
          url,
          blob: file,
          caption: '',
          annotations: [],
          timestamp: new Date().toISOString()
        };
        setPhotos([...photos, newPhoto]);
      });
      toast.success(`${files.length} photo(s) added`);
    }
  };

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        audioStream.getTracks().forEach(track => track.stop());
        // In production, send to speech-to-text API
        simulateTranscription();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Unable to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const simulateTranscription = () => {
    // In production, integrate with Google Speech-to-Text or AWS Transcribe
    setTimeout(() => {
      const sampleText = "We need to replace the damaged drywall in the master bedroom. The water leak caused about 8 feet of damage along the ceiling. Will need to remove insulation, repair studs, install new drywall, tape, mud, and paint to match existing. Customer also wants to upgrade to moisture-resistant drywall.";
      setTranscription(sampleText);
      setFormData({ ...formData, description: sampleText });
      toast.success('Audio transcribed successfully');
    }, 2000);
  };

  // Video recording functions
  const startVideoCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1920, height: 1080 },
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
      setIsVideoMode(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera/microphone');
    }
  };

  const startVideoRecording = () => {
    if (!stream) {
      toast.error('Please start camera first');
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });
      videoMediaRecorderRef.current = mediaRecorder;

      const videoChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(videoBlob);
        const newVideo = {
          id: `video-${Date.now()}`,
          url,
          blob: videoBlob,
          caption: '',
          duration: videoRecordingTime,
          timestamp: new Date().toISOString()
        };
        setVideos([...videos, newVideo]);
        setVideoRecordingTime(0);
        toast.success('Video recorded!');
      };

      mediaRecorder.start();
      setIsVideoRecording(true);
      setVideoRecordingTime(0);
      toast.success('Video recording started');
    } catch (error) {
      console.error('Error starting video recording:', error);
      toast.error('Unable to record video');
    }
  };

  const stopVideoRecording = () => {
    if (videoMediaRecorderRef.current && isVideoRecording) {
      videoMediaRecorderRef.current.stop();
      setIsVideoRecording(false);
    }
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const url = URL.createObjectURL(file);
        const newVideo = {
          id: `video-${Date.now()}-${Math.random()}`,
          url,
          blob: file,
          caption: '',
          duration: 0,
          timestamp: new Date().toISOString()
        };
        setVideos([...videos, newVideo]);
      });
      toast.success(`${files.length} video(s) added`);
    }
  };

  const handleAnnotationStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotating) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDrawStart({ x, y });
    setIsDrawing(true);
  };

  const handleAnnotationMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;
    // Drawing preview logic here
  };

  const handleAnnotationEnd = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x2 = (e.clientX - rect.left) / rect.width;
    const y2 = (e.clientY - rect.top) / rect.height;
    
    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}`,
      type: annotationTool,
      coordinates: { x: drawStart.x, y: drawStart.y, x2, y2 },
      color: annotationColor
    };

    setAnnotations([...annotations, newAnnotation]);
    setIsDrawing(false);
    setDrawStart(null);
  };

  const saveAnnotations = () => {
    if (photos[currentPhotoIndex]) {
      const updatedPhotos = [...photos];
      updatedPhotos[currentPhotoIndex].annotations = annotations;
      setPhotos(updatedPhotos);
      setIsAnnotating(false);
      setAnnotations([]);
      toast.success('Annotations saved');
    }
  };

  // Convert a captured photo Blob into base64 (no data: prefix) for the vision API.
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  // Grab `count` still frames evenly spaced through a recorded/uploaded video so
  // the AI can "watch" the walkthrough. Returns base64 JPEGs (no data: prefix).
  const extractVideoFrames = (blob: Blob, count = 3): Promise<string[]> =>
    new Promise((resolve) => {
      const frames: string[] = [];
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      const url = URL.createObjectURL(blob);
      video.src = url;

      const cleanup = () => { URL.revokeObjectURL(url); };

      const grabAt = (times: number[], i: number) => {
        if (i >= times.length) { cleanup(); resolve(frames); return; }
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          try {
            const c = document.createElement('canvas');
            c.width = video.videoWidth || 1280;
            c.height = video.videoHeight || 720;
            const ctx = c.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, c.width, c.height);
              const dataUrl = c.toDataURL('image/jpeg', 0.8);
              frames.push(dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);
            }
          } catch (e) {
            console.error('[Camera] Failed to grab video frame:', e);
          }
          grabAt(times, i + 1);
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = times[i];
      };

      video.onloadedmetadata = () => {
        const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        // Evenly spaced timestamps, skipping the very start/end.
        const times = dur > 0
          ? Array.from({ length: count }, (_, k) => (dur * (k + 1)) / (count + 1))
          : [0];
        grabAt(times, 0);
      };
      video.onerror = () => { cleanup(); resolve(frames); };
    });

  const generateAIQuote = async () => {
    if (photos.length === 0 && videos.length === 0) {
      toast.error('Capture at least one photo or video first so the AI can see the project.');
      return;
    }
    setIsGeneratingQuote(true);
    try {
      // Send the actual captured photos AND sampled video frames to GPT-4o Vision.
      // The API caps at 6 images, so budget: photos first, then fill with frames.
      const MAX_IMAGES = 6;
      const images: string[] = [];
      for (const p of photos) {
        if (images.length >= MAX_IMAGES) break;
        if (p.blob) {
          try { images.push(await blobToBase64(p.blob)); }
          catch (e) { console.error('[Camera] Failed to encode photo:', e); }
        }
      }
      // Sample frames from each video to spread the remaining budget across clips.
      if (videos.length > 0 && images.length < MAX_IMAGES) {
        const remaining = MAX_IMAGES - images.length;
        const perVideo = Math.max(1, Math.floor(remaining / videos.length));
        for (const v of videos) {
          if (images.length >= MAX_IMAGES) break;
          if (v.blob) {
            try {
              const frames = await extractVideoFrames(v.blob, perVideo);
              for (const f of frames) {
                if (images.length >= MAX_IMAGES) break;
                images.push(f);
              }
            } catch (e) { console.error('[Camera] Failed to extract video frames:', e); }
          }
        }
      }
      if (images.length === 0) throw new Error('Could not read the captured photos or video frames.');

      const res = await fetch(`${API_BASE}/project-vision/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          images,
          notes: `${formData.title ? formData.title + '. ' : ''}${formData.description || transcription || ''}`.trim(),
          serviceType: selectedProject?.serviceType || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Vision request failed with ${res.status}`);
      }

      const a = data.analysis;
      const materials = (a.materials || []).map((m: any) => ({
        name: m.name,
        quantity: Number(m.quantity) || 1,
        unitCost: Number(m.unitCost) || 0,
        totalCost: Number(m.totalCost) || (Number(m.quantity) || 1) * (Number(m.unitCost) || 0),
      }));

      setAiSuggestions({
        estimatedCost: a.estimatedCost,
        laborHours: a.laborHours,
        materials,
        summary: a.summary,
        scope: a.scope || [],
        labor: a.labor || [],
        confidence: a.confidence,
        assumptions: a.assumptions || [],
        breakdown: { materials: a.materialsCost, labor: a.laborCost },
      });
      setFormData(prev => ({
        ...prev,
        // Fill an AI description if the field is empty.
        description: prev.description || a.summary || '',
        estimatedCost: String(a.estimatedCost ?? ''),
        laborHours: String(a.laborHours ?? ''),
        materials,
      }));
      const frameCount = images.length - Math.min(photos.length, images.length);
      const sourceLabel = videos.length > 0 && frameCount > 0
        ? `${images.length} image(s) (incl. ${frameCount} video frame(s))`
        : `${images.length} photo(s)`;
      toast.success(`AI analyzed ${sourceLabel} — ${materials.length} materials, ~${a.laborHours}h labor`);
    } catch (error) {
      console.error('Error generating AI quote from photos:', error);
      toast.error(`AI analysis failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  // Hand the AI-analyzed scope off to the Quote Builder as a real saved quote.
  const sendToQuoteBuilder = async () => {
    try {
      const materials = formData.materials || [];
      if (materials.length === 0 && !formData.estimatedCost) {
        toast.error('Generate the AI quote first.');
        return;
      }
      const quoteId = `Q-CAM-${Date.now().toString(36)}`;
      const items = materials.map(m => ({
        id: `${quoteId}-${Math.random().toString(36).slice(2, 8)}`,
        description: m.name,
        qty: m.quantity,
        rate: m.unitCost,
      }));
      // Fold labor in as line items too, if the AI broke it out.
      const laborLines = (aiSuggestions?.labor || []).map((l: any) => ({
        id: `${quoteId}-${Math.random().toString(36).slice(2, 8)}`,
        description: `Labor — ${l.role}`,
        qty: Number(l.hours) || 1,
        rate: Number(l.hourlyRate) || 0,
      }));
      const quote = {
        id: quoteId,
        type: 'estimate',
        number: `EST-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
        clientName: selectedProject?.customerName || '',
        clientEmail: selectedProject?.email || '',
        clientPhone: selectedProject?.phone || '',
        clientAddress: selectedProject?.address || '',
        customerId: selectedProject?.customerId || '',
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: '',
        items: [...items, ...laborLines],
        notes: `${formData.title ? formData.title + '\n' : ''}${formData.description || ''}${aiSuggestions?.scope?.length ? '\n\nScope:\n- ' + aiSuggestions.scope.join('\n- ') : ''}`.trim(),
        taxRate: 8,
        status: 'draft',
        createdAt: new Date().toISOString(),
      };
      const res = await fetch(`${API_BASE}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ quote }),
      });
      if (!res.ok) throw new Error(`Saving quote failed with ${res.status}`);

      // Auto-push into the sales Pipeline as a quote-draft opportunity so nothing
      // captured in the field falls through the cracks.
      try {
        const materialsSubtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
        const laborSubtotal = laborLines.reduce((s, i) => s + i.qty * i.rate, 0);
        const estValue = Number(formData.estimatedCost) || (materialsSubtotal + laborSubtotal);
        const pipelineItem = {
          id: `PIPE-${quoteId}`,
          itemNumber: quote.number,
          stage: 'quote-draft',
          customerName: quote.clientName || 'Unassigned',
          customerEmail: quote.clientEmail || '',
          customerPhone: quote.clientPhone || '',
          location: quote.clientAddress || '',
          serviceType: selectedProject?.serviceType || 'Field Capture',
          title: `${quote.number} — ${quote.clientName || 'Unassigned'}`,
          description: formData.title || formData.description || 'Captured via Camera App',
          estimatedValue: estValue,
          priority: formData.priority || 'medium',
          createdDate: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          customerId: quote.customerId || '',
          source: 'camera',
          quote: {
            id: quoteId,
            quoteNumber: quote.number,
            materials: (formData.materials || []).map(m => ({
              id: `${quoteId}-${Math.random().toString(36).slice(2, 8)}`,
              name: m.name, quantity: m.quantity, unit: 'each',
              unitCost: m.unitCost, totalCost: m.totalCost, category: 'Field', visible: true,
            })),
            labor: [],
            processSteps: [],
            materialsSubtotal,
            laborSubtotal,
            taxRate: 0.08,
            taxAmount: (materialsSubtotal + laborSubtotal) * 0.08,
            totalCost: estValue,
            generatedAt: new Date().toISOString(),
            approvalStatus: 'pending',
          },
        };
        const pipeRes = await fetch(`${API_BASE}/pipeline/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify(pipelineItem),
        });
        if (!pipeRes.ok) console.error('[Camera] Pipeline push failed with', pipeRes.status);
      } catch (pipeErr) {
        console.error('[Camera] Error pushing camera quote to pipeline:', pipeErr);
        // Non-fatal — the quote itself was saved.
      }

      // Tell the Quote Builder to auto-open this one.
      try { localStorage.setItem('invoice_open_id', quoteId); } catch { /* ignore */ }
      toast.success('Quote created & added to the pipeline — opening the Quote Builder…');
      if (onNavigate) onNavigate('estimates');
    } catch (error) {
      console.error('Error sending to quote builder:', error);
      toast.error('Could not send to the Quote Builder.');
    }
  };

  const handleAddMaterial = () => {
    if (newMaterial.name && newMaterial.quantity && newMaterial.unitCost) {
      const material = {
        name: newMaterial.name,
        quantity: parseFloat(newMaterial.quantity),
        unitCost: parseFloat(newMaterial.unitCost),
        totalCost: parseFloat(newMaterial.quantity) * parseFloat(newMaterial.unitCost)
      };
      setFormData({
        ...formData,
        materials: [...formData.materials, material]
      });
      setNewMaterial({ name: '', quantity: '', unitCost: '' });
      setShowAddMaterialModal(false);
      toast.success('Material added');
    }
  };

  const submitChangeOrder = async () => {
    try {
      // Calculate totals
      const materialsTotal = formData.materials.reduce((sum, m) => sum + m.totalCost, 0);
      const laborTotal = parseFloat(formData.laborHours) * 75; // $75/hr default
      const subtotal = materialsTotal + laborTotal;
      const markupPercent = 15;
      const markupAmount = subtotal * 0.15;
      const tax = (subtotal + markupAmount) * 0.08;
      const totalCost = subtotal + markupAmount + tax;

      const changeOrder = {
        coNumber: `CO-${new Date().getFullYear()}-CAMERA-${Date.now()}`,
        projectId: selectedProject.id,
        projectName: selectedProject.projectName || selectedProject.title,
        customerId: selectedProject.customerId,
        customerName: selectedProject.customerName || 'Unknown',
        customerEmail: selectedProject.email || '',
        title: formData.title,
        description: formData.description,
        reason: 'Field change - Camera documented',
        photos: photos.map(p => ({
          id: p.id,
          url: p.url,
          caption: p.caption,
          timestamp: p.timestamp
        })),
        materials: formData.materials.map(m => ({
          ...m,
          category: 'materials' as const,
          unit: 'each',
          supplier: ''
        })),
        labor: [{
          id: `labor_${Date.now()}`,
          description: 'Field work as documented',
          hours: parseFloat(formData.laborHours) || 0,
          rate: 75,
          totalCost: laborTotal,
          tradeType: 'General',
          skillLevel: 'journeyman' as const
        }],
        subtotal,
        markupPercent,
        markupAmount,
        tax,
        totalCost,
        priority: formData.priority,
        status: 'pending_admin',
        createdBy: 'Field Tech (Camera App)',
        createdAt: new Date().toISOString(),
        notes: `Created via Camera App. ${transcription ? 'Voice note: ' + transcription : ''}`,
        timeline: [
          { date: new Date().toISOString(), action: 'Created via Camera App', by: 'Field Tech' }
        ]
      };

      const response = await fetch(`${API_BASE}/change-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(changeOrder)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Change Order ${result.changeOrder?.coNumber || 'created'} sent for approval!`);
        // In production, send email/SMS to customer
        setTimeout(() => {
          if (onNavigate) onNavigate('change-orders');
          else window.location.href = '/change-orders';
        }, 2000);
      } else {
        toast.error('Failed to submit change order');
      }
    } catch (error) {
      console.error('Error submitting change order:', error);
      toast.error('Failed to submit change order');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'select_project', label: 'Project', icon: Home },
      { id: 'capture', label: 'Photos', icon: Camera },
      { id: 'annotate', label: 'Markup', icon: Edit3 },
      { id: 'details', label: 'Details', icon: FileText },
      { id: 'pricing', label: 'Quote', icon: DollarSign },
      { id: 'review', label: 'Review', icon: CheckCircle },
      { id: 'send', label: 'Send', icon: Send }
    ];

    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = index < currentIndex;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
                    isActive ? 'bg-[#ea580c] text-white' :
                    isCompleted ? 'bg-green-500/20 text-green-400' :
                    'bg-[#2A2A2A] text-gray-500'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                  <span className={`text-sm ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 mb-6 ${
                    isCompleted ? 'bg-green-500' : 'bg-[#2A2A2A]'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.location.href = '/unified-dashboard';
              }}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Back to Unified Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-600 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Change Order Camera</h1>
              <p className="text-sm text-gray-400">Instant quote + client approval</p>
            </div>
          </div>
          {currentStep !== 'select_project' && (
            <StandardButton
              variant="secondary"
              size="sm"
              onClick={() => {
                const steps = ['select_project', 'capture', 'annotate', 'details', 'pricing', 'review', 'send'];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1] as any);
                }
              }}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Back
            </StandardButton>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        {/* Step 1: Select Project */}
        {currentStep === 'select_project' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Select Project</h2>
              <div className="space-y-3">
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Home className="w-12 h-12 mx-auto mb-3" />
                    <p>No active projects found</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setCurrentStep('capture');
                      }}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 text-left hover:border-[#ea580c]/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold mb-1">
                            {project.projectName || project.title || 'Unnamed Project'}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {project.customerName || 'No customer'} • {project.address || 'No address'}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Capture Media */}
        {currentStep === 'capture' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Capture Media</h2>
              
              {/* Camera View */}
              {!isCameraActive ? (
                <div className="space-y-4">
                  {/* Photo Options */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Photos</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <StandardButton
                        onClick={startCamera}
                        leftIcon={<Camera className="w-5 h-5" />}
                        className="h-32"
                      >
                        Take Photos
                      </StandardButton>
                      <StandardButton
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        leftIcon={<Upload className="w-5 h-5" />}
                        className="h-32"
                      >
                        Upload Photos
                      </StandardButton>
                    </div>
                  </div>

                  {/* Video Options */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Videos</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <StandardButton
                        onClick={startVideoCamera}
                        leftIcon={<Video className="w-5 h-5" />}
                        className="h-32 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                      >
                        Record Video
                      </StandardButton>
                      <StandardButton
                        variant="secondary"
                        onClick={() => videoInputRef.current?.click()}
                        leftIcon={<Upload className="w-5 h-5" />}
                        className="h-32"
                      >
                        Upload Videos
                      </StandardButton>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    className="hidden"
                    onChange={handleVideoFileUpload}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-xl overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-auto"
                    />
                    
                    {/* Recording indicator */}
                    {isVideoRecording && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 px-3 py-2 rounded-full">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        <span className="text-white font-bold text-sm">{formatTime(videoRecordingTime)}</span>
                      </div>
                    )}

                    {/* Camera Controls */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                      {isVideoMode ? (
                        // Video recording button
                        !isVideoRecording ? (
                          <button
                            onClick={startVideoRecording}
                            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                          >
                            <div className="w-6 h-6 rounded-full bg-white" />
                          </button>
                        ) : (
                          <button
                            onClick={stopVideoRecording}
                            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                          >
                            <StopCircle className="w-8 h-8 text-white" />
                          </button>
                        )
                      ) : (
                        // Photo capture button
                        <button
                          onClick={capturePhoto}
                          className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <div className="w-14 h-14 rounded-full border-4 border-gray-300"></div>
                        </button>
                      )}
                    </div>

                    {/* Mode switcher */}
                    <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                      {!isVideoRecording && (
                        <button
                          onClick={() => {
                            setIsVideoMode(!isVideoMode);
                            stopCamera();
                            if (!isVideoMode) {
                              startVideoCamera();
                            } else {
                              startCamera();
                            }
                          }}
                          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
                          title={isVideoMode ? 'Switch to Photo' : 'Switch to Video'}
                        >
                          {isVideoMode ? <Camera className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                        </button>
                      )}
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => {
                        if (!isVideoRecording) {
                          stopCamera();
                          setIsVideoMode(false);
                        } else {
                          toast.error('Stop recording first');
                        }
                      }}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors"
                      disabled={isVideoRecording}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

              {/* Photo Gallery */}
              {photos.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Captured Photos ({photos.length})</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((photo, index) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.url}
                          alt={`Capture ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setPhotos(photos.filter(p => p.id !== photo.id));
                          }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Gallery */}
              {videos.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Video className="w-5 h-5 text-purple-400" />
                    Recorded Videos ({videos.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {videos.map((video, index) => (
                      <div key={video.id} className="relative group">
                        <video
                          src={video.url}
                          className="w-full h-40 object-cover rounded-lg bg-black"
                          controls
                        />
                        <div className="absolute top-2 left-2 bg-purple-500/90 px-2 py-1 rounded text-sm font-bold">
                          {formatTime(video.duration)}
                        </div>
                        <button
                          onClick={() => {
                            setVideos(videos.filter(v => v.id !== video.id));
                          }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(photos.length > 0 || videos.length > 0) && (
                <div className="mt-6">
                  <StandardButton
                    onClick={() => setCurrentStep('annotate')}
                    leftIcon={<ArrowRight className="w-4 h-4" />}
                    className="w-full"
                  >
                    Continue to Markup
                  </StandardButton>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Annotate Photos */}
        {currentStep === 'annotate' && photos.length > 0 && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Markup Photos</h2>
              
              {/* Current Photo */}
              <div className="relative">
                <img
                  src={photos[currentPhotoIndex].url}
                  alt="Current"
                  className="w-full rounded-lg"
                />
                {isAnnotating && (
                  <canvas
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                    onMouseDown={handleAnnotationStart}
                    onMouseMove={handleAnnotationMove}
                    onMouseUp={handleAnnotationEnd}
                  />
                )}
              </div>

              {/* Annotation Tools */}
              {!isAnnotating ? (
                <div className="mt-4 flex gap-3">
                  <StandardButton
                    onClick={() => setIsAnnotating(true)}
                    leftIcon={<Edit3 className="w-4 h-4" />}
                  >
                    Add Markup
                  </StandardButton>
                  <StandardButton
                    variant="secondary"
                    onClick={() => setCurrentStep('details')}
                  >
                    Skip Markup
                  </StandardButton>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex gap-2">
                    {[
                      { tool: 'arrow', icon: ArrowRight },
                      { tool: 'circle', icon: Circle },
                      { tool: 'square', icon: Square },
                      { tool: 'text', icon: MessageSquare }
                    ].map(({ tool, icon: Icon }) => (
                      <button
                        key={tool}
                        onClick={() => setAnnotationTool(tool as any)}
                        className={`flex-1 p-3 rounded-lg border transition-all ${
                          annotationTool === tool
                            ? 'bg-[#ea580c] border-[#ea580c] text-white'
                            : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400'
                        }`}
                      >
                        <Icon className="w-5 h-5 mx-auto" />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <StandardButton onClick={saveAnnotations} leftIcon={<Check className="w-4 h-4" />}>
                      Save Markup
                    </StandardButton>
                    <StandardButton
                      variant="secondary"
                      onClick={() => {
                        setIsAnnotating(false);
                        setAnnotations([]);
                      }}
                    >
                      Cancel
                    </StandardButton>
                  </div>
                </div>
              )}

              {/* Photo Navigation */}
              {photos.length > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <StandardButton
                    variant="secondary"
                    size="sm"
                    disabled={currentPhotoIndex === 0}
                    onClick={() => setCurrentPhotoIndex(currentPhotoIndex - 1)}
                  >
                    Previous
                  </StandardButton>
                  <span className="text-sm text-gray-400">
                    {currentPhotoIndex + 1} of {photos.length}
                  </span>
                  <StandardButton
                    variant="secondary"
                    size="sm"
                    disabled={currentPhotoIndex === photos.length - 1}
                    onClick={() => setCurrentPhotoIndex(currentPhotoIndex + 1)}
                  >
                    Next
                  </StandardButton>
                </div>
              )}

              <div className="mt-6">
                <StandardButton
                  onClick={() => setCurrentStep('details')}
                  leftIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full"
                >
                  Continue to Details
                </StandardButton>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {currentStep === 'details' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Change Order Details</h2>
              
              <div className="space-y-4">
                <TextInput
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Replace water-damaged drywall"
                  required
                />

                {/* Voice Recording */}
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <div className="flex gap-2 mb-2">
                    {!isRecording ? (
                      <StandardButton
                        variant="secondary"
                        size="sm"
                        onClick={startRecording}
                        leftIcon={<Mic className="w-4 h-4" />}
                      >
                        Voice Description
                      </StandardButton>
                    ) : (
                      <StandardButton
                        size="sm"
                        onClick={stopRecording}
                        leftIcon={<Check className="w-4 h-4" />}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Stop Recording ({formatTime(recordingTime)})
                      </StandardButton>
                    )}
                  </div>
                  <TextArea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the work needed..."
                    rows={6}
                    required
                  />
                  {transcription && (
                    <p className="text-sm text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Transcribed from audio
                    </p>
                  )}
                </div>

                <Select
                  label="Priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                >
                  <option value="low">Low - Can wait</option>
                  <option value="medium">Medium - Standard timeline</option>
                  <option value="high">High - Needs attention</option>
                  <option value="urgent">Urgent - Immediate action</option>
                </Select>

                <StandardButton
                  onClick={() => setCurrentStep('pricing')}
                  leftIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full"
                >
                  Continue to Pricing
                </StandardButton>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Pricing/Quote */}
        {currentStep === 'pricing' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Generate Quote</h2>

              {/* AI Quote Generator */}
              {!aiSuggestions ? (
                <div className="text-center py-8">
                  <Sparkles className="w-16 h-16 text-[#ea580c] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">AI-Powered Quote Generation</h3>
                  <p className="text-gray-400 mb-6">
                    Let AI analyze your photos and description to generate an instant quote
                  </p>
                  <StandardButton
                    onClick={generateAIQuote}
                    disabled={isGeneratingQuote}
                    leftIcon={isGeneratingQuote ? undefined : <Sparkles className="w-4 h-4" />}
                  >
                    {isGeneratingQuote ? 'Generating Quote...' : 'Generate AI Quote'}
                  </StandardButton>
                  <div className="mt-4">
                    <button
                      onClick={() => setCurrentStep('review')}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Or enter manually →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="font-semibold text-green-400">AI Vision Analysis Complete</span>
                      {aiSuggestions.confidence && (
                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 capitalize">
                          {aiSuggestions.confidence} confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300">
                      {aiSuggestions.summary || "Based on the photos, here's the estimated quote:"}
                    </p>
                    {Array.isArray(aiSuggestions.scope) && aiSuggestions.scope.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {aiSuggestions.scope.map((s: string, i: number) => (
                          <li key={i} className="text-xs text-gray-400 flex gap-2">
                            <span className="text-[#ea580c]">•</span><span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {Array.isArray(aiSuggestions.assumptions) && aiSuggestions.assumptions.length > 0 && (
                      <p className="mt-3 text-[11px] text-gray-500 italic">
                        Assumptions: {aiSuggestions.assumptions.join('; ')}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <TextInput
                      label="Total Estimated Cost"
                      type="number"
                      value={formData.estimatedCost}
                      onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                      startIcon={<DollarSign className="w-4 h-4" />}
                    />
                    <TextInput
                      label="Labor Hours"
                      type="number"
                      value={formData.laborHours}
                      onChange={(e) => setFormData({ ...formData, laborHours: e.target.value })}
                      startIcon={<Clock className="w-4 h-4" />}
                    />
                  </div>

                  {/* Materials List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">Materials</label>
                      <StandardButton
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowAddMaterialModal(true)}
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Add Material
                      </StandardButton>
                    </div>
                    <div className="space-y-2">
                      {formData.materials.map((material, index) => (
                        <div key={index} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{material.name}</p>
                              <p className="text-sm text-gray-400">
                                {material.quantity} × ${material.unitCost.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${material.totalCost.toFixed(2)}</p>
                              <button
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    materials: formData.materials.filter((_, i) => i !== index)
                                  });
                                }}
                                className="text-sm text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                    <h4 className="font-semibold mb-3">Cost Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Materials</span>
                        <span>${Number(aiSuggestions.breakdown?.materials || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Labor ({formData.laborHours || 0} hrs)</span>
                        <span>${Number(aiSuggestions.breakdown?.labor || 0).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-[#2A2A2A] pt-2 mt-2 flex justify-between font-bold text-[#ea580c]">
                        <span>Estimated Total</span>
                        <span>${formData.estimatedCost}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <StandardButton
                      onClick={generateAIQuote}
                      variant="secondary"
                      disabled={isGeneratingQuote}
                      leftIcon={<Sparkles className="w-4 h-4" />}
                    >
                      {isGeneratingQuote ? 'Re-analyzing…' : 'Re-run'}
                    </StandardButton>
                    <StandardButton
                      onClick={sendToQuoteBuilder}
                      leftIcon={<FileText className="w-4 h-4" />}
                      className="flex-1"
                    >
                      Send to Quote Builder
                    </StandardButton>
                  </div>

                  <StandardButton
                    onClick={() => setCurrentStep('review')}
                    variant="secondary"
                    leftIcon={<ArrowRight className="w-4 h-4" />}
                    className="w-full"
                  >
                    Continue to Change Order Review
                  </StandardButton>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 6: Review */}
        {currentStep === 'review' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Review Change Order</h2>
              
              {/* Summary */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Project</label>
                  <p className="font-semibold">{selectedProject?.projectName || selectedProject?.title}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Title</label>
                  <p className="font-semibold">{formData.title}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Description</label>
                  <p className="text-sm">{formData.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Total Cost</label>
                    <p className="text-2xl font-bold text-[#ea580c]">${formData.estimatedCost}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Labor Hours</label>
                    <p className="text-2xl font-bold">{formData.laborHours} hrs</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Photos ({photos.length})</label>
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map((photo, index) => (
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2A2A2A]">
                  <StandardButton
                    onClick={() => setCurrentStep('send')}
                    leftIcon={<Send className="w-4 h-4" />}
                    className="w-full"
                  >
                    Send for Approval
                  </StandardButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Send */}
        {currentStep === 'send' && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Send to Customer</h2>
              
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-400 mb-1">Instant Client Approval</h4>
                      <p className="text-sm text-gray-300">
                        Customer will receive an email and SMS with photos, quote details, and approve/reject buttons.
                        You'll be notified immediately when they respond.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-sm">{selectedProject?.email || 'customer@example.com'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-sm">{selectedProject?.phone || '(555) 123-4567'}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <StandardButton
                    onClick={submitChangeOrder}
                    leftIcon={<Send className="w-4 h-4" />}
                    className="w-full"
                  >
                    Send Change Order
                  </StandardButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Material Modal */}
      <Modal
        isOpen={showAddMaterialModal}
        onClose={() => setShowAddMaterialModal(false)}
      >
        <ModalHeader
          title="Add Material"
          icon={Package}
          onClose={() => setShowAddMaterialModal(false)}
        />
        <ModalBody>
          <div className="space-y-4">
            <TextInput
              label="Material Name"
              value={newMaterial.name}
              onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
              placeholder="e.g., Drywall 5/8 inch"
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Quantity"
                type="number"
                value={newMaterial.quantity}
                onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })}
                placeholder="0"
              />
              <TextInput
                label="Unit Cost ($)"
                type="number"
                value={newMaterial.unitCost}
                onChange={(e) => setNewMaterial({ ...newMaterial, unitCost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            {newMaterial.quantity && newMaterial.unitCost && (
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3">
                <span className="text-sm text-gray-400">Total: </span>
                <span className="font-semibold text-[#ea580c]">
                  ${(parseFloat(newMaterial.quantity) * parseFloat(newMaterial.unitCost)).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter
          onCancel={() => setShowAddMaterialModal(false)}
          onConfirm={handleAddMaterial}
          confirmText="Add Material"
        />
      </Modal>
    </div>
  );
}