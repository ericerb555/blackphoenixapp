/**
 * Admin Alerts Utility
 *
 * Manages admin alerts for:
 * - New work requests
 * - Quote approvals
 * - System notifications
 * - User actions
 */

export interface AdminAlert {
  id: string;
  type: 'approval' | 'error' | 'warning' | 'info' | 'urgent' | 'pending';
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
 * Add a new admin alert
 */
export function addAdminAlert(alert: Omit<AdminAlert, 'id' | 'timestamp' | 'status'>): AdminAlert {
  // Get existing alerts
  const existingData = localStorage.getItem('admin_alerts');
  const alerts: AdminAlert[] = existingData ? JSON.parse(existingData) : [];

  // Create new alert
  const newAlert: AdminAlert = {
    ...alert,
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    status: 'unread'
  };

  // Add to beginning of array (newest first)
  alerts.unshift(newAlert);

  // Keep only last 100 alerts
  if (alerts.length > 100) {
    alerts.splice(100);
  }

  // Save to localStorage
  localStorage.setItem('admin_alerts', JSON.stringify(alerts));

  // Dispatch event for real-time updates
  window.dispatchEvent(new CustomEvent('admin-alert-added', { detail: newAlert }));

  console.log('✅ [AdminAlerts] New alert created:', newAlert.title);

  return newAlert;
}

/**
 * Create alert for new work request
 */
export function createWorkRequestAlert(workRequest: {
  id: string;
  requestNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: string;
  title: string;
  description: string;
  location: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  preferredDate?: string;
}): AdminAlert {
  const urgencyToPriority: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
    'emergency': 'critical',
    'high': 'high',
    'medium': 'medium',
    'low': 'low'
  };

  // Extract budget from description if present
  const budgetMatch = workRequest.description.match(/\$[\d,]+\s*-\s*\$[\d,]+/);
  const budgetString = budgetMatch ? budgetMatch[0] : '';

  const alert = addAdminAlert({
    type: workRequest.urgency === 'emergency' ? 'urgent' : 'pending',
    category: 'Work Requests',
    title: `NEW: ${workRequest.serviceType} - ${workRequest.customerName}`,
    description: `New work request from ${workRequest.customerName}. ${budgetString ? `Budget: ${budgetString}. ` : ''}${workRequest.title}. Location: ${workRequest.location}. Status: Awaiting review.`,
    priority: urgencyToPriority[workRequest.urgency] || 'medium',
    source: 'Work Request System',
    userId: workRequest.id,
    userName: workRequest.customerName,
    actionRequired: true,
    data: {
      workRequestId: workRequest.id,
      requestNumber: workRequest.requestNumber,
      serviceType: workRequest.serviceType,
      title: workRequest.title,
      customerName: workRequest.customerName,
      customerEmail: workRequest.customerEmail,
      customerPhone: workRequest.customerPhone,
      location: workRequest.location,
      urgency: workRequest.urgency,
      description: workRequest.description,
      preferredDate: workRequest.preferredDate
    }
  });

  return alert;
}

/**
 * Create alert for quote approval
 */
export function createQuoteApprovalAlert(quote: {
  id: string;
  quoteNumber: string;
  customerName: string;
  serviceType: string;
  totalCost: number;
  assignedTo?: string;
}): AdminAlert {
  const alert = addAdminAlert({
    type: 'approval',
    category: 'Quotes',
    title: `Quote Approval Required - $${quote.totalCost.toLocaleString()}`,
    description: `Quote ${quote.quoteNumber} for ${quote.customerName} (${quote.serviceType}) requires admin approval before sending to customer.`,
    priority: quote.totalCost > 50000 ? 'critical' : 'high',
    source: 'Quote System',
    userId: quote.id,
    userName: quote.customerName,
    actionRequired: true,
    data: {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      serviceType: quote.serviceType,
      amount: quote.totalCost,
      assignedTo: quote.assignedTo
    }
  });

  return alert;
}

/**
 * Get all admin alerts
 */
export function getAdminAlerts(): AdminAlert[] {
  const existingData = localStorage.getItem('admin_alerts');
  return existingData ? JSON.parse(existingData) : [];
}

/**
 * Update alert status
 */
export function updateAlertStatus(alertId: string, status: 'unread' | 'read' | 'handled' | 'dismissed'): void {
  const alerts = getAdminAlerts();
  const alertIndex = alerts.findIndex(a => a.id === alertId);

  if (alertIndex >= 0) {
    alerts[alertIndex].status = status;
    localStorage.setItem('admin_alerts', JSON.stringify(alerts));
    window.dispatchEvent(new Event('admin-alerts-updated'));
    console.log(`✅ [AdminAlerts] Alert ${alertId} status updated to: ${status}`);
  }
}

/**
 * Delete alert
 */
export function deleteAlert(alertId: string): void {
  const alerts = getAdminAlerts();
  const filtered = alerts.filter(a => a.id !== alertId);
  localStorage.setItem('admin_alerts', JSON.stringify(filtered));
  window.dispatchEvent(new Event('admin-alerts-updated'));
  console.log(`🗑️ [AdminAlerts] Alert ${alertId} deleted`);
}

/**
 * Get unread count
 */
export function getUnreadAlertsCount(): number {
  const alerts = getAdminAlerts();
  return alerts.filter(a => a.status === 'unread').length;
}
