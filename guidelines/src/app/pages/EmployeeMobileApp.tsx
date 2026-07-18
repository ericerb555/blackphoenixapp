import { useState, useEffect } from 'react';
import {
  Clock, PlayCircle, StopCircle, Camera, Upload, Video,
  MessageSquare, FileText, Image, Paperclip, CheckCircle,
  AlertCircle, MapPin, Calendar, User, Menu, Bell,
  Home, ClipboardList, Send, X, ChevronRight, Zap,
  BarChart3, Wifi, WifiOff, Battery, Smartphone, ArrowLeft
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export default function EmployeeMobileApp() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [activeTab, setActiveTab] = useState<'home' | 'time' | 'media' | 'tasks'>('home');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'photo' | 'document' | 'video' | null>(null);
  const [location, setLocation] = useState('Fetching location...');
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(85);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate elapsed time when clocked in
  useEffect(() => {
    if (isClockedIn && clockInTime) {
      const timer = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - clockInTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isClockedIn, clockInTime]);

  // Simulate location fetch
  useEffect(() => {
    setTimeout(() => {
      setLocation('123 Main St, City, ST 12345');
    }, 1000);
  }, []);

  const handleClockIn = () => {
    setIsClockedIn(true);
    setClockInTime(new Date());
  };

  const handleClockOut = () => {
    setIsClockedIn(false);
    setClockInTime(null);
    setElapsedTime('00:00:00');
  };

  const handleUpload = (type: 'photo' | 'document' | 'video') => {
    setUploadType(type);
    setShowUploadModal(true);
  };

  const todayTasks = [
    { id: 1, title: 'Kitchen Installation - Johnson Residence', time: '9:00 AM', status: 'in-progress', location: '456 Oak Ave' },
    { id: 2, title: 'Bathroom Inspection - Smith Home', time: '2:00 PM', status: 'pending', location: '789 Pine St' },
    { id: 3, title: 'Materials Pickup - Supplier', time: '4:30 PM', status: 'pending', location: 'Downtown Supply' }
  ];

  const recentUploads = [
    { id: 1, name: 'Before Photo - Kitchen', type: 'image', time: '10 mins ago', size: '2.4 MB' },
    { id: 2, name: 'Progress Video', type: 'video', time: '1 hour ago', size: '45.2 MB' },
    { id: 3, name: 'Signed Contract', type: 'document', time: '2 hours ago', size: '1.1 MB' }
  ];

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
          <div className="flex items-center gap-1">
            <Battery className="w-4 h-4" />
            <span>{batteryLevel}%</span>
          </div>
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
                  onClick={isClockedIn ? handleClockOut : handleClockIn}
                  icon={isClockedIn ? <StopCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                  className="shadow-lg"
                >
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
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
                <Badge variant="primary" size="sm">{todayTasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <Card key={task.id} hover className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{task.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {task.location}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant={task.status === 'in-progress' ? 'success' : 'warning'}
                          size="sm"
                          dot
                        >
                          {task.status === 'in-progress' ? 'Active' : 'Pending'}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" fullWidth className="mt-2">
                        View Details
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </Button>
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
                  <div className="space-y-3">
                    {recentUploads.map((upload) => (
                      <div key={upload.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          upload.type === 'image' ? 'bg-blue-50' :
                          upload.type === 'video' ? 'bg-purple-50' : 'bg-green-50'
                        }`}>
                          {upload.type === 'image' && <Image className="w-5 h-5 text-blue-600" />}
                          {upload.type === 'video' && <Video className="w-5 h-5 text-purple-600" />}
                          {upload.type === 'document' && <FileText className="w-5 h-5 text-green-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{upload.name}</p>
                          <p className="text-sm text-slate-500">{upload.time} • {upload.size}</p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
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
                      <p className="text-2xl font-bold text-green-900">32:45:12</p>
                    </div>
                  </div>

                  {/* Recent Punches */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Recent Punches</h4>
                    <div className="space-y-2">
                      {[
                        { date: 'Today', in: '8:00 AM', out: 'Active', hours: elapsedTime },
                        { date: 'Yesterday', in: '8:15 AM', out: '5:30 PM', hours: '9:15:00' },
                        { date: 'Jan 21', in: '8:00 AM', out: '5:00 PM', hours: '9:00:00' }
                      ].map((entry, index) => (
                        <div key={index} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-slate-900">{entry.date}</span>
                            <Badge variant="success" size="sm">{entry.hours}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span>In: {entry.in}</span>
                            <span>Out: {entry.out}</span>
                          </div>
                        </div>
                      ))}
                    </div>
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
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="aspect-square bg-slate-200 rounded-lg relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/50 to-purple-500/50" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
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
                <div className="space-y-3">
                  {todayTasks.map((task) => (
                    <div key={task.id} className="p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{task.title}</h4>
                          <div className="space-y-1 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.time}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {task.location}
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={task.status === 'in-progress' ? 'success' : 'warning'}
                          size="sm"
                          dot
                        >
                          {task.status === 'in-progress' ? 'Active' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" fullWidth>
                          Start Task
                        </Button>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <Button variant="primary" fullWidth size="lg" icon={<Camera className="w-5 h-5" />}>
                    Open Camera
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
                  <Button variant="primary" fullWidth size="lg" icon={<Video className="w-5 h-5" />}>
                    Start Recording
                  </Button>
                </>
              )}

              {uploadType === 'document' && (
                <>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
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
                        placeholder="Add any notes about this document..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </label>
                  </div>
                  <Button variant="primary" fullWidth size="lg" icon={<Upload className="w-5 h-5" />}>
                    Browse Files
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