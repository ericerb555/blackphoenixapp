/**
 * Checkout Service
 * 
 * Unified checkout and payment processing service for:
 * - Subscription payments (service plans, advertising)
 * - Invoice payments
 * - One-time payments
 * - Multi-gateway support
 * - Transaction recording with business association
 */

import { v4 as uuidv4 } from 'uuid';
import type { PaymentGateway, PaymentType, PaymentStatus, UnifiedPayment } from './unifiedPaymentService';
import UnifiedPaymentService from './unifiedPaymentService';

// ============================================================================
// TYPES
// ============================================================================

export interface CheckoutItem {
  id: string;
  type: 'subscription' | 'advertising' | 'invoice' | 'one_time';
  name: string;
  description: string;
  amount: number;
  quantity?: number;
  billing_cycle?: 'monthly' | 'quarterly' | '90-day' | 'annual';
  plan_id?: string;
  invoice_id?: string;
  metadata?: Record<string, any>;
}

export interface CheckoutSession {
  id: string;
  business_id: string;
  business_name: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  items: CheckoutItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  selected_gateway?: PaymentGateway;
  payment_method?: PaymentMethodInfo;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  payment_id?: string;
}

export interface PaymentMethodInfo {
  type: 'card' | 'bank_account' | 'wallet' | 'crypto';
  gateway: PaymentGateway;
  // Card
  card_number?: string; // Last 4 digits
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  card_cvc?: string;
  // Bank Account
  account_number?: string; // Last 4 digits
  routing_number?: string;
  account_type?: 'checking' | 'savings';
  // Wallet
  wallet_address?: string;
  wallet_type?: string;
}

export interface TransactionRecord {
  id: string;
  business_id: string;
  business_name: string;
  checkout_session_id: string;
  payment_id: string;
  type: PaymentType;
  status: PaymentStatus;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  customer_name?: string;
  customer_email?: string;
  items: CheckoutItem[];
  payment_method?: PaymentMethodInfo;
  external_transaction_id?: string; // From gateway
  gateway_response?: Record<string, any>;
  receipt_url?: string;
  created_at: string;
  processed_at?: string;
  error_message?: string;
}

// ============================================================================
// CHECKOUT SERVICE
// ============================================================================

class CheckoutService {
  private readonly KV_PREFIX = 'checkout:';
  private readonly SESSION_PREFIX = 'session:';
  private readonly TRANSACTION_PREFIX = 'transaction:';
  private readonly BUSINESS_TRANSACTIONS_PREFIX = 'business_transactions:';

  /**
   * Create a new checkout session
   */
  async createSession(data: {
    business_id: string;
    business_name: string;
    customer_id?: string;
    customer_name?: string;
    customer_email?: string;
    items: CheckoutItem[];
    discount?: number;
    tax_rate?: number;
  }): Promise<{ success: boolean; data?: CheckoutSession; error?: string }> {
    try {
      const subtotal = data.items.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0);
      const discount = data.discount || 0;
      const tax = subtotal * (data.tax_rate || 0);
      const total = subtotal - discount + tax;

      const session: CheckoutSession = {
        id: uuidv4(),
        business_id: data.business_id,
        business_name: data.business_name,
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        items: data.items,
        subtotal,
        tax,
        discount,
        total,
        currency: 'USD',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to localStorage
      const key = `${this.KV_PREFIX}${this.SESSION_PREFIX}${session.id}`;
      localStorage.setItem(key, JSON.stringify(session));

      return { success: true, data: session };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return { success: false, error: 'Failed to create checkout session' };
    }
  }

  /**
   * Get checkout session by ID
   */
  async getSession(sessionId: string): Promise<{ success: boolean; data?: CheckoutSession; error?: string }> {
    try {
      const key = `${this.KV_PREFIX}${this.SESSION_PREFIX}${sessionId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        return { success: false, error: 'Session not found' };
      }

      const session = JSON.parse(stored);
      return { success: true, data: session };
    } catch (error) {
      console.error('Error getting checkout session:', error);
      return { success: false, error: 'Failed to get checkout session' };
    }
  }

  /**
   * Update checkout session
   */
  async updateSession(sessionId: string, updates: Partial<CheckoutSession>): Promise<{ success: boolean; data?: CheckoutSession; error?: string }> {
    try {
      const { data: session } = await this.getSession(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      const updated = {
        ...session,
        ...updates,
        updated_at: new Date().toISOString()
      };

      const key = `${this.KV_PREFIX}${this.SESSION_PREFIX}${sessionId}`;
      localStorage.setItem(key, JSON.stringify(updated));

      return { success: true, data: updated };
    } catch (error) {
      console.error('Error updating checkout session:', error);
      return { success: false, error: 'Failed to update checkout session' };
    }
  }

  /**
   * Process payment through selected gateway
   */
  async processPayment(
    sessionId: string,
    gateway: PaymentGateway,
    paymentMethod: PaymentMethodInfo
  ): Promise<{ success: boolean; data?: TransactionRecord; error?: string }> {
    try {
      const { data: session } = await this.getSession(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      // Update session status
      await this.updateSession(sessionId, {
        status: 'processing',
        selected_gateway: gateway,
        payment_method: paymentMethod
      });

      // Simulate payment processing based on gateway
      const processingResult = await this.simulateGatewayProcessing(gateway, session, paymentMethod);

      if (!processingResult.success) {
        await this.updateSession(sessionId, { status: 'failed' });
        return { success: false, error: processingResult.error };
      }

      // Create payment record in unified payment service
      const paymentType = this.getPaymentType(session.items[0].type);
      const { data: payment } = await UnifiedPaymentService.createPayment({
        type: paymentType,
        gateway,
        amount: session.total,
        currency: session.currency,
        description: this.generatePaymentDescription(session.items),
        customer_id: session.customer_id,
        customer_name: session.customer_name,
        customer_email: session.customer_email,
        invoice_id: session.items.find(i => i.invoice_id)?.invoice_id,
        subscription_id: session.items.find(i => i.type === 'subscription')?.plan_id,
        advertising_subscription_id: session.items.find(i => i.type === 'advertising')?.plan_id,
        external_transaction_id: processingResult.transaction_id,
        metadata: {
          checkout_session_id: sessionId,
          business_id: session.business_id,
          items: session.items
        }
      });

      if (!payment) {
        return { success: false, error: 'Failed to create payment record' };
      }

      // Create transaction record
      const transaction: TransactionRecord = {
        id: uuidv4(),
        business_id: session.business_id,
        business_name: session.business_name,
        checkout_session_id: sessionId,
        payment_id: payment.id,
        type: paymentType,
        status: 'completed',
        gateway,
        amount: session.total,
        currency: session.currency,
        customer_name: session.customer_name,
        customer_email: session.customer_email,
        items: session.items,
        payment_method: paymentMethod,
        external_transaction_id: processingResult.transaction_id,
        gateway_response: processingResult.response,
        receipt_url: `/receipts/${payment.id}`,
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      };

      // Save transaction
      const txKey = `${this.KV_PREFIX}${this.TRANSACTION_PREFIX}${transaction.id}`;
      localStorage.setItem(txKey, JSON.stringify(transaction));

      // Add to business transactions index
      const businessTxKey = `${this.KV_PREFIX}${this.BUSINESS_TRANSACTIONS_PREFIX}${session.business_id}`;
      const businessTxs = JSON.parse(localStorage.getItem(businessTxKey) || '[]');
      businessTxs.push(transaction.id);
      localStorage.setItem(businessTxKey, JSON.stringify(businessTxs));

      // Update session
      await this.updateSession(sessionId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        payment_id: payment.id
      });

      // Handle subscription creation if needed
      if (session.items.some(item => item.type === 'subscription' || item.type === 'advertising')) {
        await this.createSubscriptionsFromSession(session, payment.id, gateway);
      }

      return { success: true, data: transaction };
    } catch (error) {
      console.error('Error processing payment:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<{ success: boolean; data?: TransactionRecord; error?: string }> {
    try {
      const key = `${this.KV_PREFIX}${this.TRANSACTION_PREFIX}${transactionId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        return { success: false, error: 'Transaction not found' };
      }

      const transaction = JSON.parse(stored);
      return { success: true, data: transaction };
    } catch (error) {
      console.error('Error getting transaction:', error);
      return { success: false, error: 'Failed to get transaction' };
    }
  }

  /**
   * Get all transactions for a business
   */
  async getBusinessTransactions(businessId: string): Promise<{ success: boolean; data: TransactionRecord[]; error?: string }> {
    try {
      const businessTxKey = `${this.KV_PREFIX}${this.BUSINESS_TRANSACTIONS_PREFIX}${businessId}`;
      const transactionIds = JSON.parse(localStorage.getItem(businessTxKey) || '[]');

      const transactions: TransactionRecord[] = [];
      for (const txId of transactionIds) {
        const { data } = await this.getTransaction(txId);
        if (data) transactions.push(data);
      }

      // Sort by date, newest first
      transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { success: true, data: transactions };
    } catch (error) {
      console.error('Error getting business transactions:', error);
      return { success: false, data: [], error: 'Failed to get transactions' };
    }
  }

  /**
   * Get all transactions (for admin view)
   */
  async getAllTransactions(): Promise<{ success: boolean; data: TransactionRecord[]; error?: string }> {
    try {
      const transactions: TransactionRecord[] = [];
      
      // Get all transaction keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.KV_PREFIX}${this.TRANSACTION_PREFIX}`)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            transactions.push(JSON.parse(stored));
          }
        }
      }

      // Sort by date, newest first
      transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { success: true, data: transactions };
    } catch (error) {
      console.error('Error getting all transactions:', error);
      return { success: false, data: [], error: 'Failed to get transactions' };
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async simulateGatewayProcessing(
    gateway: PaymentGateway,
    session: CheckoutSession,
    paymentMethod: PaymentMethodInfo
  ): Promise<{ success: boolean; transaction_id?: string; response?: any; error?: string }> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if gateway is configured
    const configKey = `gateway_config_${gateway}`;
    const config = localStorage.getItem(configKey);
    if (!config) {
      return { success: false, error: `${gateway} is not configured` };
    }

    const gatewayConfig = JSON.parse(config);
    if (!gatewayConfig.is_active) {
      return { success: false, error: `${gateway} is not active` };
    }

    // Simulate 95% success rate
    const isSuccess = Math.random() > 0.05;
    
    if (!isSuccess) {
      return {
        success: false,
        error: 'Payment declined by gateway'
      };
    }

    // Generate mock transaction ID
    const transactionId = `${gateway}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      transaction_id: transactionId,
      response: {
        gateway,
        transaction_id: transactionId,
        amount: session.total,
        currency: session.currency,
        status: 'success',
        test_mode: gatewayConfig.test_mode,
        timestamp: new Date().toISOString()
      }
    };
  }

  private getPaymentType(itemType: string): PaymentType {
    switch (itemType) {
      case 'subscription':
        return 'subscription';
      case 'advertising':
        return 'advertising_subscription';
      case 'invoice':
        return 'invoice';
      default:
        return 'one_time';
    }
  }

  private generatePaymentDescription(items: CheckoutItem[]): string {
    if (items.length === 1) {
      return items[0].name;
    }
    return `Payment for ${items.length} items`;
  }

  private async createSubscriptionsFromSession(
    session: CheckoutSession,
    paymentId: string,
    gateway: PaymentGateway
  ): Promise<void> {
    for (const item of session.items) {
      if (item.type === 'subscription' || item.type === 'advertising') {
        await UnifiedPaymentService.createSubscription({
          type: item.type === 'subscription' ? 'service_plan' : 'advertising',
          customer_id: session.customer_id,
          advertiser_id: session.customer_id,
          plan_id: item.plan_id || item.id,
          plan_name: item.name,
          amount: item.amount,
          currency: session.currency,
          billing_cycle: item.billing_cycle || 'monthly',
          start_date: new Date().toISOString(),
          auto_renew: true,
          payment_gateway: gateway,
          metadata: {
            checkout_session_id: session.id,
            initial_payment_id: paymentId,
            business_id: session.business_id
          }
        });
      }
    }
  }
}

export default new CheckoutService();
