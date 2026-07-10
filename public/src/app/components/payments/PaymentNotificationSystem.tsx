/**
 * Payment Notification & Tracking System
 * 
 * Comprehensive system for tracking and notifying:
 * - Payments received
 * - Missed payments
 * - Due payments
 * - Outstanding balances
 * - Email receipts
 * - Admin alerts
 */

import { useState, useEffect } from 'react';
import {
  Bell, Mail, AlertTriangle, CheckCircle, Clock, DollarSign,
  TrendingUp, Calendar, Users, Send, X, Download, Eye,
  RefreshCw, Filter, Search, MoreVertical, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PaymentNotification {
  id: string;
  type: 'payment_received' | 'payment_missed' | 'payment_due' | 'payment_overdue' | 'outstanding_balance';
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  status: 'unread' | 'read' | 'actioned';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  message: string;
  action_required: boolean;
}

interface EmailReceipt {
  id: string;
  invoice_id: string;
  customer_email: string;
  amount: number;
  payment_method: string;
  sent_at: Date;
  opened: boolean;
  status: 'sent' | 'delivered' | 'opened' | 'failed';
}

export function PaymentNotificationSystem() {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([
    {
      id: 'notif-1',
      type: 'payment_received',
      invoice_id: 'INV-1001',
      invoice_number: 'INV-1001',
      customer_name: 'Sarah Johnson',
      customer_email: 'sarah@example.com',
      amount: 4500,
      status: 'unread',
      priority: 'medium',
      timestamp: new Date('2026-01-22T10:30:00'),
      message: 'Payment of $4,500 received via Stellar (XLM)',
      action_required: false
    },
    {
      id: 'notif-2',
      type: 'payment_overdue',
      invoice_id: 'INV-1003',
      invoice_number: 'INV-1003',
      customer_name: 'Emily Williams',
      customer_email: 'emily@example.com',
      amount: 12000,
      status: 'unread',
      priority: 'urgent',
      timestamp: new Date('2026-01-22T09:00:00'),
      message: 'Invoice $12,000 is 12 days overdue',
      action_required: true
    },
    {
      id: 'notif-3',
      type: 'payment_due',
      invoice_id: 'INV-1002',
      invoice_number: 'INV-1002',
      customer_name: 'Robert Chen',
      customer_email: 'robert@example.com',
      amount: 2450,
      status: 'read',
      priority: 'medium',
      timestamp: new Date('2026-01-22T08:00:00'),
      message: 'Invoice $2,450 due in 3 days',
      action_required: false
    },
    {
      id: 'notif-4',
      type: 'outstanding_balance',
      invoice_id: 'INV-1005',
      invoice_number: 'INV-1005',
      customer_name: 'Jessica Martinez',
      customer_email: 'jessica@example.com',
      amount: 4400,
      status: 'unread',
      priority: 'high',
      timestamp: new Date('2026-01-22T07:30:00'),
      message: 'Outstanding balance of $4,400 (partial payment received)',
      action_required: true
    }
  ]);

  const [emailReceipts, setEmailReceipts] = useState<EmailReceipt[]>([
    {
      id: 'receipt-1',
      invoice_id: 'INV-1001',
      customer_email: 'sarah@example.com',
      amount: 4500,
      payment_method: 'Stellar (XLM)',
      sent_at: new Date('2026-01-22T10:31:00'),
      opened: true,
      status: 'opened'
    },
    {
      id: 'receipt-2',
      invoice_id: 'INV-1004',
      customer_email: 'michael@example.com',
      amount: 3500,
      payment_method: 'Stripe',
      sent_at: new Date('2026-01-19T14:20:00'),
      opened: true,
      status: 'opened'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'notifications' | 'receipts' | 'tracking' | 'settings'>('notifications');
  const [selectedNotification, setSelectedNotification] = useState<PaymentNotification | null>(null);

  const stats = [
    {
      label: 'Unread Notifications',
      value: notifications.filter(n => n.status === 'unread').length,
      icon: Bell,
      color: 'orange',
      trend: '+3 today'
    },
    {
      label: 'Action Required',
      value: notifications.filter(n => n.action_required).length,
      icon: AlertTriangle,
      color: 'red',
      trend: '2 urgent'
    },
    {
      label: 'Receipts Sent',
      value: emailReceipts.length,
      icon: Mail,
      color: 'green',
      trend: '100% delivered'
    },
    {
      label: 'Overdue Invoices',
      value: notifications.filter(n => n.type === 'payment_overdue').length,
      icon: Clock,
      color: 'purple',
      trend: '-1 this week'
    }
  ];

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
    );
    toast.success('Notification marked as read');
  };

  const handleSendReminder = (notification: PaymentNotification) => {
    toast.success(`Payment reminder sent to ${notification.customer_name}`, {
      description: `Email sent to ${notification.customer_email}`
    });
    
    // In real implementation, this would send an actual email
    console.log(`Sending reminder for ${notification.invoice_number} to ${notification.customer_email}`);
  };

  const handleViewInvoice = (invoiceId: string) => {
    // Navigate to invoice or open unified payment center
    window.location.href = `/unified-payment-center?invoice=${invoiceId}`;
  };

  const getNotificationIcon = (type: PaymentNotification['type']) => {
    switch (type) {
      case 'payment_received': return CheckCircle;
      case 'payment_missed': return X;
      case 'payment_due': return Clock;
      case 'payment_overdue': return AlertTriangle;
      case 'outstanding_balance': return DollarSign;
    }
  };

  const getNotificationColor = (type: PaymentNotification['type']) => {
    switch (type) {
      case 'payment_received': return 'green';
      case 'payment_missed': return 'red';
      case 'payment_due': return 'blue';
      case 'payment_overdue': return 'red';
      case 'outstanding_balance': return 'orange';
    }
  };

  const getPriorityBadge = (priority: PaymentNotification['priority']) => {
    const colors = {
      low: 'bg-gray-600/20 text-gray-400 border-gray-500/20',
      medium: 'bg-blue-600/20 text-blue-400 border-blue-500/20',
      high: 'bg-orange-600/20 text-orange-400 border-orange-500/20',
      urgent: 'bg-red-600/20 text-red-400 border-red-500/20 animate-pulse'
    };
    return colors[priority];
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Payment Notifications</h1>
              <p className="text-gray-400">Track payments, send reminders, and manage alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button className="p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${stat.color}-600/20 to-${stat.color}-700/20 flex items-center justify-center border border-${stat.color}-500/20`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400 mb-2">{stat.label}</p>
              <p className="text-xs text-gray-500">{stat.trend}</p>
            </div>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 bg-[#1A1A1A] rounded-xl p-1 border border-[#2A2A2A] overflow-x-auto">
        {[
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'receipts', label: 'Email Receipts', icon: Mail },
          { id: 'tracking', label: 'Payment Tracking', icon: TrendingUp },
          { id: 'settings', label: 'Settings', icon: Filter }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const color = getNotificationColor(notification.type);
            
            return (
              <div
                key={notification.id}
                className={`bg-[#1A1A1A] rounded-2xl p-6 border transition cursor-pointer ${
                  notification.status === 'unread' 
                    ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' 
                    : 'border-[#2A2A2A]'
                }`}
                onClick={() => setSelectedNotification(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${color}-600/20 to-${color}-700/20 flex items-center justify-center border border-${color}-500/20 flex-shrink-0`}>
                    <Icon className={`w-6 h-6 text-${color}-400`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{notification.customer_name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityBadge(notification.priority)}`}>
                            {notification.priority.toUpperCase()}
                          </span>
                          {notification.status === 'unread' && (
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{notification.invoice_number} • {notification.customer_email}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-orange-400">${notification.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {notification.timestamp.toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 mb-3">{notification.message}</p>

                    <div className="flex items-center gap-2">
                      {notification.action_required && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendReminder(notification);
                          }}
                          className="px-3 py-1.5 bg-orange-600/20 text-orange-400 rounded-lg text-sm hover:bg-orange-600/30 transition border border-orange-500/30 flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          Send Reminder
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewInvoice(notification.invoice_id);
                        }}
                        className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 transition border border-blue-500/30 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View Invoice
                      </button>
                      {notification.status === 'unread' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 transition border border-green-500/30 flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Email Receipts Tab */}
      {activeTab === 'receipts' && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <div className="p-6 border-b border-[#2A2A2A]">
            <h2 className="text-xl font-bold text-white">Sent Email Receipts</h2>
            <p className="text-sm text-gray-400 mt-1">Automatic receipts sent to customers after payment</p>
          </div>
          
          <div className="divide-y divide-[#2A2A2A]">
            {emailReceipts.map((receipt) => (
              <div key={receipt.id} className="p-6 hover:bg-[#2A2A2A]/50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600/20 to-green-700/20 flex items-center justify-center border border-green-500/20">
                      <Mail className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{receipt.invoice_id}</p>
                      <p className="text-sm text-gray-400">{receipt.customer_email}</p>
                      <p className="text-xs text-gray-500">
                        Sent {receipt.sent_at.toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="font-semibold text-white">${receipt.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{receipt.payment_method}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        receipt.status === 'opened' ? 'bg-green-600/20 text-green-400 border border-green-500/20' :
                        receipt.status === 'delivered' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' :
                        receipt.status === 'sent' ? 'bg-gray-600/20 text-gray-400 border border-gray-500/20' :
                        'bg-red-600/20 text-red-400 border border-red-500/20'
                      }`}>
                        {receipt.opened && <CheckCircle className="w-3 h-3 inline mr-1" />}
                        {receipt.status.toUpperCase()}
                      </span>
                      
                      <button className="p-2 hover:bg-orange-600/10 rounded-lg transition">
                        <Download className="w-4 h-4 text-orange-400" />
                      </button>
                      <button className="p-2 hover:bg-blue-600/10 rounded-lg transition">
                        <Send className="w-4 h-4 text-blue-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Tracking Tab */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Tracking Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">On-Time Payments</p>
                  <p className="text-2xl font-bold text-white">94%</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">+5% from last month</p>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Avg. Payment Time</p>
                  <p className="text-2xl font-bold text-white">2.3 days</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">-0.5 days improvement</p>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Overdue Rate</p>
                  <p className="text-2xl font-bold text-white">6%</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">-2% from last month</p>
            </div>
          </div>

          {/* Tracking Timeline */}
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
            <h3 className="text-lg font-bold text-white mb-4">Payment Activity Timeline</h3>
            <div className="space-y-4">
              {[
                { time: '10:30 AM', event: 'Payment received', customer: 'Sarah Johnson', amount: '$4,500', type: 'success' },
                { time: '09:00 AM', event: 'Invoice overdue alert', customer: 'Emily Williams', amount: '$12,000', type: 'error' },
                { time: '08:00 AM', event: 'Payment reminder sent', customer: 'Robert Chen', amount: '$2,450', type: 'info' },
                { time: 'Yesterday', event: 'Payment received', customer: 'Michael Brown', amount: '$3,500', type: 'success' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-[#0A0A0A] rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    item.type === 'success' ? 'bg-green-400' :
                    item.type === 'error' ? 'bg-red-400' :
                    'bg-blue-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{item.event}</p>
                    <p className="text-xs text-gray-400">{item.customer} • {item.amount}</p>
                  </div>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-white mb-6">Notification Settings</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
              <div>
                <p className="font-semibold text-white">Email Notifications</p>
                <p className="text-sm text-gray-400">Receive email alerts for payments</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
              <div>
                <p className="font-semibold text-white">Automatic Receipts</p>
                <p className="text-sm text-gray-400">Send receipts automatically after payment</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
              <div>
                <p className="font-semibold text-white">Overdue Reminders</p>
                <p className="text-sm text-gray-400">Send reminders for overdue invoices</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
              <div>
                <p className="font-semibold text-white">Admin Alerts</p>
                <p className="text-sm text-gray-400">Notify admins of important payment events</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
