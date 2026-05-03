/**
 * Enterprise Payment Center
 * 
 * World-class payment processing system with:
 * - ISO20022 compliant blockchain integration (Stellar, XDC, Solana, Quant, XRP)
 * - Traditional payment gateways (Stripe, PayPal, Square, etc.)
 * - Multi-currency support (Fiat + Crypto)
 * - Real-time transaction tracking
 * - Invoice payment linking
 * - Enterprise reporting integration
 * - Advanced security & compliance
 * - Automated reconciliation
 * - Payment scheduling
 * - Refund management
 */

import { useState, useEffect } from 'react';
import {
  CreditCard, Wallet, DollarSign, TrendingUp, Clock, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Download, Upload, Settings,
  Shield, Lock, Eye, EyeOff, Link2, Unlink, Plus, Minus, Search,
  Filter, Calendar, FileText, BarChart3, PieChart, Activity,
  Zap, Globe, Coins, Bitcoin, Send, ArrowDownToLine, ArrowUpRight,
  ArrowDownLeft, History, Database, Server, Cloud, Check, X,
  Info, Star, Flag, Tag, Users, Building2, Receipt, Smartphone,
  QrCode, Copy, ExternalLink, ChevronRight, ChevronDown, MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import StellarWalletManager from '../StellarWalletManager';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { SecondaryButton } from '../ui/button/SecondaryButton';
import { TextArea } from '../ui/input/TextArea';
import { DataTable } from '../ui/table/DataTable';
import type { DataTableColumn } from '../ui/table/DataTable';

// ISO20022 Blockchain Types
type BlockchainNetwork = 'stellar' | 'xdc' | 'solana' | 'quant' | 'xrp';

// Traditional Payment Methods
type TraditionalPayment = 'credit_card' | 'debit_card' | 'ach' | 'wire' | 'paypal' | 'square' | 'stripe';

interface PaymentMethod {
  id: string;
  type: 'blockchain' | 'traditional';
  network?: BlockchainNetwork;
  gateway?: TraditionalPayment;
  name: string;
  icon: string;
  status: 'active' | 'inactive' | 'pending';
  balance?: number;
  currency: string;
  wallet_address?: string;
  last_used?: Date;
  fees: {
    percentage: number;
    fixed: number;
  };
}

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'transfer' | 'withdrawal';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  fee: number;
  net_amount: number;
  payment_method: PaymentMethod;
  invoice_id?: string;
  customer_name: string;
  customer_email: string;
  description: string;
  timestamp: Date;
  confirmation_number: string;
  blockchain_tx_hash?: string;
  iso20022_compliant: boolean;
  metadata: {
    ip_address?: string;
    device?: string;
    location?: string;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  amount: number;
  paid_amount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  due_date: Date;
}

export function EnterprisePaymentCenter() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'methods' | 'invoices' | 'blockchain' | 'settings'>('dashboard');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'blockchain',
      network: 'stellar',
      name: 'Stellar (XLM)',
      icon: '⭐',
      status: 'active',
      balance: 15420.50,
      currency: 'XLM',
      wallet_address: 'GBXYZ...ABC123',
      fees: { percentage: 0.001, fixed: 0 }
    },
    {
      id: '2',
      type: 'blockchain',
      network: 'xdc',
      name: 'XDC Network',
      icon: '🔷',
      status: 'active',
      balance: 8934.25,
      currency: 'XDC',
      wallet_address: 'xdc123...789abc',
      fees: { percentage: 0.001, fixed: 0 }
    },
    {
      id: '3',
      type: 'blockchain',
      network: 'solana',
      name: 'Solana (SOL)',
      icon: '🌊',
      status: 'active',
      balance: 234.75,
      currency: 'SOL',
      wallet_address: 'Sol456...def789',
      fees: { percentage: 0.0025, fixed: 0 }
    },
    {
      id: '4',
      type: 'blockchain',
      network: 'xrp',
      name: 'XRP Ledger',
      icon: '💎',
      status: 'active',
      balance: 12567.80,
      currency: 'XRP',
      wallet_address: 'rXRP789...ghi012',
      fees: { percentage: 0.001, fixed: 0 }
    },
    {
      id: '5',
      type: 'blockchain',
      network: 'quant',
      name: 'Quant Network (QNT)',
      icon: '🔗',
      status: 'active',
      balance: 45.20,
      currency: 'QNT',
      wallet_address: 'qnt012...jkl345',
      fees: { percentage: 0.002, fixed: 0 }
    },
    {
      id: '6',
      type: 'traditional',
      gateway: 'stripe',
      name: 'Stripe',
      icon: '💳',
      status: 'active',
      balance: 45823.90,
      currency: 'USD',
      fees: { percentage: 2.9, fixed: 0.30 }
    },
    {
      id: '7',
      type: 'traditional',
      gateway: 'paypal',
      name: 'PayPal',
      icon: '🅿️',
      status: 'active',
      balance: 12456.30,
      currency: 'USD',
      fees: { percentage: 3.49, fixed: 0.49 }
    }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'tx-001',
      type: 'payment',
      status: 'completed',
      amount: 2500.00,
      currency: 'USD',
      fee: 72.75,
      net_amount: 2427.25,
      payment_method: paymentMethods[5],
      invoice_id: 'INV-2024-001',
      customer_name: 'Acme Corporation',
      customer_email: 'payments@acme.com',
      description: 'Installation services - Invoice #2024-001',
      timestamp: new Date('2024-01-20T14:30:00'),
      confirmation_number: 'CONF-8729461',
      iso20022_compliant: false,
      metadata: { ip_address: '192.168.1.1' }
    },
    {
      id: 'tx-002',
      type: 'payment',
      status: 'completed',
      amount: 5000.00,
      currency: 'XLM',
      fee: 5.00,
      net_amount: 4995.00,
      payment_method: paymentMethods[0],
      invoice_id: 'INV-2024-002',
      customer_name: 'Tech Solutions Ltd',
      customer_email: 'billing@techsolutions.com',
      description: 'Consulting services - Invoice #2024-002',
      timestamp: new Date('2024-01-21T09:15:00'),
      confirmation_number: 'CONF-8729462',
      blockchain_tx_hash: '0xabc123...def456',
      iso20022_compliant: true,
      metadata: { ip_address: '192.168.1.2' }
    },
    {
      id: 'tx-003',
      type: 'payment',
      status: 'processing',
      amount: 1200.00,
      currency: 'XDC',
      fee: 1.20,
      net_amount: 1198.80,
      payment_method: paymentMethods[1],
      invoice_id: 'INV-2024-003',
      customer_name: 'Global Enterprises',
      customer_email: 'payments@globalent.com',
      description: 'Monthly subscription',
      timestamp: new Date('2024-01-22T11:45:00'),
      confirmation_number: 'CONF-8729463',
      blockchain_tx_hash: '0xdef789...ghi012',
      iso20022_compliant: true,
      metadata: { ip_address: '192.168.1.3' }
    }
  ]);

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'inv-1',
      invoice_number: 'INV-2024-001',
      customer_name: 'Acme Corporation',
      amount: 2500.00,
      paid_amount: 2500.00,
      status: 'paid',
      due_date: new Date('2024-01-25')
    },
    {
      id: 'inv-2',
      invoice_number: 'INV-2024-004',
      customer_name: 'XYZ Industries',
      amount: 3400.00,
      paid_amount: 0,
      status: 'unpaid',
      due_date: new Date('2024-01-28')
    },
    {
      id: 'inv-3',
      invoice_number: 'INV-2024-005',
      customer_name: 'Beta Corp',
      amount: 5600.00,
      paid_amount: 2800.00,
      status: 'partial',
      due_date: new Date('2024-01-30')
    }
  ]);

  const [showAddMethod, setShowAddMethod] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'invoice' | 'manual'>('invoice');
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDescription, setPaymentDescription] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  // Calculate dashboard stats
  const stats = [
    {
      label: 'Total Balance',
      value: `$${(paymentMethods.reduce((sum, m) => sum + (m.balance || 0), 0)).toLocaleString()}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      label: 'Today\'s Transactions',
      value: '47',
      change: '+8.2%',
      trend: 'up',
      icon: Activity,
      color: 'blue'
    },
    {
      label: 'Pending Payments',
      value: transactions.filter(t => t.status === 'processing' || t.status === 'pending').length.toString(),
      change: '-3.1%',
      trend: 'down',
      icon: Clock,
      color: 'orange'
    },
    {
      label: 'Success Rate',
      value: '98.5%',
      change: '+1.2%',
      trend: 'up',
      icon: CheckCircle2,
      color: 'purple'
    }
  ];

  const blockchainNetworks = [
    { id: 'stellar', name: 'Stellar', icon: '⭐', status: 'active', iso20022: true },
    { id: 'xdc', name: 'XDC Network', icon: '🔷', status: 'active', iso20022: true },
    { id: 'solana', name: 'Solana', icon: '🌊', status: 'active', iso20022: true },
    { id: 'xrp', name: 'XRP Ledger', icon: '💎', status: 'active', iso20022: true },
    { id: 'quant', name: 'Quant', icon: '🔗', status: 'active', iso20022: true }
  ];

  const transactionColumns: DataTableColumn<Transaction>[] = [
    {
      key: 'timestamp',
      header: 'Date',
      render: (row) => <span className="text-sm text-gray-300">{row.timestamp.toLocaleDateString()}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-white">{row.customer_name}</p>
          <p className="text-xs text-gray-400">{row.customer_email}</p>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => <span className="text-sm text-gray-300">{row.description}</span>,
    },
    {
      key: 'payment_method',
      header: 'Method',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{row.payment_method.icon}</span>
          <span className="text-sm text-gray-300">{row.payment_method.name}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <p className="text-sm font-bold text-white">
          {row.amount.toLocaleString()} {row.currency}
        </p>
      ),
    },
    {
      key: 'fee',
      header: 'Fee',
      align: 'right',
      render: (row) => <span className="text-sm text-gray-400">-{row.fee.toFixed(2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
          row.status === 'completed' ? 'bg-green-600/20 text-green-400 border-green-500/30' :
          row.status === 'processing' ? 'bg-orange-600/20 text-orange-400 border-orange-500/30' :
          'bg-red-600/20 text-red-400 border-red-500/30'
        }`}>
          {row.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
          {row.status === 'processing' && <Clock className="w-3 h-3" />}
          {row.status === 'failed' && <XCircle className="w-3 h-3" />}
          <span className="capitalize">{row.status}</span>
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      align: 'center',
      render: (row) => (
        <button
          onClick={() => setSelectedTransaction(row)}
          className="p-2 text-gray-400 hover:text-orange-400 transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Enterprise Payment Center</h1>
              <p className="text-gray-400">ISO20022 Compliant Multi-Network Payment Processing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
              <Download className="w-5 h-5" />
            </button>
            <button className="p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowAddMethod(true)}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 transition flex items-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-5 h-5" />
              Add Payment Method
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
                <div className={`flex items-center gap-1 text-sm ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  <span>{stat.change}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 bg-[#1A1A1A] rounded-xl p-1 border border-[#2A2A2A] overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'transactions', label: 'Transactions', icon: Activity },
          { id: 'methods', label: 'Payment Methods', icon: CreditCard },
          { id: 'invoices', label: 'Invoices', icon: Receipt },
          { id: 'blockchain', label: 'Blockchain', icon: Coins },
          { id: 'settings', label: 'Settings', icon: Settings }
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

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-orange-400" />
                Recent Transactions
              </h2>
              <button className="text-sm text-orange-400 hover:text-orange-300 transition">
                View All →
              </button>
            </div>

            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A] hover:border-orange-500/30 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${
                        tx.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                        tx.status === 'processing' ? 'bg-orange-600/20 text-orange-400' :
                        'bg-red-600/20 text-red-400'
                      } flex items-center justify-center text-xl`}>
                        {tx.payment_method.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{tx.customer_name}</p>
                        <p className="text-xs text-gray-400">{tx.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">
                        {tx.amount.toLocaleString()} {tx.currency}
                      </p>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                        tx.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                        tx.status === 'processing' ? 'bg-orange-600/20 text-orange-400' :
                        'bg-red-600/20 text-red-400'
                      }`}>
                        {tx.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {tx.status === 'processing' && <Clock className="w-3 h-3" />}
                        {tx.status === 'failed' && <XCircle className="w-3 h-3" />}
                        <span className="capitalize">{tx.status}</span>
                      </div>
                    </div>
                  </div>

                  {tx.iso20022_compliant && (
                    <div className="flex items-center gap-2 pt-3 border-t border-[#2A2A2A]">
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded-md text-xs">
                        <Shield className="w-3 h-3" />
                        ISO20022 Compliant
                      </div>
                      {tx.blockchain_tx_hash && (
                        <button className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-orange-400 rounded-md text-xs transition">
                          <ExternalLink className="w-3 h-3" />
                          View on Explorer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions & Balance */}
          <div className="space-y-6">
            {/* Payment Methods Overview */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-orange-400" />
                Active Payment Methods
              </h3>
              <div className="space-y-3">
                {paymentMethods.filter(m => m.status === 'active').slice(0, 5).map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{method.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{method.name}</p>
                        <p className="text-xs text-gray-400">{method.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">
                        {method.balance?.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">{method.currency}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { setShowPaymentModal(true); setPaymentType('manual'); }}
                  className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition group"
                >
                  <Send className="w-6 h-6 text-orange-400 mb-2" />
                  <p className="text-sm font-semibold text-white">Send Payment</p>
                </button>
                <button className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition group">
                  <ArrowDownToLine className="w-6 h-6 text-green-400 mb-2" />
                  <p className="text-sm font-semibold text-white">Receive</p>
                </button>
                <button 
                  onClick={() => { setShowPaymentModal(true); setPaymentType('invoice'); }}
                  className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition group"
                >
                  <Receipt className="w-6 h-6 text-blue-400 mb-2" />
                  <p className="text-sm font-semibold text-white">Pay Invoice</p>
                </button>
                <button className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition group">
                  <RefreshCw className="w-6 h-6 text-purple-400 mb-2" />
                  <p className="text-sm font-semibold text-white">Refund</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">All Transactions</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  className="pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm w-64"
                />
              </div>
              <button className="p-2 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <DataTable
            columns={transactionColumns}
            data={transactions}
            emptyMessage="No transactions found"
            rowHoverEffect={true}
            containerClassName="bg-transparent border-none"
          />
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'methods' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blockchain Methods */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Coins className="w-6 h-6 text-orange-400" />
                Blockchain Networks
              </h2>
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-xs">
                <Shield className="w-3 h-3" />
                ISO20022
              </div>
            </div>

            <div className="space-y-3">
              {paymentMethods.filter(m => m.type === 'blockchain').map((method) => (
                <div key={method.id} className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center text-2xl border border-orange-500/20">
                        {method.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{method.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{method.wallet_address}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-xs ${
                      method.status === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
                    }`}>
                      {method.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="p-3 bg-[#1A1A1A] rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Balance</p>
                      <p className="text-sm font-bold text-white">{method.balance?.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-[#1A1A1A] rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Fee</p>
                      <p className="text-sm font-bold text-white">{method.fees.percentage}%</p>
                    </div>
                    <div className="p-3 bg-[#1A1A1A] rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Currency</p>
                      <p className="text-sm font-bold text-white">{method.currency}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="flex-1 px-3 py-2 bg-orange-600/20 text-orange-400 rounded-lg text-sm hover:bg-orange-600/30 transition border border-orange-500/30">
                      Send
                    </button>
                    <button className="flex-1 px-3 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 transition border border-green-500/30">
                      Receive
                    </button>
                    <button className="p-2 bg-[#1A1A1A] text-gray-400 rounded-lg text-sm hover:text-white transition">
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Traditional Methods */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-orange-400" />
                Traditional Gateways
              </h2>
            </div>

            <div className="space-y-3">
              {paymentMethods.filter(m => m.type === 'traditional').map((method) => (
                <div key={method.id} className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-700/20 flex items-center justify-center text-2xl border border-blue-500/20">
                        {method.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{method.name}</p>
                        <p className="text-xs text-gray-400">{method.gateway}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-xs ${
                      method.status === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
                    }`}>
                      {method.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="p-3 bg-[#1A1A1A] rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Balance</p>
                      <p className="text-sm font-bold text-white">${method.balance?.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-[#1A1A1A] rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Fee</p>
                      <p className="text-sm font-bold text-white">{method.fees.percentage}%</p>
                    </div>
                    <div className="p-3 bg-[#1A1A1A] rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Fixed</p>
                      <p className="text-sm font-bold text-white">${method.fees.fixed}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="flex-1 px-3 py-2 bg-orange-600/20 text-orange-400 rounded-lg text-sm hover:bg-orange-600/30 transition border border-orange-500/30">
                      Configure
                    </button>
                    <button className="flex-1 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 transition border border-blue-500/30">
                      View API Keys
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-orange-400" />
              Payment-Linked Invoices
            </h2>
            <button className="px-4 py-2 bg-orange-600/20 text-orange-400 rounded-xl hover:bg-orange-600/30 transition border border-orange-500/30 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Link Invoice
            </button>
          </div>

          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      invoice.status === 'paid' ? 'bg-green-600/20 text-green-400' :
                      invoice.status === 'partial' ? 'bg-orange-600/20 text-orange-400' :
                      'bg-red-600/20 text-red-400'
                    }`}>
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{invoice.invoice_number}</p>
                      <p className="text-sm text-gray-400">{invoice.customer_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">${invoice.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">
                      Paid: ${invoice.paid_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' ? 'bg-green-600/20 text-green-400' :
                      invoice.status === 'partial' ? 'bg-orange-600/20 text-orange-400' :
                      invoice.status === 'overdue' ? 'bg-red-600/20 text-red-400' :
                      'bg-gray-600/20 text-gray-400'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                  <PrimaryButton 
                    onClick={() => {
                      setShowPaymentModal(true);
                      setPaymentType('invoice');
                      setSelectedInvoice(invoice.id);
                      setPaymentAmount((invoice.amount - invoice.paid_amount).toString());
                    }}
                    size="sm"
                  >
                    Process Payment
                  </PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blockchain Tab */}
      {activeTab === 'blockchain' && (
        <div className="space-y-6">
          {/* ISO20022 Compliance Banner */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-6 border border-blue-500/30">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-blue-600/30 flex items-center justify-center">
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">ISO20022 Compliant Networks</h3>
                <p className="text-gray-300">All blockchain networks are configured for international payment standards compliance</p>
              </div>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                Learn More
              </button>
            </div>
          </div>

          {/* Network Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blockchainNetworks.map((network) => (
              <div key={network.id} className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{network.icon}</span>
                  <div className="flex items-center gap-2">
                    {network.iso20022 && (
                      <div className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                        ISO20022
                      </div>
                    )}
                    <div className={`px-2 py-1 rounded text-xs ${
                      network.status === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
                    }`}>
                      {network.status}
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{network.name}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Network Status</span>
                    <span className="text-green-400">● Online</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Gas/Fees</span>
                    <span className="text-white">Low</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Transactions Today</span>
                    <span className="text-white">247</span>
                  </div>
                </div>
                <button className="w-full px-4 py-2 bg-orange-600/20 text-orange-400 rounded-xl hover:bg-orange-600/30 transition border border-orange-500/30">
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Transaction Details</h2>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-2 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Amount */}
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                  selectedTransaction.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                  selectedTransaction.status === 'processing' ? 'bg-orange-600/20 text-orange-400' :
                  'bg-red-600/20 text-red-400'
                }`}>
                  {selectedTransaction.status === 'completed' && <CheckCircle2 className="w-5 h-5" />}
                  {selectedTransaction.status === 'processing' && <Clock className="w-5 h-5" />}
                  <span className="font-semibold capitalize">{selectedTransaction.status}</span>
                </div>
                <p className="text-4xl font-bold text-white mb-2">
                  {selectedTransaction.amount.toLocaleString()} {selectedTransaction.currency}
                </p>
                <p className="text-gray-400">
                  Fee: {selectedTransaction.fee.toFixed(2)} • Net: {selectedTransaction.net_amount.toLocaleString()}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#0A0A0A] rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Customer</p>
                  <p className="text-sm font-semibold text-white">{selectedTransaction.customer_name}</p>
                  <p className="text-xs text-gray-400">{selectedTransaction.customer_email}</p>
                </div>
                <div className="p-4 bg-[#0A0A0A] rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Payment Method</p>
                  <p className="text-sm font-semibold text-white">{selectedTransaction.payment_method.name}</p>
                  <p className="text-xs text-gray-400">{selectedTransaction.payment_method.type}</p>
                </div>
                <div className="p-4 bg-[#0A0A0A] rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Confirmation #</p>
                  <p className="text-sm font-semibold text-white">{selectedTransaction.confirmation_number}</p>
                </div>
                <div className="p-4 bg-[#0A0A0A] rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Date & Time</p>
                  <p className="text-sm font-semibold text-white">{selectedTransaction.timestamp.toLocaleString()}</p>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 bg-[#0A0A0A] rounded-xl">
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-sm text-white">{selectedTransaction.description}</p>
              </div>

              {/* Blockchain Details */}
              {selectedTransaction.blockchain_tx_hash && (
                <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <p className="font-semibold text-white">Blockchain Transaction</p>
                    <div className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                      ISO20022 Compliant
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">Transaction Hash</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-white">{selectedTransaction.blockchain_tx_hash}</p>
                    <button className="p-1 text-blue-400 hover:text-blue-300 transition">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-blue-400 hover:text-blue-300 transition">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <PrimaryButton className="flex-1" icon={<Download className="w-5 h-5" />}>
                  Download Receipt
                </PrimaryButton>
                <SecondaryButton className="flex-1" icon={<RefreshCw className="w-5 h-5" />}>
                  Refund
                </SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Send className="w-6 h-6 text-orange-400" />
                Process Payment
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedInvoice('');
                  setSelectedCustomer('');
                  setPaymentAmount('');
                  setPaymentDescription('');
                  setSelectedPaymentMethod('');
                }}
                className="p-2 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Payment Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">Payment Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentType('invoice')}
                    className={`p-4 rounded-xl border-2 transition ${
                      paymentType === 'invoice'
                        ? 'border-orange-500 bg-orange-600/10'
                        : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-orange-500/30'
                    }`}
                  >
                    <Receipt className={`w-8 h-8 mx-auto mb-2 ${
                      paymentType === 'invoice' ? 'text-orange-400' : 'text-gray-400'
                    }`} />
                    <p className={`font-semibold ${
                      paymentType === 'invoice' ? 'text-orange-400' : 'text-white'
                    }`}>Pay Existing Invoice</p>
                    <p className="text-xs text-gray-400 mt-1">Select from unpaid invoices</p>
                  </button>
                  <button
                    onClick={() => setPaymentType('manual')}
                    className={`p-4 rounded-xl border-2 transition ${
                      paymentType === 'manual'
                        ? 'border-orange-500 bg-orange-600/10'
                        : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-orange-500/30'
                    }`}
                  >
                    <Plus className={`w-8 h-8 mx-auto mb-2 ${
                      paymentType === 'manual' ? 'text-orange-400' : 'text-gray-400'
                    }`} />
                    <p className={`font-semibold ${
                      paymentType === 'manual' ? 'text-orange-400' : 'text-white'
                    }`}>Manual Payment</p>
                    <p className="text-xs text-gray-400 mt-1">Create new payment entry</p>
                  </button>
                </div>
              </div>

              {/* Invoice Payment Form */}
              {paymentType === 'invoice' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Select Invoice
                    </label>
                    <select
                      value={selectedInvoice}
                      onChange={(e) => {
                        setSelectedInvoice(e.target.value);
                        const invoice = unpaidInvoices.find(inv => inv.id === e.target.value);
                        if (invoice) {
                          setPaymentAmount((invoice.amount - invoice.paid_amount).toString());
                        }
                      }}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white"
                    >
                      <option value="">Choose an invoice...</option>
                      {unpaidInvoices.map(invoice => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoice_number} - {invoice.customer_name} - ${(invoice.amount - invoice.paid_amount).toLocaleString()} due
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedInvoice && (
                    <div className="p-4 bg-orange-600/10 rounded-xl border border-orange-500/30">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-orange-400 mb-1">Invoice Details</p>
                          {(() => {
                            const invoice = unpaidInvoices.find(inv => inv.id === selectedInvoice);
                            return invoice ? (
                              <div className="space-y-1 text-sm text-gray-300">
                                <p><span className="text-gray-400">Customer:</span> {invoice.customer_name}</p>
                                <p><span className="text-gray-400">Total Amount:</span> ${invoice.amount.toLocaleString()}</p>
                                <p><span className="text-gray-400">Already Paid:</span> ${invoice.paid_amount.toLocaleString()}</p>
                                <p><span className="text-gray-400">Amount Due:</span> <span className="font-semibold text-orange-400">${(invoice.amount - invoice.paid_amount).toLocaleString()}</span></p>
                                <p><span className="text-gray-400">Due Date:</span> {invoice.due_date.toLocaleDateString()}</p>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Payment Form */}
              {paymentType === 'manual' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Customer / Recipient
                    </label>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white"
                    >
                      <option value="">Select customer...</option>
                      <option value="acme">Acme Corporation</option>
                      <option value="beta">Beta Corp</option>
                      <option value="gamma">Gamma Industries</option>
                      <option value="delta">Delta LLC</option>
                      <option value="other">Other (Enter manually)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Description / Purpose
                    </label>
                    <TextArea
                      value={paymentDescription}
                      onChange={setPaymentDescription}
                      placeholder="Enter payment description (e.g., Service fee, Deposit, Materials)"
                      rows={3}
                    />
                  </div>

                  <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/30">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-400 mb-1">Auto-Invoice Creation</p>
                        <p className="text-xs text-gray-300">
                          A new invoice will be automatically created and linked to this payment for record keeping.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Payment Amount
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-lg font-semibold"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.filter(m => m.status === 'active').slice(0, 4).map(method => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`p-4 rounded-xl border-2 transition text-left ${
                        selectedPaymentMethod === method.id
                          ? 'border-orange-500 bg-orange-600/10'
                          : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-orange-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{method.icon}</span>
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${
                            selectedPaymentMethod === method.id ? 'text-orange-400' : 'text-white'
                          }`}>
                            {method.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            Fee: {method.fees.percentage}% + ${method.fees.fixed}
                          </p>
                        </div>
                        {selectedPaymentMethod === method.id && (
                          <CheckCircle2 className="w-5 h-5 text-orange-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('methods')}
                  className="mt-2 text-sm text-orange-400 hover:text-orange-300 transition flex items-center gap-1"
                >
                  View all payment methods
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Fee Calculation */}
              {paymentAmount && selectedPaymentMethod && (
                <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Payment Summary</h3>
                  {(() => {
                    const amount = parseFloat(paymentAmount) || 0;
                    const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
                    if (!method) return null;
                    
                    const fee = (amount * method.fees.percentage / 100) + method.fees.fixed;
                    const total = amount + fee;
                    
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-300">
                          <span>Payment Amount:</span>
                          <span className="font-semibold">${amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Processing Fee:</span>
                          <span>${fee.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-[#2A2A2A] my-2"></div>
                        <div className="flex justify-between text-white font-semibold text-base">
                          <span>Total:</span>
                          <span className="text-orange-400">${total.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedInvoice('');
                    setSelectedCustomer('');
                    setPaymentAmount('');
                    setPaymentDescription('');
                    setSelectedPaymentMethod('');
                  }}
                  className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-[#3A3A3A] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
                      toast.error('Please enter a valid payment amount');
                      return;
                    }
                    if (!selectedPaymentMethod) {
                      toast.error('Please select a payment method');
                      return;
                    }
                    if (paymentType === 'invoice' && !selectedInvoice) {
                      toast.error('Please select an invoice');
                      return;
                    }
                    if (paymentType === 'manual' && !selectedCustomer) {
                      toast.error('Please select a customer');
                      return;
                    }

                    // Process payment
                    toast.success('Payment processed successfully!');
                    setShowPaymentModal(false);
                    setSelectedInvoice('');
                    setSelectedCustomer('');
                    setPaymentAmount('');
                    setPaymentDescription('');
                    setSelectedPaymentMethod('');
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Process Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stellar Wallet Manager Modal */}
      {showAddMethod && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-3xl border-2 border-orange-500/30 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-orange-500/20">
            {/* Header */}
            <div className="bg-gradient-to-br from-orange-600 via-orange-600 to-orange-700 p-6 border-b border-orange-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg">
                    <Star className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Add Payment Method</h1>
                    <p className="text-white/80 text-sm">Configure Stellar wallet for ultra-low fee payments</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddMethod(false)}
                  className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white transition border border-white/20"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <StellarWalletManager companyName="Business Hub" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
