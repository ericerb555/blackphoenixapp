/**
 * API Client for Figma Make Backend
 * Centralized service layer for all API calls
 * 
 * Usage:
 *   import { api } from './lib/api';
 *   const subs = await api.subscriptions.getAll();
 *   await api.customers.create({ name: 'John' });
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import type {
  Subscription,
  SubscriptionCreate,
  SubscriptionUpdate,
  GiftHoursRequest,
  GiftHoursRequestCreate,
  Referral,
  ReferralCreate,
  ReferralUpdate,
  GiftCard,
  GiftCardCreate,
  Customer,
  CustomerCreate,
  CustomerUpdate,
  WorkOrder,
  WorkOrderCreate,
  WorkOrderUpdate,
  Invoice,
  InvoiceCreate,
  InvoiceUpdate,
  Subcontractor,
  SubcontractorCreate,
  SubcontractorUpdate,
  Vendor,
  VendorCreate,
  Advertiser,
  AdvertiserCreate,
  SubscriptionPlan,
  SubscriptionPlanCreate,
  SubscriptionPlanUpdate,
  Payment,
  PaymentProcess,
  PaymentSchedule,
  PaymentAlert,
  PaymentStats,
  WhiteLabelClient,
  WhiteLabelClientCreate,
  WhiteLabelBranding,
  WhiteLabelFeatures,
  WhiteLabelBuild,
  WhiteLabelBuildRequest,
  SubscriptionAnalytics,
  ReferralAnalytics,
  ApiSuccessResponse,
  HourTransaction,
} from '../types/api.types';

// Base URL for all API calls
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base API request configuration
 */
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Core request handler with error handling
 */
async function request<T>(config: RequestConfig): Promise<T> {
  const { method, endpoint, body, headers = {} } = config;
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        ...headers,
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        endpoint,
        errorData
      );
    }

    // Parse and return JSON
    return await response.json();
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Wrap other errors (network, parsing, etc.)
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error',
      0,
      endpoint,
      error
    );
  }
}

// ============================================================================
// SUBSCRIPTIONS API
// ============================================================================

export const subscriptionsApi = {
  /**
   * Get all subscriptions
   */
  getAll: () => 
    request<Subscription[]>({ method: 'GET', endpoint: '/subscriptions' }),

  /**
   * Get single subscription by ID
   */
  getById: (id: string) =>
    request<Subscription>({ method: 'GET', endpoint: `/subscriptions/${id}` }),

  /**
   * Create new subscription
   */
  create: (data: SubscriptionCreate) =>
    request<Subscription>({ method: 'POST', endpoint: '/subscriptions', body: data }),

  /**
   * Update subscription
   */
  update: (id: string, data: SubscriptionUpdate) =>
    request<Subscription>({ method: 'PUT', endpoint: `/subscriptions/${id}`, body: data }),

  /**
   * Delete subscription
   */
  delete: (id: string) =>
    request<ApiSuccessResponse>({ method: 'DELETE', endpoint: `/subscriptions/${id}` }),

  /**
   * Gift hours to subscription (Owner only)
   */
  giftHours: (id: string, data: { hours: number; reason: string; giftedBy: string }) =>
    request<{ success: boolean; subscription: Subscription }>({ method: 'POST', endpoint: `/subscriptions/${id}/gift-hours`, body: data }),

  /**
   * Get hour transactions for subscription
   */
  getHours: (id: string) =>
    request<HourTransaction[]>({ method: 'GET', endpoint: `/subscriptions/${id}/hours` }),

  /**
   * Process rollover for all subscriptions
   */
  processRollovers: () =>
    request<ApiSuccessResponse>({ method: 'POST', endpoint: '/subscriptions/process-rollovers' }),
};

// ============================================================================
// GIFT HOURS REQUESTS API
// ============================================================================

export const giftHoursRequestsApi = {
  /**
   * Get all gift hours requests
   */
  getAll: () =>
    request<GiftHoursRequest[]>({ method: 'GET', endpoint: '/gift-hours-requests' }),

  /**
   * Create gift hours request
   */
  create: (data: GiftHoursRequestCreate) =>
    request<GiftHoursRequest>({ method: 'POST', endpoint: '/gift-hours-requests', body: data }),

  /**
   * Approve gift hours request (Owner only)
   */
  approve: (id: string, data: { reviewedBy: string; notes?: string }) =>
    request<GiftHoursRequest>({ method: 'POST', endpoint: `/gift-hours-requests/${id}/approve`, body: data }),

  /**
   * Reject gift hours request (Owner only)
   */
  reject: (id: string, data: { reviewedBy: string; notes?: string }) =>
    request<GiftHoursRequest>({ method: 'POST', endpoint: `/gift-hours-requests/${id}/reject`, body: data }),
};

// ============================================================================
// REFERRALS API
// ============================================================================

export const referralsApi = {
  /**
   * Get all referrals
   */
  getAll: () =>
    request<Referral[]>({ method: 'GET', endpoint: '/referrals' }),

  /**
   * Create referral
   */
  create: (data: ReferralCreate) =>
    request<Referral>({ method: 'POST', endpoint: '/referrals', body: data }),

  /**
   * Update referral
   */
  update: (id: string, data: ReferralUpdate) =>
    request<Referral>({ method: 'PUT', endpoint: `/referrals/${id}`, body: data }),
};

// ============================================================================
// GIFT CARDS API
// ============================================================================

export const giftCardsApi = {
  /**
   * Get all gift cards
   */
  getAll: () =>
    request<GiftCard[]>({ method: 'GET', endpoint: '/giftcards' }),

  /**
   * Get gift card by code
   */
  getByCode: (code: string) =>
    request<GiftCard>({ method: 'GET', endpoint: `/giftcards/${code}` }),

  /**
   * Create gift card
   */
  create: (data: GiftCardCreate) =>
    request<GiftCard>({ method: 'POST', endpoint: '/giftcards', body: data }),

  /**
   * Redeem gift card
   */
  redeem: (code: string, data: { amount: number }) =>
    request<GiftCard>({ method: 'POST', endpoint: `/giftcards/${code}/redeem`, body: data }),
};

// ============================================================================
// CUSTOMERS API
// ============================================================================

export const customersApi = {
  /**
   * Get all customers
   */
  getAll: () =>
    request<Customer[]>({ method: 'GET', endpoint: '/customers' }),

  /**
   * Get single customer
   */
  getById: (id: string) =>
    request<Customer>({ method: 'GET', endpoint: `/customers/${id}` }),

  /**
   * Create customer
   */
  create: (data: CustomerCreate) =>
    request<Customer>({ method: 'POST', endpoint: '/customers', body: data }),

  /**
   * Update customer
   */
  update: (id: string, data: CustomerUpdate) =>
    request<Customer>({ method: 'PUT', endpoint: `/customers/${id}`, body: data }),
};

// ============================================================================
// WORK ORDERS API
// ============================================================================

export const workOrdersApi = {
  /**
   * Get all work orders
   */
  getAll: () =>
    request<WorkOrder[]>({ method: 'GET', endpoint: '/workorders' }),

  /**
   * Get single work order
   */
  getById: (id: string) =>
    request<WorkOrder>({ method: 'GET', endpoint: `/workorders/${id}` }),

  /**
   * Create work order
   */
  create: (data: WorkOrderCreate) =>
    request<WorkOrder>({ method: 'POST', endpoint: '/workorders', body: data }),

  /**
   * Update work order
   */
  update: (id: string, data: WorkOrderUpdate) =>
    request<WorkOrder>({ method: 'PUT', endpoint: `/workorders/${id}`, body: data }),
};

// ============================================================================
// INVOICES API
// ============================================================================

export const invoicesApi = {
  /**
   * Get all invoices
   */
  getAll: () =>
    request<Invoice[]>({ method: 'GET', endpoint: '/invoices' }),

  /**
   * Get single invoice
   */
  getById: (id: string) =>
    request<Invoice>({ method: 'GET', endpoint: `/invoices/${id}` }),

  /**
   * Create invoice
   */
  create: (data: InvoiceCreate) =>
    request<Invoice>({ method: 'POST', endpoint: '/invoices', body: data }),

  /**
   * Update invoice
   */
  update: (id: string, data: InvoiceUpdate) =>
    request<Invoice>({ method: 'PUT', endpoint: `/invoices/${id}`, body: data }),
};

// ============================================================================
// SUBCONTRACTORS API
// ============================================================================

export const subcontractorsApi = {
  /**
   * Get all subcontractors
   */
  getAll: () =>
    request<Subcontractor[]>({ method: 'GET', endpoint: '/subcontractors' }),

  /**
   * Create subcontractor
   */
  create: (data: SubcontractorCreate) =>
    request<Subcontractor>({ method: 'POST', endpoint: '/subcontractors', body: data }),

  /**
   * Update subcontractor
   */
  update: (id: string, data: SubcontractorUpdate) =>
    request<Subcontractor>({ method: 'PUT', endpoint: `/subcontractors/${id}`, body: data }),
};

// ============================================================================
// VENDORS API
// ============================================================================

export const vendorsApi = {
  /**
   * Get all vendors
   */
  getAll: () =>
    request<Vendor[]>({ method: 'GET', endpoint: '/vendors' }),

  /**
   * Create vendor
   */
  create: (data: VendorCreate) =>
    request<Vendor>({ method: 'POST', endpoint: '/vendors', body: data }),
};

// ============================================================================
// ADVERTISERS API
// ============================================================================

export const advertisersApi = {
  /**
   * Get all advertisers
   */
  getAll: () =>
    request<Advertiser[]>({ method: 'GET', endpoint: '/advertisers' }),

  /**
   * Create advertiser
   */
  create: (data: AdvertiserCreate) =>
    request<Advertiser>({ method: 'POST', endpoint: '/advertisers', body: data }),
};

// ============================================================================
// ANALYTICS API
// ============================================================================

export const analyticsApi = {
  /**
   * Get subscription analytics
   */
  subscriptions: () =>
    request<SubscriptionAnalytics>({ method: 'GET', endpoint: '/analytics/subscriptions' }),

  /**
   * Get referral analytics
   */
  referrals: () =>
    request<ReferralAnalytics>({ method: 'GET', endpoint: '/analytics/referrals' }),
};

// ============================================================================
// PLANS API
// ============================================================================

export const plansApi = {
  /**
   * Get all plans
   */
  getAll: () =>
    request<SubscriptionPlan[]>({ method: 'GET', endpoint: '/plans' }),

  /**
   * Get single plan
   */
  getById: (id: string) =>
    request<SubscriptionPlan>({ method: 'GET', endpoint: `/plans/${id}` }),

  /**
   * Create plan
   */
  create: (data: SubscriptionPlanCreate) =>
    request<SubscriptionPlan>({ method: 'POST', endpoint: '/plans', body: data }),

  /**
   * Update plan
   */
  update: (id: string, data: SubscriptionPlanUpdate) =>
    request<SubscriptionPlan>({ method: 'PUT', endpoint: `/plans/${id}`, body: data }),

  /**
   * Delete plan
   */
  delete: (id: string) =>
    request<ApiSuccessResponse>({ method: 'DELETE', endpoint: `/plans/${id}` }),
};

// ============================================================================
// SUBSCRIPTION PAYMENT API
// ============================================================================

export const subscriptionPaymentApi = {
  /**
   * Process payment
   */
  process: (data: PaymentProcess) =>
    request<Payment>({ method: 'POST', endpoint: '/subscription-payment/process', body: data }),

  /**
   * Schedule payment
   */
  schedule: (data: PaymentSchedule) =>
    request<ApiSuccessResponse>({ method: 'POST', endpoint: '/subscription-payment/schedule', body: data }),

  /**
   * Retry failed payment
   */
  retry: (data: { paymentId: string }) =>
    request<Payment>({ method: 'POST', endpoint: '/subscription-payment/retry', body: data }),

  /**
   * Get payment history for subscription
   */
  getHistory: (subscriptionId: string) =>
    request<Payment[]>({ method: 'GET', endpoint: `/subscription-payment/history/${subscriptionId}` }),

  /**
   * Get payment alerts
   */
  getAlerts: () =>
    request<PaymentAlert[]>({ method: 'GET', endpoint: '/subscription-payment/alerts' }),

  /**
   * Get payment statistics
   */
  getStats: () =>
    request<PaymentStats>({ method: 'GET', endpoint: '/subscription-payment/stats' }),

  /**
   * Get upcoming payments
   */
  getUpcoming: () =>
    request<Payment[]>({ method: 'GET', endpoint: '/subscription-payment/upcoming' }),

  /**
   * Get overdue payments
   */
  getOverdue: () =>
    request<Payment[]>({ method: 'GET', endpoint: '/subscription-payment/overdue' }),

  /**
   * Mark alert as read
   */
  markAlertRead: (id: string) =>
    request<ApiSuccessResponse>({ method: 'POST', endpoint: `/subscription-payment/alerts/${id}/read` }),

  /**
   * Pause subscription
   */
  pause: (data: { subscriptionId: string; reason: string }) =>
    request<Subscription>({ method: 'POST', endpoint: '/subscription-payment/pause', body: data }),

  /**
   * Resume subscription
   */
  resume: (data: { subscriptionId: string }) =>
    request<Subscription>({ method: 'POST', endpoint: '/subscription-payment/resume', body: data }),

  /**
   * Update payment method
   */
  updateMethod: (data: { subscriptionId: string; method: string; token?: string }) =>
    request<ApiSuccessResponse>({ method: 'POST', endpoint: '/subscription-payment/update-method', body: data }),

  /**
   * Generate invoice
   */
  generateInvoice: (data: { subscriptionId: string; month: string }) =>
    request<Invoice>({ method: 'POST', endpoint: '/subscription-payment/generate-invoice', body: data }),
};

// ============================================================================
// WHITE LABEL API
// ============================================================================

export const whiteLabelApi = {
  /**
   * Get all white label clients
   */
  getClients: () =>
    request<WhiteLabelClient[]>({ method: 'GET', endpoint: '/white-label/clients' }),

  /**
   * Get single client
   */
  getClientById: (id: string) =>
    request<WhiteLabelClient>({ method: 'GET', endpoint: `/white-label/clients/${id}` }),

  /**
   * Create client
   */
  createClient: (data: WhiteLabelClientCreate) =>
    request<WhiteLabelClient>({ method: 'POST', endpoint: '/white-label/clients', body: data }),

  /**
   * Update client
   */
  updateClient: (id: string, data: Partial<WhiteLabelClientCreate>) =>
    request<WhiteLabelClient>({ method: 'PUT', endpoint: `/white-label/clients/${id}`, body: data }),

  /**
   * Delete client
   */
  deleteClient: (id: string) =>
    request<ApiSuccessResponse>({ method: 'DELETE', endpoint: `/white-label/clients/${id}` }),

  /**
   * Update client branding
   */
  updateBranding: (id: string, data: Partial<WhiteLabelBranding>) =>
    request<WhiteLabelClient>({ method: 'PUT', endpoint: `/white-label/clients/${id}/branding`, body: data }),

  /**
   * Update client features
   */
  updateFeatures: (id: string, data: Partial<WhiteLabelFeatures>) =>
    request<WhiteLabelClient>({ method: 'PUT', endpoint: `/white-label/clients/${id}/features`, body: data }),

  /**
   * Trigger app build
   */
  build: (id: string, data: WhiteLabelBuildRequest) =>
    request<WhiteLabelBuild>({ method: 'POST', endpoint: `/white-label/clients/${id}/build`, body: data }),

  /**
   * Get build status
   */
  getBuildStatus: (buildId: string) =>
    request<WhiteLabelBuild>({ method: 'GET', endpoint: `/white-label/builds/${buildId}` }),

  /**
   * Get stats
   */
  getStats: () =>
    request<any>({ method: 'GET', endpoint: '/white-label/stats' }),

  /**
   * Initialize white label system
   */
  initialize: () =>
    request<ApiSuccessResponse>({ method: 'POST', endpoint: '/white-label/initialize' }),
};

// ============================================================================
// UNIFIED API EXPORT
// ============================================================================

/**
 * Main API object - import this in your components
 * 
 * @example
 * import { api } from './lib/api';
 * 
 * // Get all subscriptions
 * const subs = await api.subscriptions.getAll();
 * 
 * // Create customer
 * await api.customers.create({ name: 'John', email: 'john@example.com' });
 * 
 * // Handle errors
 * try {
 *   await api.invoices.create(data);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(`API Error: ${error.message} (${error.status})`);
 *   }
 * }
 */
export const api = {
  subscriptions: subscriptionsApi,
  giftHoursRequests: giftHoursRequestsApi,
  referrals: referralsApi,
  giftCards: giftCardsApi,
  customers: customersApi,
  workOrders: workOrdersApi,
  invoices: invoicesApi,
  subcontractors: subcontractorsApi,
  vendors: vendorsApi,
  advertisers: advertisersApi,
  analytics: analyticsApi,
  plans: plansApi,
  payment: subscriptionPaymentApi,
  whiteLabel: whiteLabelApi,
};

// Also export individual APIs for flexibility
export {
  subscriptionsApi,
  giftHoursRequestsApi,
  referralsApi,
  giftCardsApi,
  customersApi,
  workOrdersApi,
  invoicesApi,
  subcontractorsApi,
  vendorsApi,
  advertisersApi,
  analyticsApi,
  plansApi,
  subscriptionPaymentApi,
  whiteLabelApi,
};
