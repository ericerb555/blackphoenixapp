import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, PlayCircle, StopCircle, Camera, Upload, Video,
  MessageSquare, FileText, Image, Paperclip, CheckCircle,
  AlertCircle, MapPin, Calendar, User, Menu, Bell,
  Home, ClipboardList, Send, X, ChevronRight, Zap,
  BarChart3, Wifi, WifiOff, Battery, Smartphone, ArrowLeft, Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const EMPLOYEE_ROLE = 'Field Technician';

interface FieldTask {
  id: string;
  title: string;
  location: string;
  scheduledAt: string;
  status: string;
}
interface UploadItem {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  size: number;
}

function fmtSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff) || diff < 0) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function EmployeeMobileApp() {
  const { user } = useAuth();
  const employeeId = user?.id || '';
  const employeeName = String(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Field Technician');
  const getAuthHeaders = useCallback(async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) throw new Error('Sign in to clock in or out.'); return { Authorization: `Bearer ${session.access_token}` }; }, []);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [activeTab, setActiveTab] = useState<'home' | 'time' | 'media' | 'tasks'>('home');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'photo' | 'document' | 'video' | null>(null);
  const [location, setLocation] = useState('Fetching location...');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [recentUploads, setRecentUploads] = useState<UploadItem[]>([]);
  const [recentPunches, setRecentPunches] = useState<any[]>([]);
  const [weekHours, setWeekHours] = useState(0);
  const [clockBusy, setClockBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDesc, setUploadDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate elapsed time when clocked in
  useEffect(() => {
    if (isClockedIn && clockInTime) {
      const tick = () => {
        const diff = Date.now() - clockInTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };
      tick();
      const timer = setInterval(tick, 1000);
      return () => clearInterval(timer);
    }
    setElapsedTime('00:00:00');
  }, [isClockedIn, clockInTime]);

  // Real network status
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Real battery level (where supported)
  useEffect(() => {
    const nav = navigator as any;
    if (nav.getBattery) {
      nav.getBattery().then((bat: any) => {
        const update = () => setBatteryLevel(Math.round(bat.level * 100));
        update();
        bat.addEventListener('levelchange', update);
      }).catch(() => {});
    }
  }, []);

  // Real geolocation
  useEffect(() => {
    if (!navigator.geolocation) { setLocation('Location unavailable'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      () => setLocation('Location permission denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const loadStatus = useCallback(async () => {
    if (!employeeId) return;
    try {
      const authHeaders = await getAuthHeaders();
      // Ensure the employee record exists (idempotent), then load status.
      await fetch(`${SERVER}/time-tracking/employees`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: employeeId, name: employeeName, role: EMPLOYEE_ROLE }),
      });
      const res = await fetch(`${SERVER}/time-tracking/employees/${employeeId}`, { headers: authHeaders });
      const data = await res.json();
      if (data?.activeEntry?.punchIn) {
        setIsClockedIn(true);
        setClockInTime(new Date(data.activeEntry.punchIn));
      } else {
        setIsClockedIn(false);
        setClockInTime(null);
      }
      const entries = (data?.recentEntries || []).slice().sort(
        (a: any, b: any) => new Date(b.punchIn).getTime() - new Date(a.punchIn).getTime()
      );
      setRecentPunches(entries.slice(0, 10));
    } catch (err) {
      console.error('EmployeeMobileApp: failed to load clock status:', err);
    }
  }, [employeeId, employeeName, getAuthHeaders]);

  const loadTasks = useCallback(async () => {
    if (!employeeId) return;
    try { const authHeaders = await getAuthHeaders();
      const res = await fetch(`${SERVER}/time-tracking/tasks/${employeeId}`, { headers: authHeaders });
      const data = await res.json();
      if (data?.success) setTasks(data.tasks || []);
    } catch (err) {
      console.error('EmployeeMobileApp: failed to load tasks:', err);
    }
  }, [employeeId, getAuthHeaders]);

  const loadUploads = useCallback(async () => {
    try { const authHeaders = await getAuthHeaders();
      const res = await fetch(`${SERVER}/media`, { headers: authHeaders });
      const data = await res.json();
      if (data?.success) {
        const items: UploadItem[] = (data.media || [])
          .map((m: any) => ({ id: m.id, name: m.name, type: m.type, uploadedAt: m.uploadedAt, size: m.size || 0 }))
          .sort((a: UploadItem, b: UploadItem) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setRecentUploads(items.slice(0, 8));
      }
    } catch (err) {
      console.error('EmployeeMobileApp: failed to load uploads:', err);
    }
  }, [getAuthHeaders]);

  const loadWeekHours = useCallback(async () => {
    if (!employeeId) return;
    try { const authHeaders = await getAuthHeaders();
      const res = await fetch(`${SERVER}/time-tracking/hours-summary`, { headers: authHeaders });
      const data = await res.json();
      const mine = data?.summary?.[employeeName];
      if (mine) setWeekHours(mine.hoursThisWeek || 0);
    } catch (err) {
      console.error('EmployeeMobileApp: failed to load week hours:', err);
    }
  }, [employeeId, employeeName, getAuthHeaders]);

  useEffect(() => {
    loadStatus();
    loadTasks();
    loadUploads();
    loadWeekHours();
  }, [loadStatus, loadTasks, loadUploads, loadWeekHours]);

  const handleClockIn = async () => {
    if (!employeeId) { alert('Sign in to clock in.'); return; }
    setClockBusy(true);
    try { const authHeaders = await getAuthHeaders();
      const res = await fetch(`${SERVER}/time-tracking/punch-in`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeId,
          location: coords ? { ...coords, address: location } : { address: location },
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setIsClockedIn(true);
        setClockInTime(new Date(data.timeEntry?.punchIn || Date.now()));
      } else {
        console.error('Clock-in failed:', data?.error);
        alert(`Clock-in failed: ${data?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Clock-in request error:', err);
      alert('Clock-in failed. Check your connection.');
    } finally {
      setClockBusy(false);
    }
  };

  const handleClockOut = async () => {
    if (!employeeId) { alert('Sign in to clock out.'); return; }
    setClockBusy(true);
    try { const authHeaders = await getAuthHeaders();
      const res = await fetch(`${SERVER}/time-tracking/punch-out`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeId,
          location: coords ? { ...coords, address: location } : { address: location },
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setIsClockedIn(false);
        setClockInTime(null);
        setElapsedTime('00:00:00');
        loadStatus();
        loadWeekHours();
      } else {
        console.error('Clock-out failed:', data?.error);
        alert(`Clock-out failed: ${data?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Clock-out request error:', err);
      alert('Clock-out failed. Check your connection.');
    } finally {
      setClockBusy(false);
    }
  };

  const handleUpload = (type: 'photo' | 'document' | 'video') => {
    setUploadType(type);
    setUploadDesc('');
    setShowUploadModal(true);
  };

  const acceptFor = (type: 'photo' | 'document' | 'video' | null) =>
    type === 'photo' ? 'image/*' : type === 'video' ? 'video/*' : '.pdf,.doc,.docx,image/*';

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const form = new FormData();
      form.append('file', file);
      if (uploadDesc) form.append('description', uploadDesc);
      form.append('tags', 'field-upload');
      const res = await fetch(`${SERVER}/media/upload`, {
        method: 'POST',
        headers: authHeaders, // do NOT set Content-Type; browser sets multipart boundary
        body: form,
      });
      const data = await res.json();
      if (data?.success) {
        setShowUploadModal(false);
        setUploadDesc('');
        loadUploads();
      } else {
        console.error('Upload failed:', data?.error || data);
        alert(`Upload failed: ${data?.error || 'Unsupported file or server error'}`);
      }
    } catch (err) {
      console.error('Upload request error:', err);
      alert('Upload failed. Check your connection.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startTask = async (taskId: string) => {
    if (!employeeId) return;
    try { const authHeaders = await getAuthHeaders();
      const res = await fetch(`${SERVER}/time-tracking/tasks/${employeeId}/${taskId}/status`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in-progress' }),
      });
      const data = await res.json();
      if (data?.success) loadTasks();
    } catch (err) {
      console.error('Failed to start task:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Mobile Status Bar */}
      <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          {batteryLevel !== null && (
            <div className="flex items-center gap-1">
              <Battery className="w-4 h-4" />
              <span>{batteryLevel}%</span>
            </div>
          )}
        </div>
      </div>

      {/* App Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-20 shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  window.location.href = '/unified-dashboard';
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Back to Unified Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-lg">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg">John Smith</h1>
                <p className="text-sm text-blue-100">Field Technician</p>
              </div>
            </div>
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>

          {/* Quick Status */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3 h-3" />
            <span className="text-blue-100">{location}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Home Tab */}
        {activeTab === 'home' && (
          <>
            {/* Clock In/Out Card */}
            <Card elevated className="overflow-hidden">
              <div className={`p-6 text-white ${isClockedIn ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-slate-600 to-slate-700'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-white/80 mb-1">Current Time</p>
                    <h2 className="text-3xl font-bold">
                      {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/80 mb-1">Status</p>
                    <Badge variant={isClockedIn ? 'success' : 'neutral'} className="text-sm">
                      {isClockedIn ? 'Clocked In' : 'Clocked Out'}
                    </Badge>
                  </div>
                </div>

                {isClockedIn && (
                  <div className="mb-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                    <p className="text-sm text-white/80 mb-1">Time Worked Today</p>
                    <p className="text-2xl font-bold">{elapsedTime}</p>
                    <p className="text-sm text-white/60 mt-1">
                      Clocked in at {clockInTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}

                <Button
                  variant={isClockedIn ? 'danger' : 'success'}
                  fullWidth
                  size="lg"
                  disabled={clockBusy}
                  onClick={isClockedIn ? handleClockOut : handleClockIn}
                  icon={clockBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : isClockedIn ? <StopCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                  className="shadow-lg"
                >
                  {clockBusy ? 'Please wait…' : isClockedIn ? 'Clock Out' : 'Clock In'}
                </Button>
              </div>
            </Card>

            {/* Quick Actions */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3 px-1">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleUpload('photo')}
                  className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all active:scale-95"
                >
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                    <Camera className="w-7 h-7 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-900 text-sm">Take Photo</p>
                    <p className="text-sm text-slate-500">Capture site</p>
                  </div>
                </button>

                <button
                  onClick={() => handleUpload('video')}
                  className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all active:scale-95"
                >
                  <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center">
                    <Video className="w-7 h-7 text-purple-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-900 text-sm">Record Video</p>
                    <p className="text-sm text-slate-500">For estimates</p>
                  </div>
                </button>

                <button
                  onClick={() => handleUpload('document')}
                  className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-green-300 hover:shadow-lg transition-all active:scale-95"
                >
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
                    <Upload className="w-7 h-7 text-green-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-900 text-sm">Upload Doc</p>
                    <p className="text-sm text-slate-500">PDFs, files</p>
                  </div>
                </button>

                <button
                  onClick={() => window.location.href = '#messaging'}
                  className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all active:scale-95"
                >
                  <div className="w-14 h-14 bg-cyan-50 rounded-full flex items-center justify-center relative">
                    <MessageSquare className="w-7 h-7 text-cyan-600" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-sm rounded-full flex items-center justify-center">
                      3
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-900 text-sm">Messages</p>
                    <p className="text-sm text-slate-500">3 unread</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Today's Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-bold text-slate-900">Today's Tasks</h3>
                <Badge variant="primary" size="sm">{tasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {tasks.length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center text-sm text-slate-500">
                      No tasks assigned yet.
                    </CardContent>
                  </Card>
                )}
                {tasks.map((task) => (
                  <Card key={task.id} hover className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{task.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {fmtTime(task.scheduledAt)}
                            </span>
                            {task.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {task.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={task.status === 'in-progress' ? 'success' : task.status === 'completed' ? 'primary' : 'warning'}
                          size="sm"
                          dot
                        >
                          {task.status === 'in-progress' ? 'Active' : task.status === 'completed' ? 'Done' : 'Pending'}
                        </Badge>
                      </div>
                      {task.status === 'pending' && (
                        <Button variant="ghost" size="sm" fullWidth className="mt-2" onClick={() => startTask(task.id)}>
                          Start Task
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Uploads */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3 px-1">Recent Uploads</h3>
              <Card>
                <CardContent className="p-4">
                  {recentUploads.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No uploads yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentUploads.map((upload) => (
                        <div key={upload.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            upload.type === 'image' ? 'bg-blue-50' :
                            upload.type === 'video' ? 'bg-purple-50' : 'bg-green-50'
                          }`}>
                            {upload.type === 'image' && <Image className="w-5 h-5 text-blue-600" />}
                            {upload.type === 'video' && <Video className="w-5 h-5 text-purple-600" />}
                            {upload.type !== 'image' && upload.type !== 'video' && <FileText className="w-5 h-5 text-green-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{upload.name}</p>
                            <p className="text-sm text-slate-500">{relTime(upload.uploadedAt)} • {fmtSize(upload.size)}</p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Time Tracking Tab */}
        {activeTab === 'time' && (
          <>
            <Card elevated>
              <CardHeader>
                <CardTitle>Time Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Today's Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <p className="text-sm text-blue-600 font-semibold mb-1">Today</p>
                      <p className="text-2xl font-bold text-blue-900">{elapsedTime}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl">
                      <p className="text-sm text-green-600 font-semibold mb-1">This Week</p>
                      <p className="text-2xl font-bold text-green-900">{weekHours.toFixed(1)}h</p>
                    </div>
                  </div>

                  {/* Recent Punches */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Recent Punches</h4>
                    {recentPunches.length === 0 && !isClockedIn ? (
                      <p className="text-sm text-slate-500 text-center py-4">No punches recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {isClockedIn && clockInTime && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-slate-900">Today</span>
                              <Badge variant="success" size="sm">{elapsedTime}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span>In: {fmtTime(clockInTime.toISOString())}</span>
                              <span>Out: Active</span>
                            </div>
                          </div>
                        )}
                        {recentPunches.map((entry) => (
                          <div key={entry.id} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {new Date(entry.punchIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <Badge variant="success" size="sm">{(entry.totalHours || 0).toFixed(2)}h</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span>In: {fmtTime(entry.punchIn)}</span>
                              <span>Out: {entry.punchOut ? fmtTime(entry.punchOut) : '—'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => handleUpload('photo')}
                className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg active:scale-95 transition-transform"
              >
                <Camera className="w-8 h-8 mb-3 mx-auto" />
                <p className="font-semibold">Take Photo</p>
                <p className="text-sm text-blue-100 mt-1">Site photos</p>
              </button>
              <button
                onClick={() => handleUpload('video')}
                className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg active:scale-95 transition-transform"
              >
                <Video className="w-8 h-8 mb-3 mx-auto" />
                <p className="font-semibold">Record Video</p>
                <p className="text-sm text-purple-100 mt-1">CAD/Estimates</p>
              </button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Upload Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <button
                    onClick={() => handleUpload('photo')}
                    className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Image className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Photo Library</p>
                      <p className="text-sm text-slate-500">Choose from gallery</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => handleUpload('document')}
                    className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Paperclip className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Documents</p>
                      <p className="text-sm text-slate-500">PDFs, contracts, forms</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => handleUpload('video')}
                    className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Video className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Video Capture</p>
                      <p className="text-sm text-slate-500">Record for estimates/CAD</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
              </CardHeader>
              <CardContent>
                {recentUploads.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No uploads yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {recentUploads.map((item) => (
                      <div key={item.id} className="aspect-square bg-slate-100 rounded-lg relative overflow-hidden flex flex-col items-center justify-center p-2 text-center">
                        {item.type === 'image' && <Image className="w-6 h-6 text-blue-500 mb-1" />}
                        {item.type === 'video' && <Video className="w-6 h-6 text-purple-500 mb-1" />}
                        {item.type !== 'image' && item.type !== 'video' && <FileText className="w-6 h-6 text-green-500 mb-1" />}
                        <span className="text-[10px] text-slate-600 truncate w-full">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No tasks scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-1">{task.title}</h4>
                            <div className="space-y-1 text-sm text-slate-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {fmtTime(task.scheduledAt)}
                              </div>
                              {task.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {task.location}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={task.status === 'in-progress' ? 'success' : task.status === 'completed' ? 'primary' : 'warning'}
                            size="sm"
                            dot
                          >
                            {task.status === 'in-progress' ? 'Active' : task.status === 'completed' ? 'Done' : 'Pending'}
                          </Badge>
                        </div>
                        {task.status === 'pending' && (
                          <Button variant="primary" size="sm" fullWidth onClick={() => startTask(task.id)}>
                            Start Task
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-auto animate-slide-in-up">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">
                {uploadType === 'photo' && 'Take Photo'}
                {uploadType === 'video' && 'Record Video'}
                {uploadType === 'document' && 'Upload Document'}
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptFor(uploadType)}
                capture={uploadType === 'photo' ? 'environment' : undefined}
                className="hidden"
                onChange={handleFileSelected}
              />
              {uploadType === 'photo' && (
                <>
                  <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center">
                    <Camera className="w-16 h-16 text-white/50" />
                  </div>
                  <p className="text-sm text-slate-600 text-center">
                    Camera will activate. Take photos of the job site, materials, or progress.
                  </p>
                  <div className="space-y-2">
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700 mb-2 block">Photo Description</span>
                      <input
                        type="text"
                        value={uploadDesc}
                        onChange={(e) => setUploadDesc(e.target.value)}
                        placeholder="e.g., Before photo - kitchen"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700 mb-2 block">Project</span>
                      <select className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Kitchen Installation - Johnson</option>
                        <option>Bathroom Inspection - Smith</option>
                        <option>Materials Pickup</option>
                      </select>
                    </label>
                  </div>
                  <Button variant="primary" fullWidth size="lg" disabled={uploading} onClick={() => fileInputRef.current?.click()} icon={uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}>
                    {uploading ? 'Uploading…' : 'Choose / Take Photo'}
                  </Button>
                </>
              )}

              {uploadType === 'video' && (
                <>
                  <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <Video className="w-16 h-16 text-white/50" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3">
                        <p className="text-white text-sm font-semibold mb-1">Video Capture for:</p>
                        <div className="flex gap-2">
                          <Badge variant="primary" size="sm">Estimates</Badge>
                          <Badge variant="purple" size="sm">CAD Design</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-blue-900 text-sm mb-1">Video Tips</p>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Walk around the entire space slowly</li>
                          <li>• Capture all measurements and details</li>
                          <li>• Include narration describing the work</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700 mb-2 block">Video Purpose</span>
                      <select className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Estimate/Quote</option>
                        <option>CAD Design Reference</option>
                        <option>Progress Update</option>
                        <option>Customer Walkthrough</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700 mb-2 block">Project</span>
                      <select className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Kitchen Installation - Johnson</option>
                        <option>Bathroom Inspection - Smith</option>
                      </select>
                    </label>
                  </div>
                  <Button variant="primary" fullWidth size="lg" disabled={uploading} onClick={() => fileInputRef.current?.click()} icon={uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}>
                    {uploading ? 'Uploading…' : 'Choose / Record Video'}
                  </Button>
                </>
              )}

              {uploadType === 'document' && (
                <>
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="font-semibold text-slate-900 mb-1">Choose File</p>
                    <p className="text-sm text-slate-500">PDF, DOC, DOCX, PNG, JPG</p>
                    <p className="text-sm text-slate-400 mt-2">Max size: 50MB</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700 mb-2 block">Document Type</span>
                      <select className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Signed Contract</option>
                        <option>Invoice</option>
                        <option>Receipt</option>
                        <option>Permit</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700 mb-2 block">Notes (Optional)</span>
                      <textarea
                        rows={3}
                        value={uploadDesc}
                        onChange={(e) => setUploadDesc(e.target.value)}
                        placeholder="Add any notes about this document..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </label>
                  </div>
                  <Button variant="primary" fullWidth size="lg" disabled={uploading} onClick={() => fileInputRef.current?.click()} icon={uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}>
                    {uploading ? 'Uploading…' : 'Browse Files'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-3">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'home' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-sm font-semibold">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('time')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'time' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-sm font-semibold">Time</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'media' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm font-semibold">Media</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors relative ${
              activeTab === 'tasks' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-sm font-semibold">Tasks</span>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-sm rounded-full flex items-center justify-center">
              3
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}