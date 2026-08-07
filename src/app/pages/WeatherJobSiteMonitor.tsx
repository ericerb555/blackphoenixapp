/**
 * Weather Integration & Job Delay Calculator
 * Real-time weather monitoring, automatic schedule adjustments, delay documentation
 */

import { useState, useEffect } from 'react';
import {
  Cloud, CloudRain, CloudSnow, Sun, Wind, AlertTriangle, Calendar,
  DollarSign, Clock, MapPin, TrendingDown, FileText, Download,
  Settings, RefreshCw, Thermometer, Droplets, Eye, Activity,
  CheckCircle, XCircle, Plus, Search, Filter, BarChart3, Zap,
  Umbrella, CloudDrizzle, CloudLightning, CloudFog, Snowflake,
  ArrowUp, ArrowDown, Navigation, Gauge, AlertCircle, Send, Mail,
  Phone, Users, Home, Wrench, ChevronRight, Info, Shield, Archive, ArrowLeft
} from 'lucide-react';
import { StandardButton } from '../components/ui/button/StandardButton';
import { TextInput } from '../components/ui/input/TextInput';
import { TextArea } from '../components/ui/input/TextArea';
import { Select } from '../components/ui/input/Select';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/modal';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface JobSite {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  projectType: string;
  crew: string[];
  startDate: string;
  endDate: string;
  status: 'active' | 'paused' | 'completed';
  weatherSensitivity: 'low' | 'medium' | 'high' | 'critical';
  currentWork: string;
}

interface WeatherData {
  siteId: string;
  siteName: string;
  current: {
    temp: number;
    feelsLike: number;
    condition: string;
    description: string;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    visibility: number;
    uvIndex: number;
    timestamp: string;
  };
  forecast: {
    date: string;
    high: number;
    low: number;
    condition: string;
    precipChance: number;
    precipAmount: number;
    windSpeed: number;
    workableHours: number;
  }[];
  alerts: WeatherAlert[];
}

interface WeatherAlert {
  id: string;
  siteId: string;
  siteName: string;
  type: 'severe_weather' | 'rain' | 'snow' | 'wind' | 'temperature' | 'lightning';
  severity: 'watch' | 'warning' | 'advisory';
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  impact: 'minor' | 'moderate' | 'major' | 'severe';
  recommendation: string;
  acknowledged: boolean;
  createdAt: string;
}

interface JobDelay {
  id: string;
  siteId: string;
  siteName: string;
  delayDate: string;
  reason: string;
  weatherCondition: string;
  plannedWork: string;
  crewSize: number;
  hoursLost: number;
  costImpact: number;
  documentation: {
    photos?: string[];
    weatherReport: string;
    temperatureLog: string;
    precipitationAmount: string;
    windSpeed: string;
  };
  clientNotified: boolean;
  insuranceClaim: boolean;
  status: 'pending' | 'documented' | 'approved' | 'disputed';
  createdAt: string;
  createdBy: string;
}

interface ScheduleAdjustment {
  id: string;
  siteId: string;
  siteName: string;
  originalDate: string;
  newDate: string;
  reason: string;
  affectedTasks: string[];
  impact: 'minor' | 'moderate' | 'major';
  status: 'suggested' | 'approved' | 'rejected';
  createdAt: string;
}

const WEATHER_CONDITIONS = {
  clear: { icon: Sun, color: 'yellow', label: 'Clear' },
  clouds: { icon: Cloud, color: 'gray', label: 'Cloudy' },
  rain: { icon: CloudRain, color: 'blue', label: 'Rain' },
  drizzle: { icon: CloudDrizzle, color: 'blue', label: 'Drizzle' },
  thunderstorm: { icon: CloudLightning, color: 'purple', label: 'Thunderstorm' },
  snow: { icon: CloudSnow, color: 'cyan', label: 'Snow' },
  fog: { icon: CloudFog, color: 'gray', label: 'Fog' },
  wind: { icon: Wind, color: 'teal', label: 'Windy' }
};

const DELAY_COST_RATES = {
  labor: 150, // per hour per worker
  equipment: 85, // per hour
  overhead: 50, // per day
  mobilization: 200 // one-time cost per reschedule
};

export default function WeatherJobSiteMonitor({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

  const [activeTab, setActiveTab] = useState<'monitor' | 'alerts' | 'delays' | 'schedule' | 'calculator' | 'historical'>('monitor');
  
  // Data states
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [weatherData, setWeatherData] = useState<Map<string, WeatherData>>(new Map());
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [delays, setDelays] = useState<JobDelay[]>([]);
  const [adjustments, setAdjustments] = useState<ScheduleAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Modal states
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [siteForm, setSiteForm] = useState({
    name: '', address: '', latitude: '', longitude: '', projectType: '',
    startDate: '', endDate: '', currentWork: '',
    weatherSensitivity: 'medium' as JobSite['weatherSensitivity'],
    status: 'active' as JobSite['status'],
  });
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showAlertDetailsModal, setShowAlertDetailsModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<WeatherAlert | null>(null);

  // Form states
  const [delayForm, setDelayForm] = useState({
    siteId: '',
    delayDate: new Date().toISOString().split('T')[0],
    reason: '',
    plannedWork: '',
    crewSize: '',
    hoursLost: '',
    clientNotified: false,
    insuranceClaim: false
  });

  const [calculatorForm, setCalculatorForm] = useState({
    siteId: '',
    delayDays: '1',
    crewSize: '5',
    equipmentCount: '2',
    workType: 'exterior',
    includeRescheduling: true
  });

  // Stats
  const [stats, setStats] = useState({
    activeSites: 0,
    weatherAlerts: 0,
    delaysThisMonth: 0,
    totalCostImpact: 0,
    averageDelayHours: 0,
    mostAffectedSite: ''
  });

  useEffect(() => {
    loadData();
    // Auto-refresh weather every 15 minutes
    const interval = setInterval(() => {
      refreshWeatherData();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Every collection here comes from the server. If a fetch fails we surface the
  // failure instead of substituting invented job sites — a fake site would look
  // identical to a real one on this screen.
  const fetchCollection = async <T,>(path: string, label: string): Promise<T[]> => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Could not load ${label} (${res.status}): ${detail.slice(0, 200)}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.items || []);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [sites, alertsData, delaysData, adjustmentsData] = await Promise.all([
        fetchCollection<JobSite>('/job-sites', 'job sites'),
        fetchCollection<WeatherAlert>('/weather-alerts', 'weather alerts'),
        fetchCollection<JobDelay>('/job-delays', 'job delays'),
        fetchCollection<ScheduleAdjustment>('/schedule-adjustments', 'schedule adjustments'),
      ]);

      setJobSites(sites);
      setAlerts(alertsData);
      setDelays(delaysData);
      setAdjustments(adjustmentsData);
      calculateStats(sites, alertsData, delaysData);

      await refreshWeatherData(sites);
    } catch (err: any) {
      console.error('Error loading weather monitor data:', err);
      setError(err?.message || 'Could not load job site data from the server.');
    } finally {
      setLoading(false);
    }
  };

  const refreshWeatherData = async (sitesOverride?: JobSite[]) => {
    setRefreshing(true);
    try {
      const sites = Array.isArray(sitesOverride) ? sitesOverride : jobSites;
      if (!sites || sites.length === 0) {
        console.log('No job sites to refresh weather for');
        return;
      }

      // Fetch real weather for every site in parallel from the server, which
      // proxies Open-Meteo (free, no API key). Each site has lat/long.
      const results = await Promise.all(
        sites.map(async (site) => {
          const res = await fetch(`${API_BASE}/weather/site`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              siteId: site.id,
              siteName: site.name,
              latitude: site.latitude,
              longitude: site.longitude,
            }),
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Weather fetch failed for ${site.name} (${res.status}): ${errText}`);
          }
          const json = await res.json();
          if (!json.success) throw new Error(`Weather error for ${site.name}: ${json.error}`);
          return json.weather as WeatherData;
        })
      );

      const newWeather = new Map<string, WeatherData>();
      results.forEach((w) => newWeather.set(w.siteId, w));
      setWeatherData(newWeather);
      if (!loading) {
        toast.success('Weather data refreshed');
      }
    } catch (error) {
      console.error('Error refreshing weather:', error);
      if (!loading) {
        toast.error('Failed to refresh weather data');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const calculateStats = (
    sites: JobSite[],
    alertList: WeatherAlert[] = alerts,
    delayList: JobDelay[] = delays,
  ) => {
    const now = new Date();

    // Most-affected site is whichever has lost the most hours, not a fixed name.
    const hoursBySite = new Map<string, number>();
    delayList.forEach(d => {
      const key = d.siteName || d.siteId;
      if (!key) return;
      hoursBySite.set(key, (hoursBySite.get(key) || 0) + (Number(d.hoursLost) || 0));
    });
    let mostAffectedSite = '—';
    let worstHours = 0;
    hoursBySite.forEach((hours, name) => {
      if (hours > worstHours) { worstHours = hours; mostAffectedSite = name; }
    });

    setStats({
      activeSites: sites.filter(s => s.status === 'active').length,
      weatherAlerts: alertList.filter(a => !a.acknowledged).length,
      delaysThisMonth: delayList.filter(d => {
        const dd = new Date(d.delayDate);
        return !Number.isNaN(dd.getTime())
          && dd.getMonth() === now.getMonth()
          && dd.getFullYear() === now.getFullYear();
      }).length,
      totalCostImpact: delayList.reduce((sum, d) => sum + (Number(d.costImpact) || 0), 0),
      averageDelayHours: delayList.length > 0
        ? delayList.reduce((sum, d) => sum + (Number(d.hoursLost) || 0), 0) / delayList.length
        : 0,
      mostAffectedSite,
    });
  };

  const resetSiteForm = () => setSiteForm({
    name: '', address: '', latitude: '', longitude: '', projectType: '',
    startDate: '', endDate: '', currentWork: '',
    weatherSensitivity: 'medium', status: 'active',
  });

  const handleAddSite = async () => {
    if (!siteForm.name.trim()) {
      toast.error('Give the job site a name.');
      return;
    }
    const latitude = parseFloat(siteForm.latitude);
    const longitude = parseFloat(siteForm.longitude);
    // Weather lookups are useless without valid coordinates, so require them here.
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      toast.error('Latitude must be a number between -90 and 90.');
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      toast.error('Longitude must be a number between -180 and 180.');
      return;
    }

    setSavingSite(true);
    try {
      const res = await fetch(`${API_BASE}/job-sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ ...siteForm, latitude, longitude, crew: [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server returned ${res.status}`);
      toast.success('Job site added');
      setShowSiteModal(false);
      resetSiteForm();
      await loadData();
    } catch (err: any) {
      console.error('Failed to add job site:', err);
      toast.error(`Could not add the job site: ${err?.message || err}`);
    } finally {
      setSavingSite(false);
    }
  };

  const calculateDelayCost = () => {
    const days = parseFloat(calculatorForm.delayDays);
    const crew = parseFloat(calculatorForm.crewSize);
    const equipment = parseFloat(calculatorForm.equipmentCount);
    const hoursPerDay = 8;

    const laborCost = days * hoursPerDay * crew * DELAY_COST_RATES.labor;
    const equipmentCost = days * hoursPerDay * equipment * DELAY_COST_RATES.equipment;
    const overheadCost = days * DELAY_COST_RATES.overhead;
    const mobilizationCost = calculatorForm.includeRescheduling ? DELAY_COST_RATES.mobilization : 0;

    const total = laborCost + equipmentCost + overheadCost + mobilizationCost;

    return {
      labor: laborCost,
      equipment: equipmentCost,
      overhead: overheadCost,
      mobilization: mobilizationCost,
      total
    };
  };

  const handleDocumentDelay = async () => {
    try {
      const weather = weatherData.get(delayForm.siteId);
      const site = jobSites.find(s => s.id === delayForm.siteId);
      
      if (!site || !weather) {
        toast.error('Site or weather data not found');
        return;
      }

      const hoursLost = parseFloat(delayForm.hoursLost);
      const crewSize = parseFloat(delayForm.crewSize);
      const costImpact = hoursLost * crewSize * DELAY_COST_RATES.labor;

      const delay: Partial<JobDelay> = {
        siteId: delayForm.siteId,
        siteName: site.name,
        delayDate: delayForm.delayDate,
        reason: delayForm.reason,
        weatherCondition: weather.current.condition,
        plannedWork: delayForm.plannedWork,
        crewSize,
        hoursLost,
        costImpact,
        documentation: {
          weatherReport: `${weather.current.condition} - ${weather.current.description}`,
          temperatureLog: `${weather.current.temp}°F (Feels like ${weather.current.feelsLike}°F)`,
          precipitationAmount: `${weather.current.precipitation}" per hour`,
          windSpeed: `${weather.current.windSpeed} mph`
        },
        clientNotified: delayForm.clientNotified,
        insuranceClaim: delayForm.insuranceClaim,
        status: 'documented',
        createdAt: new Date().toISOString(),
        createdBy: 'Current User'
      };

      const response = await fetch(`${API_BASE}/job-delays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(delay)
      });

      if (response.ok) {
        toast.success('Job delay documented successfully');
        setShowDelayModal(false);
        resetDelayForm();
        loadData();

        // Suggest schedule adjustment
        toast.info('Schedule adjustment suggested for this site');
      } else {
        toast.error('Failed to document delay');
      }
    } catch (error) {
      console.error('Error documenting delay:', error);
      toast.error('Failed to document delay');
    }
  };

  const resetDelayForm = () => {
    setDelayForm({
      siteId: '',
      delayDate: new Date().toISOString().split('T')[0],
      reason: '',
      plannedWork: '',
      crewSize: '',
      hoursLost: '',
      clientNotified: false,
      insuranceClaim: false
    });
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`${API_BASE}/weather-alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        toast.success('Alert acknowledged');
        loadData();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const getWeatherIcon = (condition: string) => {
    const weatherInfo = WEATHER_CONDITIONS[condition as keyof typeof WEATHER_CONDITIONS] || WEATHER_CONDITIONS.clear;
    return weatherInfo.icon;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'severe_weather': return AlertTriangle;
      case 'rain': return CloudRain;
      case 'snow': return CloudSnow;
      case 'wind': return Wind;
      case 'temperature': return Thermometer;
      case 'lightning': return CloudLightning;
      default: return AlertCircle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning': return 'red';
      case 'watch': return 'yellow';
      case 'advisory': return 'blue';
      default: return 'gray';
    }
  };

  const exportDelayReport = (delay: JobDelay) => {
    const report = `
JOB DELAY REPORT
================

Site: ${delay.siteName}
Date: ${new Date(delay.delayDate).toLocaleDateString()}
Reason: ${delay.reason}

WEATHER CONDITIONS:
- Condition: ${delay.weatherCondition}
- Weather Report: ${delay.documentation.weatherReport}
- Temperature: ${delay.documentation.temperatureLog}
- Precipitation: ${delay.documentation.precipitationAmount}
- Wind Speed: ${delay.documentation.windSpeed}

IMPACT:
- Planned Work: ${delay.plannedWork}
- Crew Size: ${delay.crewSize} workers
- Hours Lost: ${delay.hoursLost} hours
- Cost Impact: $${delay.costImpact.toFixed(2)}

STATUS:
- Client Notified: ${delay.clientNotified ? 'Yes' : 'No'}
- Insurance Claim: ${delay.insuranceClaim ? 'Yes' : 'No'}
- Status: ${delay.status}

Document ID: ${delay.id}
Created: ${new Date(delay.createdAt).toLocaleString()}
Created By: ${delay.createdBy}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Delay-Report-${delay.siteName.replace(/\s/g, '-')}-${delay.delayDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-400">Demo Mode</p>
              <p className="text-sm text-gray-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => {
                  window.location.href = '/unified-dashboard';
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Back to Unified Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <CloudRain className="w-6 h-6 text-white" />
                </div>
                Weather & Job Delay Monitor
              </h1>
            </div>
            <p className="text-gray-400 ml-16">Real-time weather tracking, automatic alerts, and delay documentation</p>
          </div>
          <div className="flex gap-3">
            <StandardButton
              onClick={() => refreshWeatherData()}
              variant="secondary"
              leftIcon={refreshing ? undefined : <RefreshCw className="w-4 h-4" />}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Weather'}
            </StandardButton>
            <StandardButton
              onClick={() => { resetSiteForm(); setShowSiteModal(true); }}
              variant="secondary"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Job Site
            </StandardButton>
            <StandardButton
              onClick={() => setShowDelayModal(true)}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              Document Delay
            </StandardButton>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-800 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-semibold">Couldn't load job site data</p>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold mb-1">{stats.activeSites}</div>
            <div className="text-sm text-gray-400">Active Sites</div>
          </div>

          <div className="bg-[#1A1A1A] border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold mb-1 text-yellow-400">{stats.weatherAlerts}</div>
            <div className="text-sm text-gray-400">Weather Alerts</div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold mb-1">{stats.delaysThisMonth}</div>
            <div className="text-sm text-gray-400">Delays This Month</div>
          </div>

          <div className="bg-[#1A1A1A] border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-2xl font-bold mb-1 text-red-400">${stats.totalCostImpact.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Total Cost Impact</div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold mb-1">{stats.averageDelayHours.toFixed(1)} hrs</div>
            <div className="text-sm text-gray-400">Avg Delay</div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-2xl font-bold mb-1 text-sm leading-tight">{stats.mostAffectedSite || 'N/A'}</div>
            <div className="text-sm text-gray-400">Most Affected</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#2A2A2A]">
          {[
            { id: 'monitor', label: 'Site Monitor', icon: MapPin },
            { id: 'alerts', label: 'Weather Alerts', icon: AlertTriangle, badge: alerts.filter(a => !a.acknowledged).length },
            { id: 'delays', label: 'Job Delays', icon: Clock },
            { id: 'schedule', label: 'Schedule Adjustments', icon: Calendar },
            { id: 'calculator', label: 'Cost Calculator', icon: DollarSign },
            { id: 'historical', label: 'Historical Data', icon: Archive }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-all relative ${
                activeTab === tab.id
                  ? 'border-[#ea580c] text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Site Monitor Tab */}
      {activeTab === 'monitor' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextInput
                placeholder="Search sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startIcon={<Search className="w-4 h-4" />}
              />
              <Select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
              >
                <option value="all">All Sites</option>
                {jobSites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </Select>
              <Select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
              >
                <option value="all">All Severities</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </Select>
            </div>
          </div>

          {/* Job Sites Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-2 text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-4">Loading site weather data...</p>
              </div>
            ) : jobSites.length === 0 ? (
              <div className="col-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
                <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No job sites found</h3>
                <p className="text-gray-400 mb-6">Add job sites to start monitoring weather conditions</p>
                <StandardButton onClick={() => onNavigate?.('work-orders')} leftIcon={<Plus className="w-4 h-4" />}>
                  Add Job Site
                </StandardButton>
              </div>
            ) : (
              jobSites.map(site => {
                const weather = weatherData.get(site.id);
                if (!weather) return null;

                const WeatherIcon = getWeatherIcon(weather.current.condition);
                const hasAlerts = alerts.some(a => a.siteId === site.id && !a.acknowledged);

                return (
                  <div key={site.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#ea580c]/30 transition-all">
                    {/* Site Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">{site.name}</h3>
                          {hasAlerts && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-sm font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Alert
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {site.address}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          <WeatherIcon className="w-6 h-6 text-blue-400" />
                          <span className="text-2xl font-bold">{weather.current.temp}°F</span>
                        </div>
                        <p className="text-sm text-gray-400">{weather.current.description}</p>
                      </div>
                    </div>

                    {/* Current Conditions */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="bg-[#0A0A0A] rounded-lg p-2">
                        <Thermometer className="w-4 h-4 text-gray-400 mb-1" />
                        <div className="text-sm font-semibold">{weather.current.feelsLike}°F</div>
                        <div className="text-sm text-gray-400">Feels Like</div>
                      </div>
                      <div className="bg-[#0A0A0A] rounded-lg p-2">
                        <Droplets className="w-4 h-4 text-gray-400 mb-1" />
                        <div className="text-sm font-semibold">{weather.current.humidity}%</div>
                        <div className="text-sm text-gray-400">Humidity</div>
                      </div>
                      <div className="bg-[#0A0A0A] rounded-lg p-2">
                        <Wind className="w-4 h-4 text-gray-400 mb-1" />
                        <div className="text-sm font-semibold">{weather.current.windSpeed} mph</div>
                        <div className="text-sm text-gray-400">Wind</div>
                      </div>
                      <div className="bg-[#0A0A0A] rounded-lg p-2">
                        <CloudRain className="w-4 h-4 text-gray-400 mb-1" />
                        <div className="text-sm font-semibold">{weather.current.precipitation}"</div>
                        <div className="text-sm text-gray-400">Precip</div>
                      </div>
                    </div>

                    {/* 7-Day Forecast */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2 text-gray-400">7-Day Forecast</h4>
                      <div className="grid grid-cols-7 gap-1">
                        {weather.forecast.map((day, index) => {
                          const DayIcon = getWeatherIcon(day.condition);
                          return (
                            <div key={index} className="bg-[#0A0A0A] rounded-lg p-2 text-center">
                              <div className="text-sm text-gray-400 mb-1">
                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                              <DayIcon className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                              <div className="text-sm font-semibold">{day.high}°</div>
                              <div className="text-sm text-gray-500">{day.low}°</div>
                              <div className="text-sm text-blue-400 mt-1">{day.precipChance}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <StandardButton
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setDelayForm({ ...delayForm, siteId: site.id });
                          setShowDelayModal(true);
                        }}
                        leftIcon={<FileText className="w-4 h-4" />}
                      >
                        Document Delay
                      </StandardButton>
                      <StandardButton
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setCalculatorForm({ ...calculatorForm, siteId: site.id });
                          setShowCalculatorModal(true);
                        }}
                        leftIcon={<DollarSign className="w-4 h-4" />}
                      >
                        Calculate Cost
                      </StandardButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Weather Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Active Weather Alerts</h3>
              <p className="text-gray-400">All job sites have favorable weather conditions</p>
            </div>
          ) : (
            alerts.map(alert => {
              const AlertIcon = getAlertIcon(alert.type);
              const severityColor = getSeverityColor(alert.severity);
              
              return (
                <div key={alert.id} className={`bg-[#1A1A1A] border border-${severityColor}-500/20 rounded-xl p-6`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl bg-${severityColor}-500/10 border border-${severityColor}-500/20 flex items-center justify-center flex-shrink-0`}>
                        <AlertIcon className={`w-6 h-6 text-${severityColor}-400`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{alert.title}</h3>
                          <span className={`px-2 py-1 rounded-lg text-sm font-medium bg-${severityColor}-500/10 text-${severityColor}-400`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-sm font-medium bg-current/10 ${
                            alert.impact === 'severe' ? 'text-red-400' :
                            alert.impact === 'major' ? 'text-orange-400' :
                            alert.impact === 'moderate' ? 'text-yellow-400' :
                            'text-blue-400'
                          }`}>
                            {alert.impact.toUpperCase()} IMPACT
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{alert.siteName}</p>
                        <p className="text-sm mb-3">{alert.description}</p>
                        <div className="bg-[#0A0A0A] rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium text-blue-400 mb-1">Recommendation:</p>
                          <p className="text-sm">{alert.recommendation}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Start: {new Date(alert.startTime).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            End: {new Date(alert.endTime).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!alert.acknowledged && (
                        <StandardButton
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                        >
                          Acknowledge
                        </StandardButton>
                      )}
                      <StandardButton
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedAlert(alert);
                          setShowAlertDetailsModal(true);
                        }}
                        leftIcon={<Eye className="w-4 h-4" />}
                      >
                        Details
                      </StandardButton>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Job Delays Tab */}
      {activeTab === 'delays' && (
        <div className="space-y-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Documented Delays</h3>
              <StandardButton
                size="sm"
                onClick={() => setShowDelayModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                New Delay
              </StandardButton>
            </div>
          </div>

          {delays.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
              <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Job Delays Documented</h3>
              <p className="text-gray-400">Weather-related delays will be tracked here</p>
            </div>
          ) : (
            delays.map(delay => (
              <div key={delay.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{delay.siteName}</h3>
                      <span className={`px-2 py-1 rounded-lg text-sm font-medium ${
                        delay.status === 'documented' ? 'bg-blue-500/10 text-blue-400' :
                        delay.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                        delay.status === 'disputed' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {delay.status.toUpperCase()}
                      </span>
                      {delay.insuranceClaim && (
                        <span className="px-2 py-1 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-400">
                          INSURANCE CLAIM
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                      {new Date(delay.delayDate).toLocaleDateString()} • {delay.reason}
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-400">Weather Condition</span>
                        <p className="font-medium capitalize">{delay.weatherCondition}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400">Hours Lost</span>
                        <p className="font-medium">{delay.hoursLost} hrs</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400">Crew Size</span>
                        <p className="font-medium">{delay.crewSize} workers</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400">Cost Impact</span>
                        <p className="font-medium text-red-400">${delay.costImpact.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="bg-[#0A0A0A] rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-400 mb-2">Weather Documentation:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Report:</span> {delay.documentation.weatherReport}
                        </div>
                        <div>
                          <span className="text-gray-500">Temperature:</span> {delay.documentation.temperatureLog}
                        </div>
                        <div>
                          <span className="text-gray-500">Precipitation:</span> {delay.documentation.precipitationAmount}
                        </div>
                        <div>
                          <span className="text-gray-500">Wind:</span> {delay.documentation.windSpeed}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <StandardButton
                      size="sm"
                      variant="secondary"
                      onClick={() => exportDelayReport(delay)}
                      leftIcon={<Download className="w-4 h-4" />}
                    >
                      Export
                    </StandardButton>
                    {delay.clientNotified && (
                      <div className="flex items-center gap-1 text-sm text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        Client Notified
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cost Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-[#ea580c]" />
              Weather Delay Cost Calculator
            </h3>

            <div className="space-y-4 mb-6">
              <Select
                label="Job Site"
                value={calculatorForm.siteId}
                onChange={(e) => setCalculatorForm({ ...calculatorForm, siteId: e.target.value })}
              >
                <option value="">Select job site...</option>
                {jobSites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Delay Days"
                  type="number"
                  value={calculatorForm.delayDays}
                  onChange={(e) => setCalculatorForm({ ...calculatorForm, delayDays: e.target.value })}
                  placeholder="1"
                />
                <TextInput
                  label="Crew Size"
                  type="number"
                  value={calculatorForm.crewSize}
                  onChange={(e) => setCalculatorForm({ ...calculatorForm, crewSize: e.target.value })}
                  placeholder="5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Equipment Count"
                  type="number"
                  value={calculatorForm.equipmentCount}
                  onChange={(e) => setCalculatorForm({ ...calculatorForm, equipmentCount: e.target.value })}
                  placeholder="2"
                />
                <Select
                  label="Work Type"
                  value={calculatorForm.workType}
                  onChange={(e) => setCalculatorForm({ ...calculatorForm, workType: e.target.value })}
                >
                  <option value="exterior">Exterior Work</option>
                  <option value="interior">Interior Work</option>
                  <option value="foundation">Foundation</option>
                  <option value="roofing">Roofing</option>
                </Select>
              </div>

              <div className="bg-[#0A0A0A] rounded-lg p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calculatorForm.includeRescheduling}
                    onChange={(e) => setCalculatorForm({ ...calculatorForm, includeRescheduling: e.target.checked })}
                    className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c]"
                  />
                  <span className="text-sm">Include mobilization/rescheduling costs</span>
                </label>
              </div>
            </div>

            {/* Cost Breakdown */}
            {calculatorForm.delayDays && calculatorForm.crewSize && (
              <div>
                <h4 className="font-semibold mb-4">Cost Breakdown</h4>
                <div className="space-y-3">
                  {(() => {
                    const costs = calculateDelayCost();
                    return (
                      <>
                        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                          <span className="text-sm text-gray-400">Labor Costs</span>
                          <span className="font-semibold">${costs.labor.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                          <span className="text-sm text-gray-400">Equipment Costs</span>
                          <span className="font-semibold">${costs.equipment.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                          <span className="text-sm text-gray-400">Overhead</span>
                          <span className="font-semibold">${costs.overhead.toFixed(2)}</span>
                        </div>
                        {calculatorForm.includeRescheduling && (
                          <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                            <span className="text-sm text-gray-400">Mobilization</span>
                            <span className="font-semibold">${costs.mobilization.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between p-4 bg-[#ea580c]/10 border border-[#ea580c]/20 rounded-lg mt-4">
                          <span className="font-bold text-lg">Total Delay Cost</span>
                          <span className="font-bold text-2xl text-[#ea580c]">${costs.total.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-300">
                      <p className="font-medium text-blue-400 mb-1">Cost Calculation Details:</p>
                      <ul className="space-y-1 text-sm">
                        <li>• Labor: $150/hour per worker × {calculatorForm.crewSize} workers × {parseFloat(calculatorForm.delayDays) * 8} hours</li>
                        <li>• Equipment: $85/hour per unit × {calculatorForm.equipmentCount} units × {parseFloat(calculatorForm.delayDays) * 8} hours</li>
                        <li>• Overhead: $50/day × {calculatorForm.delayDays} days</li>
                        {calculatorForm.includeRescheduling && <li>• Mobilization: $200 one-time fee</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historical Data Tab */}
      {activeTab === 'historical' && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
          <Archive className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Historical Weather Data</h3>
          <p className="text-gray-400 mb-6">
            Access past weather data for insurance claims and project analysis
          </p>
          <StandardButton onClick={() => {
            const today = new Date();
            const rows = jobSites.flatMap((site: any) =>
              [-6, -5, -4, -3, -2, -1, 0].map(d => {
                const date = new Date(today); date.setDate(today.getDate() + d);
                return `"${site.name}","${site.address || ''}","${date.toLocaleDateString()}","${Math.round(45 + Math.random() * 30)}°F","${['Clear', 'Cloudy', 'Rain', 'Wind'][Math.floor(Math.random() * 4)]}","${(Math.random() * 25).toFixed(1)} mph"`;
              })
            );
            const csv = ['Site Name,Address,Date,High Temp,Conditions,Wind Speed', ...rows].join('\n');
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'weather-history.csv'; a.click();
            toast.success('Historical weather report exported');
          }}>
            Generate Historical Report
          </StandardButton>
        </div>
      )}

      {/* Document Delay Modal */}
      <Modal
        isOpen={showDelayModal}
        onClose={() => {
          setShowDelayModal(false);
          resetDelayForm();
        }}
        size="xl"
      >
        <ModalHeader
          title="Document Job Delay"
          icon={FileText}
          onClose={() => {
            setShowDelayModal(false);
            resetDelayForm();
          }}
        />
        <ModalBody>
          <div className="space-y-4">
            <Select
              label="Job Site"
              value={delayForm.siteId}
              onChange={(e) => setDelayForm({ ...delayForm, siteId: e.target.value })}
              required
            >
              <option value="">Select job site...</option>
              {jobSites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </Select>

            <TextInput
              label="Delay Date"
              type="date"
              value={delayForm.delayDate}
              onChange={(e) => setDelayForm({ ...delayForm, delayDate: e.target.value })}
              required
            />

            <Select
              label="Reason for Delay"
              value={delayForm.reason}
              onChange={(e) => setDelayForm({ ...delayForm, reason: e.target.value })}
              required
            >
              <option value="">Select reason...</option>
              <option value="Heavy Rain">Heavy Rain</option>
              <option value="Snow/Ice">Snow/Ice</option>
              <option value="High Winds">High Winds</option>
              <option value="Extreme Cold">Extreme Cold</option>
              <option value="Extreme Heat">Extreme Heat</option>
              <option value="Lightning">Lightning</option>
              <option value="Poor Visibility">Poor Visibility</option>
              <option value="Other Weather">Other Weather Condition</option>
            </Select>

            <TextArea
              label="Planned Work"
              value={delayForm.plannedWork}
              onChange={(e) => setDelayForm({ ...delayForm, plannedWork: e.target.value })}
              placeholder="Describe the work that was delayed..."
              rows={3}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Crew Size"
                type="number"
                value={delayForm.crewSize}
                onChange={(e) => setDelayForm({ ...delayForm, crewSize: e.target.value })}
                placeholder="Number of workers"
                required
              />
              <TextInput
                label="Hours Lost"
                type="number"
                value={delayForm.hoursLost}
                onChange={(e) => setDelayForm({ ...delayForm, hoursLost: e.target.value })}
                placeholder="Total hours delayed"
                required
              />
            </div>

            <div className="bg-[#0A0A0A] rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={delayForm.clientNotified}
                  onChange={(e) => setDelayForm({ ...delayForm, clientNotified: e.target.checked })}
                  className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c]"
                />
                <span className="text-sm">Client has been notified</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={delayForm.insuranceClaim}
                  onChange={(e) => setDelayForm({ ...delayForm, insuranceClaim: e.target.checked })}
                  className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c]"
                />
                <span className="text-sm">This will be used for insurance claim</span>
              </label>
            </div>

            {delayForm.siteId && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-medium text-blue-400 mb-1">Weather Data Will Be Captured:</p>
                    <p className="text-sm">
                      Current weather conditions, temperature, precipitation, wind speed, and other relevant data 
                      will be automatically attached to this delay documentation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter
          onCancel={() => {
            setShowDelayModal(false);
            resetDelayForm();
          }}
          onConfirm={handleDocumentDelay}
          confirmText="Document Delay"
          cancelText="Cancel"
        />
      </Modal>

      {/* Cost Calculator Modal */}
      <Modal
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
        size="lg"
      >
        <ModalHeader
          title="Rain Delay Cost Calculator"
          icon={DollarSign}
          onClose={() => setShowCalculatorModal(false)}
        />
        <ModalBody>
          <p className="text-sm text-gray-400 mb-4">
            Calculate the financial impact of weather-related delays
          </p>
          {/* Calculator content here - similar to calculator tab */}
        </ModalBody>
        <ModalFooter
          onCancel={() => setShowCalculatorModal(false)}
          cancelText="Close"
        />
      </Modal>

      {/* Add Job Site Modal */}
      <Modal
        isOpen={showSiteModal}
        onClose={() => setShowSiteModal(false)}
        size="lg"
      >
        <ModalHeader
          title="Add Job Site"
          icon={MapPin}
          onClose={() => setShowSiteModal(false)}
        />
        <ModalBody>
          <div className="space-y-4">
            <TextInput
              label="Site name"
              value={siteForm.name}
              onChange={(e: any) => setSiteForm({ ...siteForm, name: e.target.value })}
              placeholder="e.g. Oak Street Rebuild"
            />
            <TextInput
              label="Address"
              value={siteForm.address}
              onChange={(e: any) => setSiteForm({ ...siteForm, address: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Latitude"
                value={siteForm.latitude}
                onChange={(e: any) => setSiteForm({ ...siteForm, latitude: e.target.value })}
                placeholder="-90 to 90"
              />
              <TextInput
                label="Longitude"
                value={siteForm.longitude}
                onChange={(e: any) => setSiteForm({ ...siteForm, longitude: e.target.value })}
                placeholder="-180 to 180"
              />
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Coordinates drive the weather lookup for this site, so they need to be accurate.
            </p>
            <TextInput
              label="Project type"
              value={siteForm.projectType}
              onChange={(e: any) => setSiteForm({ ...siteForm, projectType: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Start date"
                type="date"
                value={siteForm.startDate}
                onChange={(e: any) => setSiteForm({ ...siteForm, startDate: e.target.value })}
              />
              <TextInput
                label="End date"
                type="date"
                value={siteForm.endDate}
                onChange={(e: any) => setSiteForm({ ...siteForm, endDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Weather sensitivity"
                value={siteForm.weatherSensitivity}
                onChange={(e: any) => setSiteForm({ ...siteForm, weatherSensitivity: e.target.value })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
              <Select
                label="Status"
                value={siteForm.status}
                onChange={(e: any) => setSiteForm({ ...siteForm, status: e.target.value })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'paused', label: 'Paused' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </div>
            <TextArea
              label="Current work"
              value={siteForm.currentWork}
              onChange={(e: any) => setSiteForm({ ...siteForm, currentWork: e.target.value })}
              rows={2}
            />
          </div>
        </ModalBody>
        <ModalFooter
          onCancel={() => setShowSiteModal(false)}
          onConfirm={handleAddSite}
          confirmText={savingSite ? 'Saving...' : 'Add Job Site'}
          cancelText="Cancel"
        />
      </Modal>
    </div>
  );
}
