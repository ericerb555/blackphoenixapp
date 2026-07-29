# 🔌 API CLIENT USAGE GUIDE

The API client provides a type-safe, centralized way to make backend calls.

---

## Quick Start

```typescript
import { api } from './lib/api';

// Get all subscriptions
const subscriptions = await api.subscriptions.getAll();

// Create a customer
const customer = await api.customers.create({
  name: 'John Doe',
  email: 'john@example.com'
});
```

---

## Available APIs

| API | Methods | Description |
|-----|---------|-------------|
| `api.subscriptions` | getAll, getById, create, update, delete, giftHours, getHours, processRollovers | Subscription management |
| `api.giftHoursRequests` | getAll, create, approve, reject | Gift hours workflow |
| `api.customers` | getAll, getById, create, update | Customer management |
| `api.workOrders` | getAll, getById, create, update | Work order management |
| `api.invoices` | getAll, getById, create, update | Invoice management |
| `api.referrals` | getAll, create, update | Referral tracking |
| `api.giftCards` | getAll, getByCode, create, redeem | Gift card management |
| `api.subcontractors` | getAll, create, update | Subcontractor management |
| `api.vendors` | getAll, create | Vendor management |
| `api.advertisers` | getAll, create | Advertiser management |
| `api.plans` | getAll, getById, create, update, delete | Subscription plan management |
| `api.payment` | process, schedule, retry, getHistory, getAlerts, etc. | Payment processing |
| `api.whiteLabel` | getClients, createClient, updateBranding, build, etc. | White label management |
| `api.analytics` | subscriptions, referrals | Analytics data |

---

## Examples

### Subscriptions

```typescript
// Get all subscriptions
const subscriptions = await api.subscriptions.getAll();

// Get specific subscription
const sub = await api.subscriptions.getById('SUB-M-123');

// Create subscription
const newSub = await api.subscriptions.create({
  type: 'maintenance',
  stakeholderId: 'CUST-456',
  stakeholderName: 'John Doe',
  stakeholderEmail: 'john@example.com',
  hoursIncluded: 10,
  status: 'active'
});

// Update subscription
await api.subscriptions.update('SUB-M-123', {
  hoursUsed: 5,
  status: 'active'
});

// Gift hours (Owner only)
await api.subscriptions.giftHours('SUB-M-123', {
  hours: 5,
  reason: 'Apology for service delay',
  giftedBy: 'Owner Name'
});

// Delete subscription
await api.subscriptions.delete('SUB-M-123');
```

---

### Customers

```typescript
// Get all customers
const customers = await api.customers.getAll();

// Create customer
const customer = await api.customers.create({
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '555-0123',
  address: '123 Main St'
});

// Update customer
await api.customers.update('CUST-123', {
  phone: '555-9999'
});
```

---

### Work Orders

```typescript
// Get all work orders
const workOrders = await api.workOrders.getAll();

// Create work order
const wo = await api.workOrders.create({
  customerId: 'CUST-123',
  title: 'Kitchen Remodel',
  description: 'Full kitchen renovation',
  status: 'pending',
  priority: 'high'
});

// Update status
await api.workOrders.update('WO-123', {
  status: 'in-progress'
});
```

---

### Invoices

```typescript
// Get all invoices
const invoices = await api.invoices.getAll();

// Create invoice
const invoice = await api.invoices.create({
  customerId: 'CUST-123',
  amount: 5000,
  items: [
    { description: 'Labor', amount: 3000 },
    { description: 'Materials', amount: 2000 }
  ],
  status: 'draft'
});
```

---

### Gift Hours Requests

```typescript
// Get all requests
const requests = await api.giftHoursRequests.getAll();

// Create request (Employee/Manager)
const request = await api.giftHoursRequests.create({
  subscriptionId: 'SUB-M-123',
  hours: 3,
  reason: 'Customer complaint resolution',
  requestedBy: 'Manager Name',
  status: 'pending'
});

// Approve request (Owner only)
await api.giftHoursRequests.approve('GHR-123', {
  reviewedBy: 'Owner Name',
  notes: 'Approved for good customer relations'
});

// Reject request
await api.giftHoursRequests.reject('GHR-123', {
  reviewedBy: 'Owner Name',
  notes: 'Insufficient reason'
});
```

---

### Gift Cards

```typescript
// Get all gift cards
const cards = await api.giftCards.getAll();

// Create gift card
const card = await api.giftCards.create({
  type: 'service',
  value: 500,
  recipientName: 'John Doe',
  recipientEmail: 'john@example.com'
});

// Check gift card balance
const giftCard = await api.giftCards.getByCode('GC-ABC123');

// Redeem gift card
await api.giftCards.redeem('GC-ABC123', {
  amount: 100
});
```

---

### Payments

```typescript
// Process payment
await api.payment.process({
  subscriptionId: 'SUB-M-123',
  amount: 99,
  method: 'card'
});

// Get payment history
const history = await api.payment.getHistory('SUB-M-123');

// Get payment alerts
const alerts = await api.payment.getAlerts();

// Get payment statistics
const stats = await api.payment.getStats();

// Pause subscription
await api.payment.pause({
  subscriptionId: 'SUB-M-123',
  reason: 'Customer request'
});
```

---

### White Label

```typescript
// Get all clients
const clients = await api.whiteLabel.getClients();

// Create client
const client = await api.whiteLabel.createClient({
  businessName: 'ABC Construction',
  contactName: 'John Doe',
  contactEmail: 'john@abc.com',
  plan: 'premium'
});

// Update branding
await api.whiteLabel.updateBranding('CLIENT-123', {
  primaryColor: '#ea580c',
  logo: 'https://...',
  appName: 'ABC App'
});

// Trigger build
await api.whiteLabel.build('CLIENT-123', {
  platform: 'ios',
  buildType: 'production'
});

// Check build status
const build = await api.whiteLabel.getBuildStatus('BUILD-123');
```

---

## Error Handling

The API client throws `ApiError` for all errors:

```typescript
import { api, ApiError } from './lib/api';

try {
  await api.customers.create({ name: 'John' });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status: ${error.status}`);
    console.error(`Endpoint: ${error.endpoint}`);
    
    // Handle specific status codes
    if (error.status === 404) {
      alert('Not found');
    } else if (error.status === 401) {
      alert('Unauthorized');
    } else {
      alert(`Error: ${error.message}`);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Using in React Components

### With useState/useEffect

```typescript
import { useEffect, useState } from 'react';
import { api } from './lib/api';

export function SubscriptionList() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.subscriptions.getAll();
        setSubscriptions(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {subscriptions.map(sub => (
        <div key={sub.id}>{sub.stakeholderName}</div>
      ))}
    </div>
  );
}
```

---

### With Form Submission

```typescript
import { useState } from 'react';
import { api, ApiError } from './lib/api';
import { toast } from 'sonner@2.0.3';

export function CustomerForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.customers.create(formData);
      toast.success('Customer created!');
      setFormData({ name: '', email: '' });
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(`Failed: ${error.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name"
      />
      <input
        value={formData.email}
        onChange={e => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Customer'}
      </button>
    </form>
  );
}
```

---

## Benefits Over Direct fetch()

### ❌ Before (scattered fetch calls):

```typescript
// In Component A
const response = await fetch(`https://.../subscriptions`);
const data = await response.json();

// In Component B (different URL format!)
const response = await fetch(`https://.../subscription/${id}`);

// In Component C (forgot auth header!)
const response = await fetch(`https://.../customers`);
```

### ✅ After (centralized API):

```typescript
// Consistent everywhere
const subs = await api.subscriptions.getAll();
const sub = await api.subscriptions.getById(id);
const customers = await api.customers.getAll();
```

**Benefits**:
- ✅ No more URL typos
- ✅ Automatic auth headers
- ✅ Consistent error handling
- ✅ Easy to add features (caching, retry, etc.)
- ✅ TypeScript autocomplete

---

## Next Steps (Phase 2)

In Phase 2, we'll add:
- **TypeScript types** for all requests/responses
- **Request caching** to reduce API calls
- **Retry logic** for failed requests
- **Loading states** via React Query or SWR
- **Optimistic updates** for better UX

---

**Questions?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
