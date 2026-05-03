/**
 * Admin Alert Helper
 * 
 * Utility functions for creating and managing admin alerts
 */

export interface AdminAlert {
  id: string;
  type: 'approval' | 'error' | 'warning' | 'info' | 'urgent' | 'pending' | 'scheduling';
  category: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'unread' | 'read' | 'handled' | 'dismissed';
  timestamp: Date;
  source: string;
  userId?: string;
  userName?: string;
  actionRequired: boolean;
  data?: any;
}

/**
 * Create an approved quote alert
 */
export function createApprovedQuoteAlert(quoteData: {
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  projectTitle: string;
  totalCost: number;
  approvedAt: string;
}): AdminAlert {
  return {
    id: `quote-approved-${Date.now()}`,
    type: 'approval',
    category: 'Quote Approval',
    title: `Quote ${quoteData.quoteNumber} Approved`,
    description: `${quoteData.customerName} has approved quote ${quoteData.quoteNumber} for "${quoteData.projectTitle}". Total value: $${quoteData.totalCost.toLocaleString()}. Ready to generate contract.`,
    priority: 'high',
    status: 'unread',
    timestamp: new Date(),
    source: 'Customer Portal',
    userId: quoteData.customerEmail,
    userName: quoteData.customerName,
    actionRequired: true,
    data: {
      quoteNumber: quoteData.quoteNumber,
      customerName: quoteData.customerName,
      customerEmail: quoteData.customerEmail,
      projectTitle: quoteData.projectTitle,
      totalCost: quoteData.totalCost,
      approvedAt: quoteData.approvedAt,
      contractReady: true
    }
  };
}

/**
 * Add alert to localStorage
 */
export function addAdminAlert(alert: AdminAlert): void {
  const alerts = JSON.parse(localStorage.getItem('adminAlerts') || '[]');
  alerts.unshift(alert);
  localStorage.setItem('adminAlerts', JSON.stringify(alerts));
}

/**
 * Send approved quote notification
 */
export function sendApprovedQuoteNotification(quoteData: {
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  projectTitle: string;
  totalCost: number;
  approvedAt: string;
}): void {
  const alert = createApprovedQuoteAlert(quoteData);
  addAdminAlert(alert);
}

/**
 * Create a contract signed + deposit received alert for scheduling
 */
export function createContractSignedDepositReceivedAlert(contractData: {
  contractNumber: string;
  customerName: string;
  customerEmail: string;
  projectTitle: string;
  totalAmount: number;
  depositAmount: number;
  startDate: string;
  completionDate: string;
  signedDate: string;
  depositReceivedDate: string;
}): AdminAlert {
  return {
    id: `contract-deposit-${Date.now()}`,
    type: 'scheduling',
    category: 'Scheduling Required',
    title: `🎯 Ready to Schedule: ${contractData.projectTitle}`,
    description: `Contract ${contractData.contractNumber} has been signed and deposit of $${contractData.depositAmount.toLocaleString()} has been received from ${contractData.customerName}. Project ready for scheduling and work assignment.`,
    priority: 'critical',
    status: 'unread',
    timestamp: new Date(),
    source: 'Contract & Payment System',
    userId: contractData.customerEmail,
    userName: contractData.customerName,
    actionRequired: true,
    data: {
      contractNumber: contractData.contractNumber,
      customerName: contractData.customerName,
      customerEmail: contractData.customerEmail,
      projectTitle: contractData.projectTitle,
      totalAmount: contractData.totalAmount,
      depositAmount: contractData.depositAmount,
      startDate: contractData.startDate,
      completionDate: contractData.completionDate,
      signedDate: contractData.signedDate,
      depositReceivedDate: contractData.depositReceivedDate,
      schedulingRequired: true,
      workAssignmentNeeded: true
    }
  };
}

/**
 * Send contract signed + deposit received notification
 */
export function sendContractSignedDepositReceivedNotification(contractData: {
  contractNumber: string;
  customerName: string;
  customerEmail: string;
  projectTitle: string;
  totalAmount: number;
  depositAmount: number;
  startDate: string;
  completionDate: string;
  signedDate: string;
  depositReceivedDate: string;
}): void {
  const alert = createContractSignedDepositReceivedAlert(contractData);
  addAdminAlert(alert);
  
  // Log to console for debugging
  console.log('🎯 Contract Signed + Deposit Received - Scheduling Alert Created:', {
    contractNumber: contractData.contractNumber,
    customer: contractData.customerName,
    project: contractData.projectTitle,
    deposit: contractData.depositAmount,
    alertId: alert.id
  });
}