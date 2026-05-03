/**
 * Financial Reconciliation Service
 * Handles payment reconciliation, bank matching, and discrepancy detection
 */

export interface BankTransaction {
  id: string;
  companyId: string;
  date: string;
  description: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'fee';
  reference: string;
  category?: string;
  
  // Reconciliation
  isReconciled: boolean;
  reconciledDate?: string;
  reconciledBy?: string;
  matchedInvoiceId?: string;
  matchedPaymentId?: string;
  
  // Bank info
  bankAccount: string;
  bankName?: string;
  checkNumber?: string;
  
  // Metadata
  importedDate: string;
  notes?: string;
}

export interface ReconciliationMatch {
  id: string;
  companyId: string;
  transactionId: string;
  invoiceId?: string;
  paymentId?: string;
  matchType: 'exact' | 'partial' | 'manual' | 'suggested';
  matchConfidence: number; // 0-100
  matchedAmount: number;
  differenceAmount: number;
  status: 'matched' | 'pending' | 'discrepancy' | 'ignored';
  matchedDate: string;
  matchedBy: string;
  notes?: string;
}

export interface ReconciliationPeriod {
  id: string;
  companyId: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'in-progress' | 'completed' | 'locked';
  
  // Balances
  openingBalance: number;
  closingBalance: number;
  bankBalance: number;
  bookBalance: number;
  difference: number;
  
  // Counts
  totalTransactions: number;
  reconciledTransactions: number;
  unmatchedTransactions: number;
  discrepancies: number;
  
  // Metadata
  createdDate: string;
  completedDate?: string;
  completedBy?: string;
  notes?: string;
}

export interface ReconciliationDiscrepancy {
  id: string;
  companyId: string;
  type: 'missing-transaction' | 'amount-mismatch' | 'duplicate' | 'timing' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  amount: number;
  description: string;
  transactionId?: string;
  invoiceId?: string;
  status: 'open' | 'investigating' | 'resolved' | 'accepted';
  detectedDate: string;
  resolvedDate?: string;
  resolvedBy?: string;
  resolution?: string;
}

class ReconciliationService {
  private transactionsKey = 'bank_transactions';
  private matchesKey = 'reconciliation_matches';
  private periodsKey = 'reconciliation_periods';
  private discrepanciesKey = 'reconciliation_discrepancies';

  // Get all transactions
  getAllTransactions(): BankTransaction[] {
    const data = localStorage.getItem(this.transactionsKey);
    return data ? JSON.parse(data) : [];
  }

  // Get transactions by company
  getTransactionsByCompany(companyId: string): BankTransaction[] {
    return this.getAllTransactions().filter(t => t.companyId === companyId);
  }

  // Get unreconciled transactions
  getUnreconciledTransactions(companyId: string): BankTransaction[] {
    return this.getTransactionsByCompany(companyId).filter(t => !t.isReconciled);
  }

  // Get transactions by date range
  getTransactionsByDateRange(companyId: string, startDate: string, endDate: string): BankTransaction[] {
    return this.getTransactionsByCompany(companyId).filter(t => 
      t.date >= startDate && t.date <= endDate
    );
  }

  // Add bank transaction
  addTransaction(transaction: Omit<BankTransaction, 'id' | 'importedDate' | 'isReconciled'>): BankTransaction {
    const transactions = this.getAllTransactions();
    
    const newTransaction: BankTransaction = {
      ...transaction,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      importedDate: new Date().toISOString(),
      isReconciled: false
    };
    
    transactions.push(newTransaction);
    this.saveTransactions(transactions);
    
    // Auto-match if possible
    this.autoMatch(newTransaction);
    
    return newTransaction;
  }

  // Import multiple transactions
  importTransactions(companyId: string, transactions: any[]): number {
    let imported = 0;
    
    transactions.forEach(txn => {
      // Check for duplicates
      const exists = this.getAllTransactions().some(t => 
        t.companyId === companyId &&
        t.date === txn.date &&
        t.amount === txn.amount &&
        t.description === txn.description
      );
      
      if (!exists) {
        this.addTransaction({
          companyId,
          date: txn.date,
          description: txn.description,
          amount: txn.amount,
          type: txn.type || 'deposit',
          reference: txn.reference || '',
          bankAccount: txn.bankAccount || 'main',
          bankName: txn.bankName
        });
        imported++;
      }
    });
    
    return imported;
  }

  // Auto-match transaction with invoice
  autoMatch(transaction: BankTransaction): ReconciliationMatch | null {
    // Get invoices from invoicing service
    const invoicesData = localStorage.getItem('enterprise_invoices');
    if (!invoicesData) return null;
    
    const invoices = JSON.parse(invoicesData);
    const companyInvoices = invoices.filter((inv: any) => 
      inv.companyId === transaction.companyId && 
      inv.status !== 'paid' && 
      inv.status !== 'void'
    );
    
    // Try to find exact match
    const exactMatch = companyInvoices.find((inv: any) => 
      Math.abs(inv.balanceDue - transaction.amount) < 0.01
    );
    
    if (exactMatch) {
      return this.createMatch(
        transaction.id,
        exactMatch.id,
        exactMatch.payments[0]?.id,
        'exact',
        100,
        transaction.amount,
        0,
        'auto'
      );
    }
    
    // Try to find close match (within 5%)
    const closeMatch = companyInvoices.find((inv: any) => {
      const diff = Math.abs(inv.balanceDue - transaction.amount);
      const percentage = (diff / inv.balanceDue) * 100;
      return percentage <= 5;
    });
    
    if (closeMatch) {
      const diff = closeMatch.balanceDue - transaction.amount;
      return this.createMatch(
        transaction.id,
        closeMatch.id,
        null,
        'suggested',
        85,
        transaction.amount,
        diff,
        'auto'
      );
    }
    
    return null;
  }

  // Create manual match
  createMatch(
    transactionId: string,
    invoiceId: string | null,
    paymentId: string | null,
    matchType: ReconciliationMatch['matchType'],
    confidence: number,
    amount: number,
    difference: number,
    matchedBy: string
  ): ReconciliationMatch {
    const matches = this.getAllMatches();
    const transactions = this.getAllTransactions();
    const transaction = transactions.find(t => t.id === transactionId);
    
    const match: ReconciliationMatch = {
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId: transaction?.companyId || '',
      transactionId,
      invoiceId: invoiceId || undefined,
      paymentId: paymentId || undefined,
      matchType,
      matchConfidence: confidence,
      matchedAmount: amount,
      differenceAmount: difference,
      status: Math.abs(difference) < 0.01 ? 'matched' : 'discrepancy',
      matchedDate: new Date().toISOString(),
      matchedBy
    };
    
    matches.push(match);
    this.saveMatches(matches);
    
    // Update transaction
    if (transaction) {
      transaction.isReconciled = true;
      transaction.reconciledDate = match.matchedDate;
      transaction.reconciledBy = matchedBy;
      transaction.matchedInvoiceId = invoiceId || undefined;
      transaction.matchedPaymentId = paymentId || undefined;
      this.saveTransactions(transactions);
    }
    
    // Create discrepancy if needed
    if (Math.abs(difference) >= 0.01) {
      this.createDiscrepancy(
        transaction?.companyId || '',
        'amount-mismatch',
        'medium',
        difference,
        `Amount mismatch: Transaction $${amount.toFixed(2)} vs Expected $${(amount + difference).toFixed(2)}`,
        transactionId,
        invoiceId || undefined
      );
    }
    
    return match;
  }

  // Unmatch transaction
  unmatch(transactionId: string): void {
    const matches = this.getAllMatches();
    const match = matches.find(m => m.transactionId === transactionId);
    
    if (match) {
      // Remove match
      const filteredMatches = matches.filter(m => m.id !== match.id);
      this.saveMatches(filteredMatches);
      
      // Update transaction
      const transactions = this.getAllTransactions();
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction) {
        transaction.isReconciled = false;
        transaction.reconciledDate = undefined;
        transaction.reconciledBy = undefined;
        transaction.matchedInvoiceId = undefined;
        transaction.matchedPaymentId = undefined;
        this.saveTransactions(transactions);
      }
    }
  }

  // Get matches
  getAllMatches(): ReconciliationMatch[] {
    const data = localStorage.getItem(this.matchesKey);
    return data ? JSON.parse(data) : [];
  }

  // Get matches by company
  getMatchesByCompany(companyId: string): ReconciliationMatch[] {
    return this.getAllMatches().filter(m => m.companyId === companyId);
  }

  // Create reconciliation period
  createPeriod(
    companyId: string,
    startDate: string,
    endDate: string,
    openingBalance: number,
    closingBalance: number
  ): ReconciliationPeriod {
    const periods = this.getAllPeriods();
    const transactions = this.getTransactionsByDateRange(companyId, startDate, endDate);
    
    const reconciled = transactions.filter(t => t.isReconciled).length;
    const unmatched = transactions.filter(t => !t.isReconciled).length;
    
    // Calculate book balance from transactions
    const bookBalance = transactions.reduce((sum, t) => 
      sum + (t.type === 'deposit' ? t.amount : -t.amount), openingBalance
    );
    
    const period: ReconciliationPeriod = {
      id: `period_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId,
      startDate,
      endDate,
      status: 'open',
      openingBalance,
      closingBalance,
      bankBalance: closingBalance,
      bookBalance,
      difference: closingBalance - bookBalance,
      totalTransactions: transactions.length,
      reconciledTransactions: reconciled,
      unmatchedTransactions: unmatched,
      discrepancies: 0,
      createdDate: new Date().toISOString()
    };
    
    periods.push(period);
    this.savePeriods(periods);
    
    return period;
  }

  // Get periods
  getAllPeriods(): ReconciliationPeriod[] {
    const data = localStorage.getItem(this.periodsKey);
    return data ? JSON.parse(data) : [];
  }

  // Get periods by company
  getPeriodsByCompany(companyId: string): ReconciliationPeriod[] {
    return this.getAllPeriods().filter(p => p.companyId === companyId);
  }

  // Complete period
  completePeriod(periodId: string, completedBy: string): void {
    const periods = this.getAllPeriods();
    const period = periods.find(p => p.id === periodId);
    
    if (period) {
      period.status = 'completed';
      period.completedDate = new Date().toISOString();
      period.completedBy = completedBy;
      this.savePeriods(periods);
    }
  }

  // Create discrepancy
  createDiscrepancy(
    companyId: string,
    type: ReconciliationDiscrepancy['type'],
    severity: ReconciliationDiscrepancy['severity'],
    amount: number,
    description: string,
    transactionId?: string,
    invoiceId?: string
  ): ReconciliationDiscrepancy {
    const discrepancies = this.getAllDiscrepancies();
    
    const discrepancy: ReconciliationDiscrepancy = {
      id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId,
      type,
      severity,
      amount,
      description,
      transactionId,
      invoiceId,
      status: 'open',
      detectedDate: new Date().toISOString()
    };
    
    discrepancies.push(discrepancy);
    this.saveDiscrepancies(discrepancies);
    
    return discrepancy;
  }

  // Get discrepancies
  getAllDiscrepancies(): ReconciliationDiscrepancy[] {
    const data = localStorage.getItem(this.discrepanciesKey);
    return data ? JSON.parse(data) : [];
  }

  // Get discrepancies by company
  getDiscrepanciesByCompany(companyId: string): ReconciliationDiscrepancy[] {
    return this.getAllDiscrepancies().filter(d => d.companyId === companyId);
  }

  // Get open discrepancies
  getOpenDiscrepancies(companyId: string): ReconciliationDiscrepancy[] {
    return this.getDiscrepanciesByCompany(companyId).filter(d => d.status === 'open');
  }

  // Resolve discrepancy
  resolveDiscrepancy(discrepancyId: string, resolution: string, resolvedBy: string): void {
    const discrepancies = this.getAllDiscrepancies();
    const discrepancy = discrepancies.find(d => d.id === discrepancyId);
    
    if (discrepancy) {
      discrepancy.status = 'resolved';
      discrepancy.resolution = resolution;
      discrepancy.resolvedDate = new Date().toISOString();
      discrepancy.resolvedBy = resolvedBy;
      this.saveDiscrepancies(discrepancies);
    }
  }

  // Get reconciliation stats
  getReconciliationStats(companyId: string) {
    const transactions = this.getTransactionsByCompany(companyId);
    const matches = this.getMatchesByCompany(companyId);
    const discrepancies = this.getDiscrepanciesByCompany(companyId);
    
    const totalTransactions = transactions.length;
    const reconciledCount = transactions.filter(t => t.isReconciled).length;
    const unreconciledCount = totalTransactions - reconciledCount;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const reconciledAmount = transactions.filter(t => t.isReconciled).reduce((sum, t) => sum + t.amount, 0);
    const unreconciledAmount = totalAmount - reconciledAmount;
    
    const openDiscrepancies = discrepancies.filter(d => d.status === 'open').length;
    const totalDiscrepancyAmount = discrepancies.reduce((sum, d) => sum + Math.abs(d.amount), 0);
    
    const reconciliationRate = totalTransactions > 0 ? (reconciledCount / totalTransactions) * 100 : 0;
    
    return {
      totalTransactions,
      reconciledCount,
      unreconciledCount,
      totalAmount,
      reconciledAmount,
      unreconciledAmount,
      openDiscrepancies,
      totalDiscrepancyAmount,
      reconciliationRate,
      matchCount: matches.length
    };
  }

  // Save functions
  private saveTransactions(transactions: BankTransaction[]): void {
    localStorage.setItem(this.transactionsKey, JSON.stringify(transactions));
  }

  private saveMatches(matches: ReconciliationMatch[]): void {
    localStorage.setItem(this.matchesKey, JSON.stringify(matches));
  }

  private savePeriods(periods: ReconciliationPeriod[]): void {
    localStorage.setItem(this.periodsKey, JSON.stringify(periods));
  }

  private saveDiscrepancies(discrepancies: ReconciliationDiscrepancy[]): void {
    localStorage.setItem(this.discrepanciesKey, JSON.stringify(discrepancies));
  }
}

export const reconciliationService = new ReconciliationService();
