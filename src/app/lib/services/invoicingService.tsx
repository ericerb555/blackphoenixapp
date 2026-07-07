/**
 * Multi-Company Invoicing Service
 * Handles invoice management with full company separation
 */

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taxable: boolean;
  taxRate?: number;
  discount?: number;
  category?: string;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  date: string;
  method: 'credit-card' | 'ach' | 'check' | 'cash' | 'wire' | 'other';
  reference: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  
  // Company Information
  companyId: string;
  companyName: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxId?: string;
  
  // Customer Information
  customerId: string | null;
  customerName: string | null;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxId?: string;
  
  // Dates
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  createdDate: string;
  updatedDate: string;
  
  // Financial
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  
  // Items & Payments
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
  
  // Status & Type
  status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'void' | 'cancelled';
  isDraft: boolean;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
  
  // References
  projectId?: string;
  workOrderId?: string;
  quoteId?: string;
  contractId?: string;
  
  // Terms & Notes
  paymentTerms: string;
  notes?: string;
  privateNotes?: string;
  terms?: string;
  
  // Branding & Customization
  template: 'standard' | 'modern' | 'classic' | 'minimal';
  accentColor: string;
  
  // Tracking
  sentCount: number;
  viewedCount: number;
  lastSentDate?: string;
  lastViewedDate?: string;
  
  // Reminders
  remindersSent: number;
  nextReminderDate?: string;
  
  // Metadata
  createdBy: string;
  tags?: string[];
  attachments?: string[];
}

export interface InvoiceSettings {
  companyId: string;
  companyName: string;
  
  // Numbering
  prefix: string;
  nextNumber: number;
  numberFormat: 'sequential' | 'date-based' | 'custom';
  
  // Defaults
  defaultTemplate: Invoice['template'];
  defaultAccentColor: string;
  defaultPaymentTerms: string;
  defaultDueDays: number;
  
  // Tax Settings
  defaultTaxRate: number;
  taxLabel: string;
  taxId?: string;
  
  // Company Info
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  
  // Payment Methods
  acceptedPaymentMethods: string[];
  paymentInstructions?: string;
  
  // Automation
  autoSendReminders: boolean;
  reminderDaysBefore: number[];
  reminderDaysAfter: number[];
  
  // Branding
  showLogo: boolean;
  showCompanyDetails: boolean;
  footerText?: string;
}

class InvoicingService {
  private storageKey = 'enterprise_invoices';
  private settingsKey = 'invoice_settings_by_company';
  private companiesKey = 'invoice_companies';

  // Get all invoices
  getAllInvoices(): Invoice[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : this.initializeDefaultInvoices();
  }

  // Get invoices by company
  getInvoicesByCompany(companyId: string): Invoice[] {
    return this.getAllInvoices().filter(inv => inv.companyId === companyId);
  }

  // Get invoice by ID
  getInvoiceById(invoiceId: string): Invoice | null {
    return this.getAllInvoices().find(inv => inv.id === invoiceId) || null;
  }

  // Get invoices by status
  getInvoicesByStatus(companyId: string, status: Invoice['status']): Invoice[] {
    return this.getInvoicesByCompany(companyId).filter(inv => inv.status === status);
  }

  // Get invoices by customer
  getInvoicesByCustomer(customerId: string): Invoice[] {
    return this.getAllInvoices().filter(inv => inv.customerId === customerId);
  }

  // Create invoice
  createInvoice(companyId: string, data: Partial<Invoice>): Invoice {
    const invoices = this.getAllInvoices();
    const settings = this.getCompanySettings(companyId);
    
    const invoiceNumber = this.generateInvoiceNumber(companyId);
    
    const newInvoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber,
      companyId,
      companyName: settings.companyName,
      companyLogo: settings.logo,
      companyAddress: settings.address,
      companyPhone: settings.phone,
      companyEmail: settings.email,
      companyTaxId: settings.taxId,
      customerId: data.customerId || null,
      customerName: data.customerName || null,
      customerEmail: data.customerEmail || '',
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      issueDate: data.issueDate || new Date().toISOString().split('T')[0],
      dueDate: data.dueDate || this.calculateDueDate(settings.defaultDueDays),
      paidDate: null,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      lineItems: data.lineItems || [],
      payments: [],
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      paidAmount: 0,
      balanceDue: 0,
      status: data.isDraft ? 'draft' : 'sent',
      isDraft: data.isDraft || false,
      isRecurring: data.isRecurring || false,
      recurringFrequency: data.recurringFrequency,
      projectId: data.projectId,
      workOrderId: data.workOrderId,
      quoteId: data.quoteId,
      contractId: data.contractId,
      paymentTerms: data.paymentTerms || settings.defaultPaymentTerms,
      notes: data.notes,
      privateNotes: data.privateNotes,
      terms: data.terms,
      template: data.template || settings.defaultTemplate,
      accentColor: data.accentColor || settings.defaultAccentColor,
      sentCount: 0,
      viewedCount: 0,
      remindersSent: 0,
      createdBy: data.createdBy || 'system',
      tags: data.tags || [],
      attachments: data.attachments || []
    };
    
    // Calculate totals
    this.recalculateInvoice(newInvoice);
    
    invoices.push(newInvoice);
    this.saveInvoices(invoices);
    
    // Update next invoice number
    this.incrementInvoiceNumber(companyId);
    
    return newInvoice;
  }

  // Update invoice
  updateInvoice(invoiceId: string, updates: Partial<Invoice>): void {
    const invoices = this.getAllInvoices();
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    
    if (index !== -1) {
      invoices[index] = {
        ...invoices[index],
        ...updates,
        updatedDate: new Date().toISOString()
      };
      
      // Recalculate if line items changed
      if (updates.lineItems) {
        this.recalculateInvoice(invoices[index]);
      }
      
      this.saveInvoices(invoices);
    }
  }

  // Delete invoice
  deleteInvoice(invoiceId: string): void {
    const invoices = this.getAllInvoices();
    const filtered = invoices.filter(inv => inv.id !== invoiceId);
    this.saveInvoices(filtered);
  }

  // Add payment
  addPayment(invoiceId: string, payment: Omit<InvoicePayment, 'id'>): void {
    const invoices = this.getAllInvoices();
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    if (invoice) {
      const newPayment: InvoicePayment = {
        ...payment,
        id: `pmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      invoice.payments.push(newPayment);
      invoice.paidAmount += payment.amount;
      invoice.balanceDue = invoice.totalAmount - invoice.paidAmount;
      
      // Update status
      if (invoice.paidAmount >= invoice.totalAmount) {
        invoice.status = 'paid';
        invoice.paidDate = payment.date;
      } else if (invoice.paidAmount > 0) {
        invoice.status = 'partial';
      }
      
      invoice.updatedDate = new Date().toISOString();
      this.saveInvoices(invoices);
    }
  }

  // Send invoice
  sendInvoice(invoiceId: string): void {
    const invoices = this.getAllInvoices();
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    if (invoice) {
      invoice.status = 'sent';
      invoice.isDraft = false;
      invoice.sentCount++;
      invoice.lastSentDate = new Date().toISOString();
      invoice.updatedDate = new Date().toISOString();
      this.saveInvoices(invoices);
    }
  }

  // Mark as viewed
  markAsViewed(invoiceId: string): void {
    const invoices = this.getAllInvoices();
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    if (invoice && invoice.status === 'sent') {
      invoice.status = 'viewed';
      invoice.viewedCount++;
      invoice.lastViewedDate = new Date().toISOString();
      this.saveInvoices(invoices);
    }
  }

  // Void invoice
  voidInvoice(invoiceId: string): void {
    this.updateInvoice(invoiceId, { status: 'void' });
  }

  // Get company settings
  getCompanySettings(companyId: string): InvoiceSettings {
    const allSettings = this.getAllCompanySettings();
    return allSettings[companyId] || this.createDefaultSettings(companyId);
  }

  // Update company settings
  updateCompanySettings(companyId: string, settings: Partial<InvoiceSettings>): void {
    const allSettings = this.getAllCompanySettings();
    allSettings[companyId] = {
      ...allSettings[companyId],
      ...settings
    };
    localStorage.setItem(this.settingsKey, JSON.stringify(allSettings));
  }

  // Get all companies
  getCompanies(): { id: string; name: string }[] {
    const data = localStorage.getItem(this.companiesKey);
    return data ? JSON.parse(data) : this.initializeDefaultCompanies();
  }

  // Add company
  addCompany(name: string): string {
    const companies = this.getCompanies();
    const id = `company_${Date.now()}`;
    companies.push({ id, name });
    localStorage.setItem(this.companiesKey, JSON.stringify(companies));
    
    // Create default settings
    this.createDefaultSettings(id, name);
    
    return id;
  }

  // Get statistics by company
  getCompanyStats(companyId: string) {
    const invoices = this.getInvoicesByCompany(companyId);
    
    const total = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pending = invoices.filter(inv => inv.status === 'sent' || inv.status === 'viewed').reduce((sum, inv) => sum + inv.balanceDue, 0);
    const overdue = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.balanceDue, 0);
    const draft = invoices.filter(inv => inv.status === 'draft').length;
    
    return {
      total,
      paid,
      pending,
      overdue,
      draft,
      count: invoices.length,
      paidCount: invoices.filter(inv => inv.status === 'paid').length,
      overdueCount: invoices.filter(inv => inv.status === 'overdue').length
    };
  }

  // Check for overdue invoices
  checkOverdueInvoices(): void {
    const invoices = this.getAllInvoices();
    const today = new Date().toISOString().split('T')[0];
    
    invoices.forEach(invoice => {
      if (invoice.status !== 'paid' && invoice.status !== 'void' && invoice.status !== 'draft') {
        if (invoice.dueDate < today) {
          invoice.status = 'overdue';
        }
      }
    });
    
    this.saveInvoices(invoices);
  }

  // Generate invoice number
  private generateInvoiceNumber(companyId: string): string {
    const settings = this.getCompanySettings(companyId);
    const number = settings.nextNumber.toString().padStart(4, '0');
    
    switch (settings.numberFormat) {
      case 'date-based':
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${settings.prefix}-${year}${month}-${number}`;
      case 'sequential':
      default:
        return `${settings.prefix}-${number}`;
    }
  }

  // Increment invoice number
  private incrementInvoiceNumber(companyId: string): void {
    const settings = this.getCompanySettings(companyId);
    settings.nextNumber++;
    this.updateCompanySettings(companyId, { nextNumber: settings.nextNumber });
  }

  // Calculate due date
  private calculateDueDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  // Recalculate invoice totals
  private recalculateInvoice(invoice: Invoice): void {
    invoice.subtotal = invoice.lineItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.rate;
      const discount = item.discount || 0;
      return sum + (itemTotal - discount);
    }, 0);
    
    invoice.taxAmount = invoice.lineItems.reduce((sum, item) => {
      if (item.taxable && item.taxRate) {
        const itemTotal = item.quantity * item.rate - (item.discount || 0);
        return sum + (itemTotal * item.taxRate / 100);
      }
      return sum;
    }, 0);
    
    invoice.totalAmount = invoice.subtotal + invoice.taxAmount - invoice.discountAmount;
    invoice.balanceDue = invoice.totalAmount - invoice.paidAmount;
  }

  // Get all company settings
  private getAllCompanySettings(): Record<string, InvoiceSettings> {
    const data = localStorage.getItem(this.settingsKey);
    return data ? JSON.parse(data) : {};
  }

  // Create default settings
  private createDefaultSettings(companyId: string, companyName?: string): InvoiceSettings {
    const companies = this.getCompanies();
    const company = companies.find(c => c.id === companyId);
    
    const settings: InvoiceSettings = {
      companyId,
      companyName: companyName || company?.name || 'My Company',
      prefix: 'INV',
      nextNumber: 1001,
      numberFormat: 'sequential',
      defaultTemplate: 'modern',
      defaultAccentColor: '#ea580c',
      defaultPaymentTerms: 'Net 30',
      defaultDueDays: 30,
      defaultTaxRate: 8.5,
      taxLabel: 'Sales Tax',
      acceptedPaymentMethods: ['credit-card', 'ach', 'check'],
      autoSendReminders: true,
      reminderDaysBefore: [7, 3, 1],
      reminderDaysAfter: [1, 7, 14],
      showLogo: true,
      showCompanyDetails: true
    };
    
    const allSettings = this.getAllCompanySettings();
    allSettings[companyId] = settings;
    localStorage.setItem(this.settingsKey, JSON.stringify(allSettings));
    
    return settings;
  }

  // Save invoices
  private saveInvoices(invoices: Invoice[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(invoices));
  }

  // Initialize default companies
  private initializeDefaultCompanies(): { id: string; name: string }[] {
    const companies = [
      { id: 'company_1', name: 'Acme Construction' },
      { id: 'company_2', name: 'Prime Contractors LLC' },
      { id: 'company_3', name: 'Elite Services Inc' }
    ];
    localStorage.setItem(this.companiesKey, JSON.stringify(companies));
    return companies;
  }

  // Initialize default invoices
  private initializeDefaultInvoices(): Invoice[] {
    const companies = this.getCompanies();
    const today = new Date();
    const invoices: Invoice[] = [];
    
    companies.forEach((company, idx) => {
      const settings = this.getCompanySettings(company.id);
      
      // Create 2-3 sample invoices per company
      for (let i = 0; i < 3; i++) {
        const issueDate = new Date(today);
        issueDate.setDate(today.getDate() - (10 * i));
        
        const dueDate = new Date(issueDate);
        dueDate.setDate(issueDate.getDate() + 30);
        
        const amount = 1000 + (i * 500) + (idx * 1000);
        const isPaid = i === 0;
        
        invoices.push({
          id: `inv_${company.id}_${i}`,
          invoiceNumber: `${settings.prefix}-${1001 + i}`,
          companyId: company.id,
          companyName: company.name,
          companyLogo: settings.logo,
          companyAddress: settings.address,
          companyPhone: settings.phone,
          companyEmail: settings.email,
          customerId: `cust_${i}`,
          customerName: `Customer ${i + 1}`,
          customerEmail: `customer${i + 1}@example.com`,
          issueDate: issueDate.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          paidDate: isPaid ? new Date().toISOString().split('T')[0] : null,
          createdDate: issueDate.toISOString(),
          updatedDate: new Date().toISOString(),
          lineItems: [
            {
              id: '1',
              description: 'Service Fee',
              quantity: 1,
              rate: amount,
              amount: amount,
              taxable: true,
              taxRate: 8.5
            }
          ],
          payments: isPaid ? [{
            id: 'pmt_1',
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            method: 'credit-card',
            reference: 'CARD-12345'
          }] : [],
          subtotal: amount,
          taxAmount: amount * 0.085,
          discountAmount: 0,
          totalAmount: amount + (amount * 0.085),
          paidAmount: isPaid ? amount + (amount * 0.085) : 0,
          balanceDue: isPaid ? 0 : amount + (amount * 0.085),
          status: isPaid ? 'paid' : (i === 1 ? 'sent' : 'draft'),
          isDraft: i === 2,
          isRecurring: false,
          paymentTerms: 'Net 30',
          template: 'modern',
          accentColor: '#ea580c',
          sentCount: isPaid ? 1 : (i === 1 ? 1 : 0),
          viewedCount: 0,
          remindersSent: 0,
          createdBy: 'system'
        });
      }
    });
    
    this.saveInvoices(invoices);
    return invoices;
  }
}

export const invoicingService = new InvoicingService();
