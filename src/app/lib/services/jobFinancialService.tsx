/**
 * Job Financial Service
 * Real-time tracking of hours, purchases, materials, and vendors per job
 */

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
    localStorage.setItem(`time_entries_${entry.jobId}`, JSON.stringify(entries));
    
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
    localStorage.setItem(`purchases_${entry.jobId}`, JSON.stringify(purchases));
    
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
    localStorage.setItem(`materials_${entry.jobId}`, JSON.stringify(materials));
    
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
    localStorage.setItem(`${this.logsKey}_${jobId}`, JSON.stringify(logs));
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
    localStorage.setItem(`${this.foldersKey}_${jobId}`, JSON.stringify(folders));
    
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
    
    localStorage.setItem(`${this.foldersKey}_${jobId}`, JSON.stringify(defaultFolders));
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
      localStorage.setItem(`${this.foldersKey}_${jobId}`, JSON.stringify(folders));
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
    localStorage.setItem(this.storageKey, JSON.stringify(jobs));
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
}

export const jobFinancialService = new JobFinancialService();
