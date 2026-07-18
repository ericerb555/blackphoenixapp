# 🔌 API REFERENCE

**Base URL**: `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-824f083c`  
**Auth**: Include `Authorization: Bearer ${publicAnonKey}` header

---

## Health Check

### GET /health
Check if server is running

**Response**:
```json
{
  "status": "ok",
  "message": "Figma Make Server is running",
  "timestamp": "2026-02-18T10:00:00.000Z"
}
```

---

## Subscriptions

### GET /subscriptions
Get all subscriptions

**Response**:
```json
[
  {
    "id": "SUB-M-1708257600000",
    "type": "maintenance",
    "stakeholderId": "CUST-123",
    "stakeholderName": "John Doe",
    "status": "active",
    "hoursIncluded": 10,
    "hoursUsed": 3,
    "createdAt": "2026-02-18T10:00:00.000Z"
  }
]
```

### GET /subscriptions/:id
Get single subscription

### POST /subscriptions
Create new subscription

**Request Body**:
```json
{
  "type": "maintenance",
  "stakeholderId": "CUST-123",
  "stakeholderName": "John Doe",
  "stakeholderEmail": "john@example.com",
  "hoursIncluded": 10
}
```

### PUT /subscriptions/:id
Update subscription

### DELETE /subscriptions/:id
Delete subscription

---

## Customers

### GET /customers
Get all customers

### GET /customers/:id
Get single customer

### POST /customers
Create customer

**Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "555-0123",
  "address": "123 Main St"
}
```

### PUT /customers/:id
Update customer

---

## Work Orders

### GET /workorders
Get all work orders

### GET /workorders/:id
Get single work order

### POST /workorders
Create work order

**Request Body**:
```json
{
  "customerId": "CUST-123",
  "title": "Kitchen Remodel",
  "description": "Full kitchen renovation",
  "status": "pending",
  "priority": "high"
}
```

### PUT /workorders/:id
Update work order

---

## Invoices

### GET /invoices
Get all invoices

### GET /invoices/:id
Get single invoice

### POST /invoices
Create invoice

**Request Body**:
```json
{
  "customerId": "CUST-123",
  "amount": 5000,
  "items": [
    { "description": "Labor", "amount": 3000 },
    { "description": "Materials", "amount": 2000 }
  ],
  "status": "draft"
}
```

### PUT /invoices/:id
Update invoice

---

## Gift Cards

### GET /giftcards
Get all gift cards

### GET /giftcards/:code
Get gift card by code

### POST /giftcards
Create gift card

**Request Body**:
```json
{
  "type": "service",
  "value": 500,
  "recipientName": "John Doe",
  "recipientEmail": "john@example.com"
}
```

### POST /giftcards/:code/redeem
Redeem gift card

**Request Body**:
```json
{
  "amount": 100
}
```

---

## Referrals

### GET /referrals
Get all referrals

### POST /referrals
Create referral

**Request Body**:
```json
{
  "referrerName": "Jane Smith",
  "referreeName": "John Doe",
  "referreeEmail": "john@example.com",
  "status": "pending"
}
```

### PUT /referrals/:id
Update referral

---

## Subcontractors

### GET /subcontractors
Get all subcontractors

### POST /subcontractors
Create subcontractor

**Request Body**:
```json
{
  "name": "ABC Plumbing",
  "email": "contact@abcplumbing.com",
  "phone": "555-0199",
  "specialties": ["plumbing", "hvac"]
}
```

### PUT /subcontractors/:id
Update subcontractor

---

## Vendors

### GET /vendors
Get all vendors

### POST /vendors
Create vendor

### PUT /vendors/:id
Update vendor

---

## Gift Hours (Subscription Feature)

### POST /subscriptions/:id/gift-hours
Gift hours directly (Owner only)

**Request Body**:
```json
{
  "hours": 5,
  "reason": "Apology for service delay",
  "giftedBy": "Owner Name"
}
```

### GET /gift-hours-requests
Get all gift hour requests

### POST /gift-hours-requests
Create gift hour request (Employee/Manager)

**Request Body**:
```json
{
  "subscriptionId": "SUB-M-123",
  "hours": 3,
  "reason": "Customer complaint resolution",
  "requestedBy": "Manager Name",
  "status": "pending"
}
```

### POST /gift-hours-requests/:id/approve
Approve request (Owner only)

**Request Body**:
```json
{
  "reviewedBy": "Owner Name",
  "notes": "Approved for good customer relations"
}
```

### POST /gift-hours-requests/:id/reject
Reject request

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Optional additional details"
}
```

**Status Codes**:
- `200` - Success
- `400` - Bad request (invalid data)
- `401` - Unauthorized
- `404` - Not found
- `500` - Server error

---

## Using in Frontend

```typescript
import { projectId, publicAnonKey } from './utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-824f083c`;

async function getSubscriptions() {
  const response = await fetch(`${BASE_URL}/subscriptions`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });
  return response.json();
}
```

---

## Notes

- All POST/PUT requests expect JSON body
- All responses return JSON
- Timestamps are ISO 8601 format
- IDs are auto-generated strings

---

**Need help?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
