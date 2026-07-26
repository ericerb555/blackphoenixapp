/**
 * Job Financial Service
 * Real-time tracking of hours, purchases, materials, and vendors per job
 *
 * Persistence model: localStorage acts as a synchronous hot cache so the (sync)
 * public API keeps working, while every write is mirrored to the server and the
 * whole dataset can be re-hydrated from the server on app load. This makes job
 * financial data durable and shared across devices instead of browser-local.
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const jobFinAuthHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
};

export interface TimeEntry {
  id: string;
  jobId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  rate: number;
  total: number;
  description: string;
  category: 'labor' | 'overtime' | 'travel';
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PurchaseEntry {
  id: string;
  jobId: string;
  date: string;
  vendor: string;
  vendorId?: string;
  category: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receiptUrl?: string;
  invoiceNumber?: string;
  paymentMethod: string;
  paidBy: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface MaterialUsage {
  id: string;
  jobId: string;
  date: string;
  materialId: string;
  materialName: string;
  vendor: string;
  vendorId?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  category: string;
  usedBy: string;
  notes?: string;
}

export interface VendorTransaction {
  id: string;
  jobId: string;
  vendorId: string;
  vendorName: string;
  date: string;
  type: 'purchase' | 'material' | 'service';
  amount: number;
  description: string;
  invoiceNumber?: string;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
}

export interface JobFinancialSummary {
  jobId: string;
  jobNumber: string;
  jobName: string;
  customer: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  startDate: string;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  
  // Budget
  budgetedAmount: number;
  contractAmount: number;
  
  // Labor
  totalLaborHours: number;
  totalLaborCost: number;
  budgetedLaborCost: number;
  
  // Materials
  totalMaterialCost: number;
  budgetedMaterialCost: number;
  
  // Purchases
  totalPurchases: number;
  budgetedPurchases: number;
  
  // Vendors
  vendorTransactions: VendorTransaction[];
  totalVendorCosts: number;
  
  // Totals
  totalCosts: number;
  profitMargin: number;
  profitAmount: number;
  percentComplete: number;
  
  // Tracking
  lastUpdated: string;
  updatedBy: string;
}

export interface JobFolder {
  id: string;
  jobId: string;
  name: string;
  description?: string;
  documents: JobDocument[];
  createdAt: string;
  createdBy: string;
}

export interface JobDocument {
  id: string;
  folderId: string;
  type: 'receipt' | 'invoice' | 'timesheet' | 'report' | 'photo' | 'contract' | 'other';
  name: string;
  url?: string;
  uploadedAt: string;
  uploadedBy: string;
  size?: number;
}

export interface ActivityLog {
  id: string;
  jobId: string;
  timestamp: string;
  user: string;
  action: string;
  category: 'labor' | 'purchase' | 'material' | 'vendor' | 'budget' | 'status';
  description: string;
  amount?: number;
  metadata?: any;
}

class JobFinancialService {
  private storageKey = 'job_financials';
  private logsKey = 'job_activity_logs';
  private foldersKey = 'job_folders';

  // Write-through: update the synchronous localStorage cache and mirror to server.
  private write(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[jobFinancialService] localStorage write failed for ${key}:`, err);
    }
    // Fire-and-forget server persistence so the sync API is not blocked.
    fetch(`${SERVER}/job-financials/kv`, {
      method: 'POST',
      headers: jobFinAuthHeaders,
      body: JSON.stringify({ key, value }),
    }).catch((err) =>
      console.error(`[jobFinancialService] server sync failed for ${key}:`, err),
    );
  }

  // Pull the full server snapshot into the localStorage cache. Call on app load
  // before reading so the sync getters return server-backed data.
  async hydrateFromServer(): Promise<void> {
    try {
      const res = await fetch(`${SERVER}/job-financials/snapshot`, {
        headers: jobFinAuthHeaders,
      });
      const json = await res.json();
      if (!json.success || !Array.isArray(json.entries)) {
        if (json.error) console.error('[jobFinancialService] hydrate failed:', json.error);
        return;
      }
      for (const entry of json.entries) {
        if (entry && typeof entry.key === 'string') {
          try {
            localStorage.setItem(entry.key, JSON.stringify(entry.value));
          } catch (err) {
            console.error(`[jobFinancialService] cache write failed for ${entry.key}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('[jobFinancialService] Error hydrating from server:', err);
    }
  }

  // Get all job financials
  getAllJobs(): JobFinancialSummary[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : this.getDefaultJobs();
  }

  // Get single job
  getJob(jobId: string): JobFinancialSummary | null {
    const jobs = this.getAllJobs();
    return jobs.find(j => j.jobId === jobId) || null;
  }

  // Create new job tracking
  createJob(job: Partial<JobFinancialSummary>): JobFinancialSummary {
    const jobs = this.getAllJobs();
    const newJob: JobFinancialSummary = {
      jobId: job.jobId || `job_${Date.now()}`,
      jobNumber: job.jobNumber || `JOB-${Date.now()}`,
      jobName: job.jobName || '',
      customer: job.customer || '',
      status: 'active',
      startDate: new Date().toISOString(),
      budgetedAmount: job.budgetedAmount || 0,
      contractAmount: job.contractAmount || 0,
      totalLaborHours: 0,
      totalLaborCost: 0,
      budgetedLaborCost: job.budgetedLaborCost || 0,
      totalMaterialCost: 0,
      budgetedMaterialCost: job.budgetedMaterialCost || 0,
      totalPurchases: 0,
      budgetedPurchases: job.budgetedPurchases || 0,
      vendorTransactions: [],
      totalVendorCosts: 0,
      totalCosts: 0,
      profitMargin: 0,
      profitAmount: 0,
      percentComplete: 0,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'Current User'
    };
    
    jobs.push(newJob);
    this.saveJobs(jobs);
    this.logActivity(newJob.jobId, 'Job created', 'status', `Job ${newJob.jobNumber} created`);
    
    return newJob;
  }

  // Update job
  updateJob(jobId: string, updates: Partial<JobFinancialSummary>): void {
    const jobs = this.getAllJobs();
    const index = jobs.findIndex(j => j.jobId === jobId);
    if (index !== -1) {
      jobs[index] = {
        ...jobs[index],
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      this.saveJobs(jobs);
    }
  }

  // Time entries
  addTimeEntry(entry: Omit<TimeEntry, 'id'>): void {
    const timeEntry: TimeEntry = {
      ...entry,
      id: `time_${Date.now()}_${Math.random()}`
    };
    
    const entries = this.getTimeEntries(entry.jobId);
    entries.push(timeEntry);
    this.write(`time_entries_${entry.jobId}`, entries);
    
    // Update job totals
    this.recalculateJobFinancials(entry.jobId);
    this.logActivity(
      entry.jobId,
      'Time entry added',
      'labor',
      `${entry.hours} hours by ${entry.employeeName}`,
      entry.total
    );
  }

  getTimeEntries(jobId: string): TimeEntry[] {
    const data = localStorage.getItem(`time_entries_${jobId}`);
    return data ? JSON.parse(data) : [];
  }

  // Purchase entries
  addPurchase(entry: Omit<PurchaseEntry, 'id'>): void {
    const purchase: PurchaseEntry = {
      ...entry,
      id: `purchase_${Date.now()}_${Math.random()}`
    };
    
    const purchases = this.getPurchases(entry.jobId);
    purchases.push(purchase);
    this.write(`purchases_${entry.jobId}`, purchases);
    
    // Update job totals
    this.recalculateJobFinancials(entry.jobId);
    this.logActivity(
      entry.jobId,
      'Purchase recorded',
      'purchase',
      `${entry.description} from ${entry.vendor}`,
      entry.totalCost
    );
  }

  getPurchases(jobId: string): PurchaseEntry[] {
    const data = localStorage.getItem(`purchases_${jobId}`);
    return data ? JSON.parse(data) : [];
  }

  // Material usage
  addMaterial(entry: Omit<MaterialUsage, 'id'>): void {
    const material: MaterialUsage = {
      ...entry,
      id: `material_${Date.now()}_${Math.random()}`
    };
    
    const materials = this.getMaterials(entry.jobId);
    materials.push(material);
    this.write(`materials_${entry.jobId}`, materials);
    
    // Update job totals
    this.recalculateJobFinancials(entry.jobId);
    this.logActivity(
      entry.jobId,
      'Material used',
      'material',
      `${entry.quantity} ${entry.unit} of ${entry.materialName}`,
      entry.totalCost
    );
  }

  getMaterials(jobId: string): MaterialUsage[] {
    const data = localStorage.getItem(`materials_${jobId}`);
    return data ? JSON.parse(data) : [];
  }

  // Vendor transactions
  addVendorTransaction(transaction: Omit<VendorTransaction, 'id'>): void {
    const job = this.getJob(transaction.jobId);
    if (!job) return;
    
    const newTransaction: VendorTransaction = {
      ...transaction,
      id: `vendor_${Date.now()}_${Math.random()}`
    };
    
    job.vendorTransactions.push(newTransaction);
    this.updateJob(transaction.jobId, { vendorTransactions: job.vendorTransactions });
    this.recalculateJobFinancials(transaction.jobId);
  }

  getVendorTransactions(jobId: string): VendorTransaction[] {
    const job = this.getJob(jobId);
    return job?.vendorTransactions || [];
  }

  // Recalculate financials
  recalculateJobFinancials(jobId: string): void {
    const job = this.getJob(jobId);
    if (!job) return;
    
    const timeEntries = this.getTimeEntries(jobId);
    const purchases = this.getPurchases(jobId);
    const materials = this.getMaterials(jobId);
    
    // Labor totals
    const totalLaborHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
    const totalLaborCost = timeEntries.reduce((sum, e) => sum + e.total, 0);
    
    // Material totals
    const totalMaterialCost = materials.reduce((sum, m) => sum + m.totalCost, 0);
    
    // Purchase totals
    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalCost, 0);
    
    // Vendor totals
    const totalVendorCosts = job.vendorTransactions.reduce((sum, v) => sum + v.amount, 0);
    
    // Total costs
    const totalCosts = totalLaborCost + totalMaterialCost + totalPurchases;
    
    // Profit calculations
    const profitAmount = job.contractAmount - totalCosts;
    const profitMargin = job.contractAmount > 0 ? (profitAmount / job.contractAmount) * 100 : 0;
    
    this.updateJob(jobId, {
      totalLaborHours,
      totalLaborCost,
      totalMaterialCost,
      totalPurchases,
      totalVendorCosts,
      totalCosts,
      profitAmount,
      profitMargin
    });
  }

  // Activity logs
  logActivity(
    jobId: string,
    action: string,
    category: ActivityLog['category'],
    description: string,
    amount?: number,
    metadata?: any
  ): void {
    const logs = this.getActivityLogs(jobId);
    const log: ActivityLog = {
      id: `log_${Date.now()}_${Math.random()}`,
      jobId,
      timestamp: new Date().toISOString(),
      user: 'Current User',
      action,
      category,
      description,
      amount,
      metadata
    };
    
    logs.unshift(log); // Add to beginning
    this.write(`${this.logsKey}_${jobId}`, logs);
  }

  getActivityLogs(jobId: string): ActivityLog[] {
    const data = localStorage.getItem(`${this.logsKey}_${jobId}`);
    return data ? JSON.parse(data) : [];
  }

  // Folders
  createFolder(jobId: string, name: string, description?: string): JobFolder {
    const folders = this.getFolders(jobId);
    const folder: JobFolder = {
      id: `folder_${Date.now()}`,
      jobId,
      name,
      description,
      documents: [],
      createdAt: new Date().toISOString(),
      createdBy: 'Current User'
    };
    
    folders.push(folder);
    this.write(`${this.foldersKey}_${jobId}`, folders);
    
    return folder;
  }

  getFolders(jobId: string): JobFolder[] {
    const data = localStorage.getItem(`${this.foldersKey}_${jobId}`);
    if (data) return JSON.parse(data);
    
    // Create default folders
    const defaultFolders: JobFolder[] = [
      {
        id: 'folder_receipts',
        jobId,
        name: 'Receipts',
        description: 'Purchase receipts and expense documentation',
        documents: [],
        createdAt: new Date().toISOString(),
        createdBy: 'System'
      },
      {
        id: 'folder_timesheets',
        jobId,
        name: 'Timesheets',
        description: 'Employee time tracking records',
        documents: [],
        createdAt: new Date().toISOString(),
        createdBy: 'System'
      },
      {
        id: 'folder_invoices',
        jobId,
        name: 'Invoices',
        description: 'Vendor and supplier invoices',
        documents: [],
        createdAt: new Date().toISOString(),
        createdBy: 'System'
      },
      {
        id: 'folder_reports',
        jobId,
        name: 'Reports',
        description: 'Financial and progress reports',
        documents: [],
        createdAt: new Date().toISOString(),
        createdBy: 'System'
      }
    ];
    
    this.write(`${this.foldersKey}_${jobId}`, defaultFolders);
    return defaultFolders;
  }

  addDocument(jobId: string, folderId: string, document: Omit<JobDocument, 'id'>): void {
    const folders = this.getFolders(jobId);
    const folder = folders.find(f => f.id === folderId);
    
    if (folder) {
      const doc: JobDocument = {
        ...document,
        id: `doc_${Date.now()}_${Math.random()}`
      };
      folder.documents.push(doc);
      this.write(`${this.foldersKey}_${jobId}`, folders);
    }
  }

  // Reports data
  getJobReport(jobId: string): any {
    const job = this.getJob(jobId);
    if (!job) return null;
    
    return {
      summary: job,
      timeEntries: this.getTimeEntries(jobId),
      purchases: this.getPurchases(jobId),
      materials: this.getMaterials(jobId),
      vendorTransactions: this.getVendorTransactions(jobId),
      activityLog: this.getActivityLogs(jobId),
      folders: this.getFolders(jobId)
    };
  }

  // Helper methods
  private saveJobs(jobs: JobFinancialSummary[]): void {
    this.write(this.storageKey, jobs);
  }

  private getDefaultJobs(): JobFinancialSummary[] {
    const defaultJobs: JobFinancialSummary[] = [
      {
        jobId: 'job_1',
        jobNumber: 'JOB-2026-001',
        jobName: 'ABC Corp Office Renovation',
        customer: 'ABC Corporation',
        status: 'active',
        startDate: '2026-02-15',
        estimatedCompletionDate: '2026-03-15',
        budgetedAmount: 25000,
        contractAmount: 25000,
        totalLaborHours: 45.5,
        totalLaborCost: 2275,
        budgetedLaborCost: 5000,
        totalMaterialCost: 3200,
        budgetedMaterialCost: 4000,
        totalPurchases: 1850,
        budgetedPurchases: 2000,
        vendorTransactions: [],
        totalVendorCosts: 0,
        totalCosts: 7325,
        profitMargin: 70.7,
        profitAmount: 17675,
        percentComplete: 35,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'System'
      },
      {
        jobId: 'job_2',
        jobNumber: 'JOB-2026-002',
        jobName: 'Downtown Restaurant HVAC Install',
        customer: 'Downtown Bistro LLC',
        status: 'active',
        startDate: '2026-02-18',
        estimatedCompletionDate: '2026-02-28',
        budgetedAmount: 15000,
        contractAmount: 15000,
        totalLaborHours: 28,
        totalLaborCost: 1680,
        budgetedLaborCost: 3000,
        totalMaterialCost: 5400,
        budgetedMaterialCost: 6000,
        totalPurchases: 850,
        budgetedPurchases: 1000,
        vendorTransactions: [],
        totalVendorCosts: 0,
        totalCosts: 7930,
        profitMargin: 47.1,
        profitAmount: 7070,
        percentComplete: 60,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'System'
      }
    ];
    
    this.saveJobs(defaultJobs);
    return defaultJobs;
  }

  // Populate demo data for a job
  populateDemoData(jobId: string = 'job_1'): void {
    console.log('📊 Populating demo financial data for job:', jobId);

    // Add time entries
    const timeEntries: TimeEntry[] = [
      {
        id: 'time_1',
        jobId,
        employeeId: 'emp_1',
        employeeName: 'John Smith',
        date: '2026-02-15',
        startTime: '08:00',
        endTime: '16:00',
        hours: 8,
        rate: 50,
        total: 400,
        description: 'Demolition and prep work',
        category: 'labor',
        approved: true,
        approvedBy: 'Manager',
        approvedAt: '2026-02-16'
      },
      {
        id: 'time_2',
        jobId,
        employeeId: 'emp_1',
        employeeName: 'John Smith',
        date: '2026-02-16',
        startTime: '08:00',
        endTime: '17:00',
        hours: 9,
        rate: 50,
        total: 450,
        description: 'Framing and drywall installation',
        category: 'labor',
        approved: true,
        approvedBy: 'Manager',
        approvedAt: '2026-02-17'
      },
      {
        id: 'time_3',
        jobId,
        employeeId: 'emp_2',
        employeeName: 'Mike Johnson',
        date: '2026-02-17',
        startTime: '09:00',
        endTime: '18:00',
        hours: 8.5,
        rate: 55,
        total: 467.50,
        description: 'Electrical rough-in',
        category: 'labor',
        approved: true,
        approvedBy: 'Manager',
        approvedAt: '2026-02-18'
      },
      {
        id: 'time_4',
        jobId,
        employeeId: 'emp_3',
        employeeName: 'Sarah Davis',
        date: '2026-02-18',
        startTime: '08:30',
        endTime: '16:30',
        hours: 8,
        rate: 45,
        total: 360,
        description: 'Painting and finishing',
        category: 'labor',
        approved: false
      },
      {
        id: 'time_5',
        jobId,
        employeeId: 'emp_1',
        employeeName: 'John Smith',
        date: '2026-02-19',
        startTime: '08:00',
        endTime: '20:00',
        hours: 12,
        rate: 75,
        total: 900,
        description: 'Weekend overtime - Final installation',
        category: 'overtime',
        approved: true,
        approvedBy: 'Manager',
        approvedAt: '2026-02-20'
      }
    ];
    this.write(`time_entries_${jobId}`, timeEntries);

    // Add purchase entries with receipts
    const purchases: PurchaseEntry[] = [
      {
        id: 'purchase_1',
        jobId,
        date: '2026-02-15',
        vendor: 'Home Depot',
        vendorId: 'vendor_hd',
        category: 'Materials',
        description: 'Lumber and framing materials',
        quantity: 1,
        unitCost: 850,
        totalCost: 850,
        receiptUrl: '/receipts/hd_feb15.pdf',
        invoiceNumber: 'HD-2026-0215',
        paymentMethod: 'Company Card',
        paidBy: 'John Smith',
        approved: true,
        approvedBy: 'Manager',
        approvedAt: '2026-02-16'
      },
      {
        id: 'purchase_2',
        jobId,
        date: '2026-02-16',
        vendor: 'Electrical Supply Co',
        vendorId: 'vendor_esc',
        category: 'Electrical',
        description: 'Wire, conduit, and electrical boxes',
        quantity: 1,
        unitCost: 425,
        totalCost: 425,
        receiptUrl: '/receipts/esc_feb16.pdf',
        invoiceNumber: 'ESC-45678',
        paymentMethod: 'Company Card',
        paidBy: 'Mike Johnson',
        approved: true,
        approvedBy: 'Manager',
        approvedAt: '2026-02-17'
      },
      {
        id: 'purchase_3',
        jobId,
        date: '2026-02-17',
        vendor: 'Paint Supply Plus',
        vendorId: 'vendor_psp',
        category: 'Paint',
        description: 'Interior paint and supplies',
        quantity: 15,
        unitCost: 45,
        totalCost: 675,
        receiptUrl: '/receipts/psp_feb17.pdf',
        invoiceNumber: 'PSP-2026-1234',
        paymentMethod: 'Cash',
        paidBy: 'Sarah Davis',
        approved: true,
        approvedBy: 'Manager',
        approvedAt: '2026-02-18'
      },
      {
        id: 'purchase_4',
        jobId,
        date: '2026-02-18',
        vendor: 'Hardware Store',
        vendorId: 'vendor_hw',
        category: 'Hardware',
        description: 'Door hardware, hinges, and fasteners',
        quantity: 1,
        unitCost: 320,
        totalCost: 320,
        invoiceNumber: 'HW-8901',
        paymentMethod: 'Company Card',
        paidBy: 'John Smith',
        approved: false
      },
      {
        id: 'purchase_5',
        jobId,
        date: '2026-02-19',
        vendor: 'Tool Rental Center',
        vendorId: 'vendor_trc',
        category: 'Equipment Rental',
        description: 'Lift rental for ceiling work',
        quantity: 2,
        unitCost: 125,
        totalCost: 250,
        receiptUrl: '/receipts/trc_feb19.pdf',
        invoiceNumber: 'TRC-2026-567',
        paymentMethod: 'Company Check',
        paidBy: 'John Smith',
        approved: true,
        approvedBy: 'Manager',
        approvedAt: '2026-02-20'
      }
    ];
    this.write(`purchases_${jobId}`, purchases);

    // Add material usage
    const materials: MaterialUsage[] = [
      {
        id: 'material_1',
        jobId,
        date: '2026-02-15',
        materialId: 'mat_001',
        materialName: '2x4x8 Lumber',
        vendor: 'Home Depot',
        vendorId: 'vendor_hd',
        quantity: 50,
        unit: 'pieces',
        unitCost: 4.50,
        totalCost: 225,
        category: 'Framing',
        usedBy: 'John Smith',
        notes: 'Wall framing'
      },
      {
        id: 'material_2',
        jobId,
        date: '2026-02-16',
        materialId: 'mat_002',
        materialName: 'Drywall 4x8 sheets',
        vendor: 'Home Depot',
        vendorId: 'vendor_hd',
        quantity: 30,
        unit: 'sheets',
        unitCost: 12,
        totalCost: 360,
        category: 'Drywall',
        usedBy: 'John Smith',
        notes: 'Wall covering'
      },
      {
        id: 'material_3',
        jobId,
        date: '2026-02-17',
        materialId: 'mat_003',
        materialName: '12/2 Romex Wire',
        vendor: 'Electrical Supply Co',
        vendorId: 'vendor_esc',
        quantity: 250,
        unit: 'feet',
        unitCost: 0.85,
        totalCost: 212.50,
        category: 'Electrical',
        usedBy: 'Mike Johnson',
        notes: 'Electrical rough-in'
      }
    ];
    this.write(`materials_${jobId}`, materials);

    // Add activity logs
    const activityLogs: ActivityLog[] = [
      {
        id: 'log_1',
        jobId,
        timestamp: '2026-02-15T08:00:00Z',
        user: 'System',
        action: 'Job started',
        category: 'status',
        description: 'ABC Corp Office Renovation project started'
      },
      {
        id: 'log_2',
        jobId,
        timestamp: '2026-02-15T08:30:00Z',
        user: 'John Smith',
        action: 'Time entry added',
        category: 'labor',
        description: '8 hours of labor',
        amount: 400
      },
      {
        id: 'log_3',
        jobId,
        timestamp: '2026-02-15T14:20:00Z',
        user: 'John Smith',
        action: 'Purchase recorded',
        category: 'purchase',
        description: 'Lumber and framing materials from Home Depot',
        amount: 850
      },
      {
        id: 'log_4',
        jobId,
        timestamp: '2026-02-16T09:15:00Z',
        user: 'Manager',
        action: 'Approved time entry',
        category: 'labor',
        description: 'Approved John Smith time entry for 2026-02-15'
      },
      {
        id: 'log_5',
        jobId,
        timestamp: '2026-02-17T11:30:00Z',
        user: 'Mike Johnson',
        action: 'Material used',
        category: 'material',
        description: '250 feet of 12/2 Romex Wire',
        amount: 212.50
      }
    ];
    const existingLogs = this.getActivityLogs(jobId);
    this.write(this.logsKey, [...existingLogs, ...activityLogs]);

    // Recalculate totals
    this.recalculateJobFinancials(jobId);

    console.log('✅ Demo data populated successfully');
  }
}

export const jobFinancialService = new JobFinancialService();
