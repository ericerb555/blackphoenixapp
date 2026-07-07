/**
 * TypeScript Type Definitions for API Models
 * 
 * This file contains all interfaces and types for the backend API.
 * Import these types to get full type safety in your components.
 * 
 * @example
 * import { Subscription, Customer } from './types/api.types';
 * 
 * const sub: Subscription = await api.subscriptions.getById('SUB-123');
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export type SubscriptionType = 'maintenance' | 'seasonal' | 'referral';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type WorkOrderStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type BuildStatus = 'pending' | 'building' | 'completed' | 'failed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// ============================================================================
// SUBSCRIPTION
// ============================================================================

export interface Subscription {
  id: string;
  type: SubscriptionType;
  stakeholderId: string;
  stakeholderName: string;
  stakeholderEmail: string;
  stakeholderPhone?: string;
  hoursIncluded: number;
  hoursUsed: number;
  hoursRemaining: number;
  hoursGifted?: number;
  hourlyRate?: number;
  rolloverEnabled?: boolean;
  rolloverHours?: number;
  maxRollover?: number;
  billingCycle?: 'monthly' | 'quarterly' | 'annual';
  nextBillingDate?: string;
  status: SubscriptionStatus;
  planId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionCreate {
  type: SubscriptionType;
  stakeholderId: string;
  stakeholderName: string;
  stakeholderEmail: string;
  stakeholderPhone?: string;
  hoursIncluded: number;
  hourlyRate?: number;
  rolloverEnabled?: boolean;
  maxRollover?: number;
  billingCycle?: 'monthly' | 'quarterly' | 'annual';
  planId?: string;
  notes?: string;
}

export interface SubscriptionUpdate {
  hoursUsed?: number;
  hoursGifted?: number;
  status?: SubscriptionStatus;
  notes?: string;
  nextBillingDate?: string;
}

// ============================================================================
// HOUR TRANSACTION
// ============================================================================

export interface HourTransaction {
  id: string;
  subscriptionId: string;
  customerId: string;
  customerName: string;
  type: 'used' | 'gifted' | 'rollover' | 'purchased';
  hours: number;
  reason?: string;
  performedBy?: string;
  date: string;
  createdAt: string;
}

// ============================================================================
// GIFT HOURS REQUEST
// ============================================================================

export interface GiftHoursRequest {
  id: string;
  subscriptionId: string;
  customerName: string;
  customerEmail: string;
  hours: number;
  reason: string;
  requestedBy: string;
  status: RequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GiftHoursRequestCreate {
  subscriptionId: string;
  hours: number;
  reason: string;
  requestedBy: string;
  status?: RequestStatus;
}

// ============================================================================
// CUSTOMER
// ============================================================================

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  tags?: string[];
  status?: 'active' | 'inactive';
  totalSpent?: number;
  lifetimeValue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCreate {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  tags?: string[];
}

export interface CustomerUpdate {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  tags?: string[];
  status?: 'active' | 'inactive';
}

// ============================================================================
// WORK ORDER
// ============================================================================

export interface WorkOrder {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: Priority;
  assignedTo?: string[];
  estimatedHours?: number;
  actualHours?: number;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderCreate {
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  status?: WorkOrderStatus;
  priority?: Priority;
  assignedTo?: string[];
  estimatedHours?: number;
  scheduledDate?: string;
}

export interface WorkOrderUpdate {
  status?: WorkOrderStatus;
  priority?: Priority;
  assignedTo?: string[];
  actualHours?: number;
  completedDate?: string;
  notes?: string;
}

// ============================================================================
// INVOICE
// ============================================================================

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  total: number;
  status: InvoiceStatus;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceCreate {
  customerId: string;
  customerName: string;
  customerEmail?: string;
  items: InvoiceItem[];
  tax?: number;
  status?: InvoiceStatus;
  dueDate?: string;
  notes?: string;
}

export interface InvoiceUpdate {
  status?: InvoiceStatus;
  paidDate?: string;
  notes?: string;
}

// ============================================================================
// REFERRAL
// ============================================================================

export interface Referral {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
  referredPhone?: string;
  status: 'pending' | 'contacted' | 'converted' | 'expired';
  rewardType?: 'hours' | 'discount' | 'cash';
  rewardValue?: number;
  rewardClaimed?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralCreate {
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
  referredPhone?: string;
  rewardType?: 'hours' | 'discount' | 'cash';
  rewardValue?: number;
}

export interface ReferralUpdate {
  status?: 'pending' | 'contacted' | 'converted' | 'expired';
  rewardClaimed?: boolean;
  notes?: string;
}

// ============================================================================
// GIFT CARD
// ============================================================================

export interface GiftCard {
  id: string;
  code: string;
  type: 'service' | 'product' | 'both';
  value: number;
  balance: number;
  recipientName: string;
  recipientEmail: string;
  senderName?: string;
  message?: string;
  expirationDate?: string;
  status: 'active' | 'redeemed' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardCreate {
  type: 'service' | 'product' | 'both';
  value: number;
  recipientName: string;
  recipientEmail: string;
  senderName?: string;
  message?: string;
  expirationDate?: string;
}

// ============================================================================
// SUBCONTRACTOR
// ============================================================================

export interface Subcontractor {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  specialty: string[];
  rating?: number;
  status: 'active' | 'inactive';
  hourlyRate?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubcontractorCreate {
  name: string;
  company?: string;
  email: string;
  phone: string;
  specialty: string[];
  hourlyRate?: number;
  notes?: string;
}

export interface SubcontractorUpdate {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  specialty?: string[];
  rating?: number;
  status?: 'active' | 'inactive';
  hourlyRate?: number;
  notes?: string;
}

// ============================================================================
// VENDOR
// ============================================================================

export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
  website?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface VendorCreate {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
  website?: string;
  notes?: string;
}

// ============================================================================
// ADVERTISER
// ============================================================================

export interface Advertiser {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  adType: 'banner' | 'sponsored' | 'featured';
  budget?: number;
  status: 'active' | 'paused' | 'expired';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertiserCreate {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  adType: 'banner' | 'sponsored' | 'featured';
  budget?: number;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// SUBSCRIPTION PLAN
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: SubscriptionType;
  hoursIncluded: number;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  rolloverEnabled: boolean;
  maxRollover?: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlanCreate {
  name: string;
  description: string;
  type: SubscriptionType;
  hoursIncluded: number;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  rolloverEnabled?: boolean;
  maxRollover?: number;
  features?: string[];
}

export interface SubscriptionPlanUpdate {
  name?: string;
  description?: string;
  hoursIncluded?: number;
  price?: number;
  rolloverEnabled?: boolean;
  maxRollover?: number;
  features?: string[];
  isActive?: boolean;
}

// ============================================================================
// PAYMENT
// ============================================================================

export interface Payment {
  id: string;
  subscriptionId: string;
  customerId: string;
  amount: number;
  method: 'card' | 'ach' | 'check' | 'cash';
  status: PaymentStatus;
  processedAt?: string;
  failureReason?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface PaymentProcess {
  subscriptionId: string;
  amount: number;
  method: 'card' | 'ach' | 'check' | 'cash';
  cardToken?: string;
  achToken?: string;
}

export interface PaymentSchedule {
  subscriptionId: string;
  amount: number;
  scheduledDate: string;
  frequency: 'once' | 'monthly' | 'quarterly' | 'annual';
}

export interface PaymentAlert {
  id: string;
  type: 'failed' | 'upcoming' | 'overdue';
  subscriptionId: string;
  customerName: string;
  amount: number;
  date: string;
  read: boolean;
  createdAt: string;
}

export interface PaymentStats {
  totalRevenue: number;
  monthlyRecurring: number;
  failedPayments: number;
  successRate: number;
  averagePayment: number;
}

// ============================================================================
// WHITE LABEL
// ============================================================================

export interface WhiteLabelClient {
  id: string;
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  plan: 'standard' | 'premium' | 'enterprise';
  status: 'active' | 'paused' | 'cancelled';
  branding: WhiteLabelBranding;
  features: WhiteLabelFeatures;
  billing: WhiteLabelBilling;
  builds: WhiteLabelBuild[];
  createdAt: string;
  updatedAt: string;
}

export interface WhiteLabelBranding {
  appName: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  icon?: string;
  splashScreen?: string;
}

export interface WhiteLabelFeatures {
  subscriptions: boolean;
  workOrders: boolean;
  invoicing: boolean;
  scheduling: boolean;
  payments: boolean;
  crm: boolean;
  reporting: boolean;
  customModules?: string[];
}

export interface WhiteLabelBilling {
  plan: 'standard' | 'premium' | 'enterprise';
  monthlyFee: number;
  setupFee?: number;
  nextBillingDate: string;
  paymentMethod?: string;
}

export interface WhiteLabelBuild {
  id: string;
  platform: 'ios' | 'android' | 'both';
  buildType: 'development' | 'staging' | 'production';
  status: BuildStatus;
  version: string;
  buildNumber: number;
  downloadUrl?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface WhiteLabelClientCreate {
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  plan: 'standard' | 'premium' | 'enterprise';
  branding: Partial<WhiteLabelBranding>;
  features?: Partial<WhiteLabelFeatures>;
}

export interface WhiteLabelBuildRequest {
  platform: 'ios' | 'android' | 'both';
  buildType: 'development' | 'staging' | 'production';
  version?: string;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface SubscriptionAnalytics {
  total: number;
  active: number;
  paused: number;
  cancelled: number;
  revenue: number;
  averageHoursUsed: number;
  byType: Record<SubscriptionType, number>;
  growthRate: number;
}

export interface ReferralAnalytics {
  total: number;
  pending: number;
  converted: number;
  conversionRate: number;
  rewardsClaimed: number;
  rewardsValue: number;
  topReferrers: Array<{
    name: string;
    email: string;
    referrals: number;
  }>;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  error: string;
  status: number;
  details?: any;
}

export interface ApiSuccessResponse {
  success: boolean;
  message?: string;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  message: string;
  timestamp: string;
}
