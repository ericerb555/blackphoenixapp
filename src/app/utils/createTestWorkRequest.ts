/**
 * Create Test Work Request
 *
 * Creates a realistic work request for testing the complete workflow:
 * Request → Review → Approve → Work Order → Assign → Schedule →
 * Progress → Materials → Photos → Complete → Invoice
 */

import type { WorkRequest } from '../components/WorkOrderManager';
import { createWorkRequestAlert } from './adminAlerts';

export function createTestWorkRequest(): WorkRequest {
  const now = new Date();
  const preferredDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const testRequest: WorkRequest = {
    id: `REQ-TEST-${Date.now()}`,
    requestNumber: 'REQ-00999',
    status: 'new',
    customerName: 'Jessica Martinez',
    customerEmail: 'jessica.martinez@email.com',
    customerPhone: '(555) 789-0123',
    serviceType: 'Kitchen Remodel',
    title: 'Complete Kitchen Renovation with New Appliances',
    description: `Looking for a complete kitchen renovation including:

- Remove old cabinets and countertops
- Install new custom white shaker cabinets (upper and lower)
- Install quartz countertops (approximately 30 sq ft)
- New stainless steel appliances (refrigerator, range, dishwasher, microwave)
- Replace sink and faucet with undermount farmhouse sink
- Install subway tile backsplash (full wall behind range and sink area)
- Update lighting with recessed LED lights and pendant lights over island
- Refinish hardwood floors
- Paint walls and ceiling

Kitchen dimensions: 12' x 14' with small island (4' x 6')
Timeline: Would like to complete within 3-4 weeks
Budget: $35,000 - $45,000

Additional notes:
- Home built in 1995, some electrical and plumbing updates may be needed
- Want to maintain open concept to living room
- Prefer neutral colors (whites, grays, natural wood tones)
- Family of 4, would like to minimize disruption
- Can provide temporary kitchen setup in garage`,
    location: '742 Maple Avenue, Austin, TX 78704',
    urgency: 'medium',
    preferredDate: preferredDate.toISOString().split('T')[0],
    photos: [
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400', // Kitchen before 1
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', // Kitchen before 2
      'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400', // Kitchen before 3
    ],
    documents: [],
    createdAt: now.toISOString(),
    notes: `Customer mentioned they saw our work on a neighbor's kitchen remodel and were very impressed.

They have already:
- Obtained HOA approval (if needed)
- Secured financing
- Selected appliances (waiting to purchase until contractor confirmed)
- Have Pinterest board with design inspiration

Special considerations:
- Dog in home (needs to be secured during work)
- Work from home schedule (prefer early morning start times)
- Hosting family gathering in 6 weeks (hard deadline)

Customer is very organized and has done extensive research. Seems like an ideal client for a smooth project.`
  };

  return testRequest;
}

export function addTestRequestToStorage(): WorkRequest {
  // Get existing work requests
  const existingData = localStorage.getItem('work_requests');
  const workRequests = existingData ? JSON.parse(existingData) : [];

  // Create test request
  const testRequest = createTestWorkRequest();

  // Check if test request already exists (by request number)
  const existingIndex = workRequests.findIndex((r: WorkRequest) => r.requestNumber === testRequest.requestNumber);

  if (existingIndex >= 0) {
    // Update existing test request
    workRequests[existingIndex] = testRequest;
    console.log('✏️ Updated existing test work request:', testRequest.requestNumber);
  } else {
    // Add new test request
    workRequests.push(testRequest);
    console.log('✅ Created new test work request:', testRequest.requestNumber);
  }

  // Save back to localStorage
  localStorage.setItem('work_requests', JSON.stringify(workRequests));

  // Trigger storage event for real-time updates
  window.dispatchEvent(new Event('storage'));

  // Create admin alert for new work request
  createWorkRequestAlert({
    id: testRequest.id,
    requestNumber: testRequest.requestNumber,
    customerName: testRequest.customerName,
    customerEmail: testRequest.customerEmail,
    customerPhone: testRequest.customerPhone,
    serviceType: testRequest.serviceType,
    title: testRequest.title,
    description: testRequest.description,
    location: testRequest.location,
    urgency: testRequest.urgency,
    preferredDate: testRequest.preferredDate
  });

  console.log('📋 Test Work Request Details:');
  console.log('  Customer:', testRequest.customerName);
  console.log('  Service:', testRequest.serviceType);
  console.log('  Location:', testRequest.location);
  console.log('  Budget:', '$35,000 - $45,000');
  console.log('  Timeline:', '3-4 weeks');
  console.log('  Status:', testRequest.status);
  console.log('✅ Admin alert created for new work request');

  return testRequest;
}

// Make available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).createTestWorkRequest = addTestRequestToStorage;
}
