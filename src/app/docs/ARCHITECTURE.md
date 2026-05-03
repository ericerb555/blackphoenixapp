# 🏗️ ARCHITECTURE GUIDE

**Status**: Active  
**Last Updated**: 2026-02-18

---

## Overview

This is a React + TypeScript + Supabase enterprise management app with:
- 100+ pages for different business workflows
- Role-based access control (admin, customer, employee, subcontractor)
- White-label multi-tenant architecture
- Subscription management & payments

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS v4 |
| **Backend** | Supabase Edge Functions (Deno + Hono) |
| **Database** | PostgreSQL (via Supabase) |
| **Auth** | Supabase Auth |
| **Storage** | Key-Value store (`kv_store_824f083c` table) |

---

## Folder Structure

```
/
├── App.tsx                 # Main entry, routing logic
├── /components             # Reusable UI components (150+)
│   ├── /ui                 # Base components (buttons, cards, etc)
│   ├── /cad                # CAD design system
│   ├── /crm                # CRM components
│   ├── /payment            # Payment components
│   └── ...                 # Feature-specific folders
├── /pages                  # Page components (100+)
│   ├── EnhancedDashboard.tsx
│   ├── Customers.tsx
│   ├── Subscriptions.tsx
│   └── ...
├── /contexts               # React Context providers
│   ├── AuthContext.tsx
│   ├── CompanyContext.tsx
│   └── ViewModeContext.tsx
├── /lib                    # Utilities & services
│   ├── supabase.ts         # Supabase client
│   ├── permissions.ts      # Access control
│   └── /services           # Business logic
├── /supabase               # Backend
│   └── /functions/server
│       ├── index.tsx       # API routes
│       └── kv_store.tsx    # Database utilities
├── /types                  # TypeScript types
└── /docs                   # Documentation
```

---

## Data Flow

```
User Interaction
    ↓
React Component
    ↓
Fetch API Call
    ↓
Supabase Edge Function (Hono server)
    ↓
KV Store (PostgreSQL)
    ↓
Response back to Component
    ↓
UI Update
```

---

## Key Components

### 1. App.tsx
- Main entry point
- Manual routing via switch statement (being refactored)
- Handles 100+ routes
- Wraps app in Context providers

### 2. EnterpriseLayout.tsx
- Main layout wrapper
- Sidebar navigation
- Header with user info
- Handles view mode switching (admin/client/technician/subcontractor)

### 3. AuthContext
- Manages user authentication
- Provides `user`, `login`, `logout`, `needsOnboarding`
- Wraps entire app

### 4. Backend Server (`/supabase/functions/server/index.tsx`)
- Hono web server
- REST API endpoints
- Routes prefixed with `/make-server-824f083c/`
- Stores data in KV table

---

## Authentication Flow

1. User visits app
2. `AuthContext` checks for session
3. If no session → redirect to `/login`
4. Login form calls Supabase Auth
5. On success → sets user in context
6. App shows based on user role

---

## Current Architecture Issues (Being Fixed)

1. ❌ All routes in one giant switch statement → Refactoring to route registry
2. ❌ API calls scattered in components → Creating centralized API client
3. ❌ No TypeScript types for API responses → Adding type definitions
4. ❌ State management inconsistent → Will add Zustand
5. ❌ Large bundle size → Adding lazy loading

---

## Adding New Features

See [ADDING_FEATURES.md](./ADDING_FEATURES.md) for step-by-step guide.

---

## Backend API Routes

See [API_REFERENCE.md](./API_REFERENCE.md) for complete list.

---

## Questions?

Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or team chat.
