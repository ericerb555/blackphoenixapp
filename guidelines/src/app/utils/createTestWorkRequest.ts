import type { WorkRequest } from '../components/WorkOrderManager';

export function createTestWorkRequest(): WorkRequest {
  const now = new Date();
  const preferredDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: `REQ-TEST-${Date.now()}`,
    requestNumber: 'REQ-00999',
    status: 'new',
    customerName: 'Jessica Martinez',
    customerEmail: 'jessica.martinez@email.com',
    customerPhone: '(603) 555-0142',
    propertyAddress: '47 Maple Street, Concord, NH 03301',
    propertyType: 'residential',
    requestType: 'repair',
    priority: 'normal',
    title: 'Kitchen Faucet Leak Repair',
    description: 'The kitchen faucet has been dripping for two weeks. It\'s getting worse and water is pooling under the sink. I think the cartridge needs to be replaced.',
    preferredDate: preferredDate.toISOString().split('T')[0],
    preferredTimeSlot: 'morning',
    estimatedBudget: '$150-300',
    submittedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    source: 'website',
    attachments: [],
    notes: '',
  };
}

export function addTestRequestToStorage(): WorkRequest {
  const request = createTestWorkRequest();
  try {
    const existing = JSON.parse(localStorage.getItem('work_requests') || '[]');
    existing.unshift(request);
    localStorage.setItem('work_requests', JSON.stringify(existing));
  } catch {}
  return request;
}
