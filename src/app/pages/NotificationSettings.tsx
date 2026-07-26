import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, Bell, Check, AlertCircle, Send, Settings, Users, UserPlus, CreditCard, AlertTriangle, Plus, Trash2, Crown } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface NotificationTriggers {
  customerSignup: boolean;
  subscriptionAdded: boolean;
  workRequest: boolean;
  systemAlert: boolean;
  paymentFailed: boolean;
  vendorApplication: boolean;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  receiveEmailAlerts: boolean;
  receiveSMSAlerts: boolean;
  triggers: NotificationTriggers;
}

export default function NotificationSettings() {
  const [emailsInput, setEmailsInput] = useState('');
  const [phonesInput, setPhonesInput] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  // New state for notification triggers
  const [triggers, setTriggers] = useState<NotificationTriggers>({
    customerSignup: true,
    subscriptionAdded: true,
    workRequest: true,
    systemAlert: true,
    paymentFailed: true,
    vendorApplication: true
  });
  
  // Admin users management
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Admin'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Load from localStorage
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      setEmailsInput(settings.emails || '');
      setPhonesInput(settings.phones || '');
      setCompanyName(settings.companyName || '');
      setFromEmail(settings.fromEmail || '');
      setFromName(settings.fromName || '');
      setDashboardUrl(settings.dashboardUrl || window.location.origin + '/admin-alerts');
      setTriggers(settings.triggers || triggers);
      setAdminUsers(settings.adminUsers || []);
    } else {
      // Set default dashboard URL
      setDashboardUrl(window.location.origin + '/admin-alerts');
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    
    const settings = {
      emails: emailsInput,
      phones: phonesInput,
      companyName,
      fromEmail,
      fromName,
      dashboardUrl,
      triggers,
      adminUsers
    };

    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Settings saved successfully!', {
        description: 'Your notification preferences have been updated.'
      });
    }, 500);
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address to test');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/notifications/test-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email: testEmail })
        }
      );

      if (response.ok) {
        toast.success('Test email sent!', {
          description: `Check ${testEmail} for the test message`
        });
      } else {
        const error = await response.json();
        toast.error('Email test failed', {
          description: error.error || 'Please check your email provider configuration'
        });
      }
    } catch (error: any) {
      toast.error('Email test failed', {
        description: error.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number to test');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/notifications/test-sms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ phone: testPhone })
        }
      );

      if (response.ok) {
        toast.success('Test SMS sent!', {
          description: `Check ${testPhone} for the test message`
        });
      } else {
        const error = await response.json();
        toast.error('SMS test failed', {
          description: error.error || 'Please check your Twilio configuration'
        });
      }
    } catch (error: any) {
      toast.error('SMS test failed', {
        description: error.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddAdmin = () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.phone) {
      toast.error('Please fill in all fields');
      return;
    }

    const newAdminUser: AdminUser = {
      id: Date.now().toString(),
      name: newAdmin.name,
      email: newAdmin.email,
      phone: newAdmin.phone,
      role: newAdmin.role,
      receiveEmailAlerts: true,
      receiveSMSAlerts: true,
      triggers: { ...triggers }
    };

    setAdminUsers([...adminUsers, newAdminUser]);
    setNewAdmin({ name: '', email: '', phone: '', role: 'Admin' });
    setShowAddAdmin(false);
  };

  const handleRemoveAdmin = (id: string) => {
    setAdminUsers(adminUsers.filter(user => user.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#111111] to-[#0A0A0A] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => window.location.href = '/unified-dashboard'}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-3 bg-gradient-to-br from-[#ea580c] to-[#fb923c] rounded-xl">
            <Bell className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ea580c] to-[#fb923c] bg-clip-text text-transparent">
              Notification Settings
            </h1>
            <p className="text-gray-400">Configure email and SMS alerts for work requests</p>
          </div>
        </div>
      </div>

      {/* Setup Instructions Banner */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-[#ea580c]/20 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#ea580c]/20 rounded-lg">
            <AlertCircle className="w-6 h-6 text-[#ea580c]" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">Setup Required</h3>
            <p className="text-gray-400 mb-4">
              To enable email and SMS notifications, you need to configure environment variables in your Supabase Edge Function.
              Go to your Supabase project dashboard → Edge Functions → server → Settings → Secrets.
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="text-white font-semibold mb-2">📧 Email Configuration (Choose one):</h4>
                <div className="ml-4 space-y-2 text-gray-300">
                  <div>
                    <strong className="text-[#ea580c]">Option 1: Resend (Recommended - Easiest)</strong>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li><code className="bg-black/50 px-2 py-0.5 rounded">RESEND_API_KEY</code> - Get from <a href="https://resend.com" target="_blank" className="text-blue-400 hover:underline">resend.com</a></li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-[#ea580c]">Option 2: SendGrid</strong>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li><code className="bg-black/50 px-2 py-0.5 rounded">SENDGRID_API_KEY</code> - Get from <a href="https://sendgrid.com" target="_blank" className="text-blue-400 hover:underline">sendgrid.com</a></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">📱 SMS Configuration:</h4>
                <div className="ml-4 space-y-1 text-gray-300">
                  <div><code className="bg-black/50 px-2 py-0.5 rounded">TWILIO_ACCOUNT_SID</code> - Your Twilio Account SID</div>
                  <div><code className="bg-black/50 px-2 py-0.5 rounded">TWILIO_AUTH_TOKEN</code> - Your Twilio Auth Token</div>
                  <div><code className="bg-black/50 px-2 py-0.5 rounded">TWILIO_PHONE_NUMBER</code> - Your Twilio phone number (e.g., +15551234567)</div>
                  <div className="mt-2">Get credentials from <a href="https://www.twilio.com/console" target="_blank" className="text-blue-400 hover:underline">twilio.com/console</a></div>
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">⚙️ Required Settings (Configure below):</h4>
                <div className="ml-4 space-y-1 text-gray-300">
                  <div><code className="bg-black/50 px-2 py-0.5 rounded">ADMIN_NOTIFICATION_EMAILS</code> - Comma-separated email addresses</div>
                  <div><code className="bg-black/50 px-2 py-0.5 rounded">ADMIN_NOTIFICATION_PHONES</code> - Comma-separated phone numbers (E.164 format: +15551234567)</div>
                  <div><code className="bg-black/50 px-2 py-0.5 rounded">COMPANY_NAME</code> - Your company name</div>
                  <div><code className="bg-black/50 px-2 py-0.5 rounded">NOTIFICATION_FROM_EMAIL</code> - Sender email address</div>
                  <div><code className="bg-black/50 px-2 py-0.5 rounded">NOTIFICATION_FROM_NAME</code> - Sender name</div>
                  <div><code className="bg-black/50 px-2 py-0.5 rounded">ADMIN_DASHBOARD_URL</code> - Your admin dashboard URL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Settings */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Email Notifications</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Admin Email Addresses
                <span className="text-gray-500 ml-2">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder="admin@company.com, manager@company.com"
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Set this as <code className="bg-black/50 px-1 rounded">ADMIN_NOTIFICATION_EMAILS</code> in Supabase
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company Name"
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Set as <code className="bg-black/50 px-1 rounded">COMPANY_NAME</code>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                From Email
              </label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="notifications@yourdomain.com"
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Set as <code className="bg-black/50 px-1 rounded">NOTIFICATION_FROM_EMAIL</code>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Company Notifications"
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Set as <code className="bg-black/50 px-1 rounded">NOTIFICATION_FROM_NAME</code>
              </p>
            </div>

            {/* Test Email */}
            <div className="pt-4 border-t border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Test Email Configuration
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@email.com"
                  className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                />
                <button
                  onClick={handleTestEmail}
                  disabled={isTesting}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Test
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SMS Settings */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Phone className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">SMS Notifications</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Admin Phone Numbers
                <span className="text-gray-500 ml-2">(comma-separated, E.164 format)</span>
              </label>
              <input
                type="text"
                value={phonesInput}
                onChange={(e) => setPhonesInput(e.target.value)}
                placeholder="+15551234567, +15559876543"
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Set as <code className="bg-black/50 px-1 rounded">ADMIN_NOTIFICATION_PHONES</code>
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="text-yellow-400 font-semibold mb-2">📱 E.164 Phone Format</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Must include country code (e.g., +1 for US/Canada)</li>
                <li>• No spaces, dashes, or parentheses</li>
                <li>• Example: +15551234567</li>
              </ul>
            </div>

            {/* Test SMS */}
            <div className="pt-4 border-t border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Test SMS Configuration
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+15551234567"
                  className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                />
                <button
                  onClick={handleTestSMS}
                  disabled={isTesting}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Test
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard URL */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-xl p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Settings className="w-6 h-6 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Additional Settings</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Admin Dashboard URL
          </label>
          <input
            type="url"
            value={dashboardUrl}
            onChange={(e) => setDashboardUrl(e.target.value)}
            placeholder="https://yourdomain.com/admin-alerts"
            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
          />
          <p className="text-sm text-gray-500 mt-1">
            URL included in email notifications. Set as <code className="bg-black/50 px-1 rounded">ADMIN_DASHBOARD_URL</code>
          </p>
        </div>
      </div>

      {/* Notification Triggers */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-xl p-6 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Bell className="w-6 h-6 text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Notification Triggers</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Signup */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <UserPlus className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Customer Signup</h3>
                  <p className="text-sm text-gray-400">New customer creates account</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={triggers.customerSignup}
                  onChange={(e) => setTriggers({ ...triggers, customerSignup: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea580c]"></div>
              </label>
            </div>
          </div>

          {/* Subscription Added */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Subscription Added</h3>
                  <p className="text-sm text-gray-400">New subscription created</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={triggers.subscriptionAdded}
                  onChange={(e) => setTriggers({ ...triggers, subscriptionAdded: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea580c]"></div>
              </label>
            </div>
          </div>

          {/* Work Request */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Bell className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Work Request</h3>
                  <p className="text-sm text-gray-400">New work request submitted</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={triggers.workRequest}
                  onChange={(e) => setTriggers({ ...triggers, workRequest: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea580c]"></div>
              </label>
            </div>
          </div>

          {/* System Alert */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">System Alert</h3>
                  <p className="text-sm text-gray-400">Critical system notifications</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={triggers.systemAlert}
                  onChange={(e) => setTriggers({ ...triggers, systemAlert: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea580c]"></div>
              </label>
            </div>
          </div>

          {/* Payment Failed */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Payment Failed</h3>
                  <p className="text-sm text-gray-400">Payment processing issues</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={triggers.paymentFailed}
                  onChange={(e) => setTriggers({ ...triggers, paymentFailed: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea580c]"></div>
              </label>
            </div>
          </div>

          {/* Vendor Application */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Vendor Application</h3>
                  <p className="text-sm text-gray-400">New vendor applies</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={triggers.vendorApplication}
                  onChange={(e) => setTriggers({ ...triggers, vendorApplication: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea580c]"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Users Management */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-xl p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Admin Users</h2>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setShowAddAdmin(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Admin
          </button>

          {showAddAdmin && (
            <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xl font-bold text-white mb-4">Add New Admin</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    placeholder="admin@company.com"
                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newAdmin.phone}
                    onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                    placeholder="+15551234567"
                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={newAdmin.role}
                    onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddAdmin}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Admin
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {adminUsers.map(user => (
              <div key={user.id} className="bg-black/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">{user.name}</h4>
                    <p className="text-sm text-gray-400">{user.email}</p>
                    <p className="text-sm text-gray-400">{user.phone}</p>
                    <p className="text-sm text-gray-400">Role: {user.role}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveAdmin(user.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#fb923c] hover:to-[#ea580c] text-white px-8 py-3 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg hover:shadow-xl"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}