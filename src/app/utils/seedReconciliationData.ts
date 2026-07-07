/**
 * Seed Reconciliation Data
 * Creates sample bank transactions, matches, periods, and discrepancies for testing
 */

import { reconciliationService } from '../lib/services/reconciliationService';

export function seedReconciliationData(companyId: string = 'default') {
  console.log('🌱 [Seed] Creating sample reconciliation data...');

  try {
    // Create sample transactions
    const transactions = [
      {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Customer Payment - Invoice #1234',
        amount: 5000,
        type: 'deposit' as const,
        reference: 'CHK-001',
        bankAccount: 'Business Checking ***1234',
        category: 'Revenue',
      },
      {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Materials Purchase - Home Depot',
        amount: -1250.50,
        type: 'withdrawal' as const,
        reference: 'DEBIT-002',
        bankAccount: 'Business Checking ***1234',
        category: 'Materials',
      },
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Payroll Deposit',
        amount: -3200,
        type: 'withdrawal' as const,
        reference: 'PAYROLL-001',
        bankAccount: 'Business Checking ***1234',
        category: 'Payroll',
      },
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Customer Payment - Invoice #1235',
        amount: 8500,
        type: 'deposit' as const,
        reference: 'CHK-002',
        bankAccount: 'Business Checking ***1234',
        category: 'Revenue',
      },
      {
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Subcontractor Payment',
        amount: -2500,
        type: 'withdrawal' as const,
        reference: 'DEBIT-003',
        bankAccount: 'Business Checking ***1234',
        category: 'Subcontractor',
      },
      {
        date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Equipment Rental',
        amount: -450,
        type: 'withdrawal' as const,
        reference: 'DEBIT-004',
        bankAccount: 'Business Checking ***1234',
        category: 'Equipment',
      },
      {
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Customer Payment - Invoice #1230',
        amount: 12000,
        type: 'deposit' as const,
        reference: 'WIRE-001',
        bankAccount: 'Business Checking ***1234',
        category: 'Revenue',
      },
      {
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Bank Service Fee',
        amount: -35,
        type: 'fee' as const,
        reference: 'FEE-001',
        bankAccount: 'Business Checking ***1234',
        category: 'Banking Fees',
      },
      {
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Office Supplies - Staples',
        amount: -245.75,
        type: 'withdrawal' as const,
        reference: 'DEBIT-005',
        bankAccount: 'Business Checking ***1234',
        category: 'Office Supplies',
      },
      {
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Customer Deposit - Project #456',
        amount: 15000,
        type: 'deposit' as const,
        reference: 'WIRE-002',
        bankAccount: 'Business Checking ***1234',
        category: 'Revenue',
      },
    ];

    // Add transactions
    transactions.forEach(txn => {
      reconciliationService.addTransaction(
        companyId,
        txn.date,
        txn.description,
        txn.amount,
        txn.type,
        txn.reference,
        txn.bankAccount,
        txn.category
      );
    });

    console.log(`✅ [Seed] Created ${transactions.length} sample transactions`);

    // Get the created transactions
    const createdTransactions = reconciliationService.getTransactionsByCompany(companyId);

    // Mark some as reconciled
    if (createdTransactions.length >= 5) {
      // Reconcile first 3 transactions
      for (let i = 0; i < 3; i++) {
        reconciliationService.createMatch(
          createdTransactions[i].id,
          `invoice_${i + 1}`,
          null,
          'exact',
          100,
          Math.abs(createdTransactions[i].amount),
          0,
          'system_auto'
        );
      }
      console.log('✅ [Seed] Created 3 reconciliation matches');
    }

    // Create a reconciliation period
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();
    
    const period = reconciliationService.createPeriod(
      companyId,
      startDate,
      endDate,
      50000, // opening balance
      65000  // closing balance (expected)
    );
    console.log('✅ [Seed] Created reconciliation period:', period.id);

    // Create some sample discrepancies
    const discrepancies = [
      {
        type: 'amount-mismatch' as const,
        severity: 'medium' as const,
        amount: 50.25,
        description: 'Invoice #1234 payment amount differs from bank deposit by $50.25',
        transactionId: createdTransactions[0]?.id,
        invoiceId: 'invoice_1234',
      },
      {
        type: 'missing-transaction' as const,
        severity: 'high' as const,
        amount: 1200,
        description: 'Invoice #1240 marked as paid but no matching bank transaction found',
        invoiceId: 'invoice_1240',
      },
      {
        type: 'timing' as const,
        severity: 'low' as const,
        amount: 300,
        description: 'Payment received on different date than recorded in system',
        transactionId: createdTransactions[1]?.id,
      },
    ];

    discrepancies.forEach(disc => {
      reconciliationService.createDiscrepancy(
        companyId,
        disc.type,
        disc.severity,
        disc.amount,
        disc.description,
        disc.transactionId,
        disc.invoiceId
      );
    });

    console.log(`✅ [Seed] Created ${discrepancies.length} sample discrepancies`);

    // Log summary
    const stats = reconciliationService.getReconciliationStats(companyId);
    console.log('📊 [Seed] Reconciliation Summary:', {
      totalTransactions: stats.totalTransactions,
      reconciledCount: stats.reconciledCount,
      unreconciledCount: stats.unreconciledCount,
      reconciliationRate: stats.reconciliationRate.toFixed(1) + '%',
      openDiscrepancies: stats.openDiscrepancies,
    });

    return {
      success: true,
      message: 'Sample reconciliation data created successfully',
      stats,
    };
  } catch (error) {
    console.error('❌ [Seed] Error creating reconciliation data:', error);
    return {
      success: false,
      message: 'Failed to create sample data',
      error,
    };
  }
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).seedReconciliationData = seedReconciliationData;
  console.log('🌱 [Seed] Reconciliation data seeder available: run seedReconciliationData() in console');
}
