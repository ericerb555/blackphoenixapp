/**
 * Generate Work Order Completion Report Data
 * Creates comprehensive report when invoice is paid
 */

export function generateCompletionReportData(workOrderId: string) {
  // Get work order data from localStorage or API
  const workOrders = JSON.parse(localStorage.getItem('pipeline_items') || '[]');
  const workOrder = workOrders.find((wo: any) => wo.id === workOrderId);
  
  if (!workOrder) {
    console.error('Work order not found:', workOrderId);
    return null;
  }

  // Get associated receipts
  const receipts = JSON.parse(localStorage.getItem(`receipts_${workOrderId}`) || '[]');
  
  // Get labor entries
  const laborEntries = JSON.parse(localStorage.getItem(`labor_${workOrderId}`) || '[]');
  
  // Get change orders
  const changeOrders = JSON.parse(localStorage.getItem(`change_orders_${workOrderId}`) || '[]');

  // Calculate totals
  const totalMaterialCosts = receipts
    .filter((r: any) => r.category === 'Materials' || r.category === 'Supplies')
    .reduce((sum: number, r: any) => sum + r.amount, 0);

  const totalLaborCosts = laborEntries
    .filter((e: any) => e.workerType === 'employee')
    .reduce((sum: number, e: any) => sum + e.totalCost, 0);

  const totalSubcontractorCosts = laborEntries
    .filter((e: any) => e.workerType === 'subcontractor')
    .reduce((sum: number, e: any) => sum + e.totalCost, 0);

  const totalServiceProviderCosts = laborEntries
    .filter((e: any) => e.workerType === 'service-provider')
    .reduce((sum: number, e: any) => sum + e.totalCost, 0);

  const otherExpenses = receipts
    .filter((r: any) => r.category !== 'Materials' && r.category !== 'Supplies')
    .reduce((sum: number, r: any) => sum + r.amount, 0);

  const totalCosts = totalMaterialCosts + totalLaborCosts + totalSubcontractorCosts + 
                     totalServiceProviderCosts + otherExpenses;

  const finalInvoiceAmount = workOrder.finalInvoiceAmount || workOrder.estimatedValue;
  const profitAmount = finalInvoiceAmount - totalCosts;
  const profitMargin = finalInvoiceAmount > 0 ? (profitAmount / finalInvoiceAmount) * 100 : 0;

  return {
    id: workOrder.id,
    workOrderNumber: workOrder.itemNumber || workOrder.id.slice(0, 8).toUpperCase(),
    customerName: workOrder.customerName,
    customerEmail: workOrder.customerEmail,
    customerPhone: workOrder.customerPhone,
    projectTitle: workOrder.title,
    projectDescription: workOrder.description,
    location: workOrder.location || 'Not specified',
    
    // Dates
    requestDate: workOrder.createdDate,
    startDate: workOrder.startDate || workOrder.createdDate,
    completionDate: workOrder.completionDate || new Date().toISOString(),
    invoicePaidDate: workOrder.invoicePaidDate || new Date().toISOString(),
    
    // Financial Summary
    quotedAmount: workOrder.estimatedValue,
    finalInvoiceAmount,
    totalMaterialCosts,
    totalLaborCosts,
    totalSubcontractorCosts,
    totalServiceProviderCosts,
    otherExpenses,
    totalCosts,
    profitMargin,
    profitAmount,
    
    // Detailed breakdowns
    receipts,
    laborEntries,
    changeOrders,
    
    // Notes
    notes: workOrder.notes,
    internalNotes: workOrder.internalNotes,
  };
}

// Save receipt to work order
export function addReceiptToWorkOrder(
  workOrderId: string,
  receipt: {
    vendor: string;
    category: string;
    description: string;
    amount: number;
    receiptImage?: string;
    invoiceNumber?: string;
  }
) {
  const receipts = JSON.parse(localStorage.getItem(`receipts_${workOrderId}`) || '[]');
  
  const newReceipt = {
    id: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString(),
    ...receipt,
  };
  
  receipts.push(newReceipt);
  localStorage.setItem(`receipts_${workOrderId}`, JSON.stringify(receipts));
  
  console.log('✅ Receipt added to work order:', workOrderId);
  return newReceipt;
}

// Save labor entry to work order
export function addLaborEntryToWorkOrder(
  workOrderId: string,
  labor: {
    workerName: string;
    workerType: 'employee' | 'subcontractor' | 'service-provider';
    hoursWorked: number;
    hourlyRate: number;
    description: string;
    approvedBy?: string;
  }
) {
  const laborEntries = JSON.parse(localStorage.getItem(`labor_${workOrderId}`) || '[]');
  
  const newEntry = {
    id: `labor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString(),
    totalCost: labor.hoursWorked * labor.hourlyRate,
    ...labor,
  };
  
  laborEntries.push(newEntry);
  localStorage.setItem(`labor_${workOrderId}`, JSON.stringify(laborEntries));
  
  console.log('✅ Labor entry added to work order:', workOrderId);
  return newEntry;
}

// Save change order to work order
export function addChangeOrderToWorkOrder(
  workOrderId: string,
  changeOrder: {
    description: string;
    amount: number;
    approved: boolean;
  }
) {
  const changeOrders = JSON.parse(localStorage.getItem(`change_orders_${workOrderId}`) || '[]');
  
  const newChangeOrder = {
    id: `co_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString(),
    ...changeOrder,
  };
  
  changeOrders.push(newChangeOrder);
  localStorage.setItem(`change_orders_${workOrderId}`, JSON.stringify(changeOrders));
  
  console.log('✅ Change order added to work order:', workOrderId);
  return newChangeOrder;
}

// Create sample completion report data for testing
export function createSampleCompletionData(workOrderId: string) {
  console.log('🌱 Creating sample completion report data for:', workOrderId);
  
  // Sample receipts
  const sampleReceipts = [
    {
      vendor: 'Home Depot',
      category: 'Materials',
      description: '2x4 lumber (50 pieces), screws, nails',
      amount: 487.50,
      invoiceNumber: 'HD-2024-001234',
    },
    {
      vendor: 'Lowes',
      category: 'Materials',
      description: 'Drywall sheets (20), joint compound, tape',
      amount: 325.00,
      invoiceNumber: 'LWS-567890',
    },
    {
      vendor: 'Sherwin Williams',
      category: 'Materials',
      description: 'Interior paint (5 gal), primer, brushes',
      amount: 275.00,
      invoiceNumber: 'SW-45678',
    },
    {
      vendor: 'Menards',
      category: 'Supplies',
      description: 'Safety equipment, tarps, cleaning supplies',
      amount: 145.00,
    },
    {
      vendor: 'Local Electrical Supply',
      category: 'Materials',
      description: 'Wiring, outlets, switches, breaker',
      amount: 389.00,
      invoiceNumber: 'LES-9876',
    },
    {
      vendor: 'Waste Management',
      category: 'Services',
      description: 'Dumpster rental - 2 weeks',
      amount: 450.00,
      invoiceNumber: 'WM-2024-5432',
    },
  ];

  sampleReceipts.forEach(receipt => addReceiptToWorkOrder(workOrderId, receipt));

  // Sample labor entries
  const sampleLabor = [
    {
      workerName: 'John Smith',
      workerType: 'employee' as const,
      hoursWorked: 40,
      hourlyRate: 45,
      description: 'Framing and structural work',
      approvedBy: 'Project Manager',
    },
    {
      workerName: 'Mike Johnson',
      workerType: 'employee' as const,
      hoursWorked: 32,
      hourlyRate: 45,
      description: 'Drywall installation and finishing',
      approvedBy: 'Project Manager',
    },
    {
      workerName: 'Elite Electrical LLC',
      workerType: 'subcontractor' as const,
      hoursWorked: 16,
      hourlyRate: 85,
      description: 'Electrical rough-in and finish work',
      approvedBy: 'Project Manager',
    },
    {
      workerName: 'Pro Plumbing Services',
      workerType: 'subcontractor' as const,
      hoursWorked: 12,
      hourlyRate: 95,
      description: 'Plumbing installation and connections',
      approvedBy: 'Project Manager',
    },
    {
      workerName: 'Sarah Williams',
      workerType: 'employee' as const,
      hoursWorked: 24,
      hourlyRate: 40,
      description: 'Painting and trim work',
      approvedBy: 'Project Manager',
    },
    {
      workerName: 'HVAC Experts Inc',
      workerType: 'service-provider' as const,
      hoursWorked: 8,
      hourlyRate: 110,
      description: 'HVAC system inspection and certification',
      approvedBy: 'Project Manager',
    },
  ];

  sampleLabor.forEach(labor => addLaborEntryToWorkOrder(workOrderId, labor));

  // Sample change orders
  const sampleChangeOrders = [
    {
      description: 'Customer requested upgraded fixtures in bathroom',
      amount: 850,
      approved: true,
    },
    {
      description: 'Additional electrical outlets in kitchen',
      amount: 325,
      approved: true,
    },
  ];

  sampleChangeOrders.forEach(co => addChangeOrderToWorkOrder(workOrderId, co));

  console.log('✅ Sample completion data created successfully');
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).generateCompletionReportData = generateCompletionReportData;
  (window as any).createSampleCompletionData = createSampleCompletionData;
  (window as any).addReceiptToWorkOrder = addReceiptToWorkOrder;
  (window as any).addLaborEntryToWorkOrder = addLaborEntryToWorkOrder;
  (window as any).addChangeOrderToWorkOrder = addChangeOrderToWorkOrder;
  
  console.log('✅ Completion report utilities loaded:');
  console.log('  - generateCompletionReportData(workOrderId)');
  console.log('  - createSampleCompletionData(workOrderId)');
  console.log('  - addReceiptToWorkOrder(workOrderId, receipt)');
  console.log('  - addLaborEntryToWorkOrder(workOrderId, labor)');
  console.log('  - addChangeOrderToWorkOrder(workOrderId, changeOrder)');
}
