# Black Phoenix Builds - Enterprise Management Platform

A comprehensive enterprise management platform for construction and service businesses.

## 🚀 Quick Start

### Development
This project is developed in **Figma Make** and can be deployed to production.

### Deployment

**One-command deploy:**
```bash
./deploy.sh
```

Or see [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 📦 What's Included

### Features
- **Multi-tenant architecture** with user isolation
- **First user = Owner** - automatic role assignment
- **Customer Portal** - Project tracking, quotes, invoices
- **Command Center** - Owner/admin dashboard
- **Data Persistence** - Automatic backup to Supabase
- **Authentication** - Secure sign-up/sign-in system
- **Real-time updates** - Live data synchronization

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase Edge Functions + PostgreSQL
- **Auth**: Supabase Auth
- **Deployment**: Vercel (frontend) + Supabase (backend)

## 🏗️ Architecture

```
Frontend (React/Vite)
    ↓
Supabase Edge Functions (Hono Server)
    ↓
PostgreSQL Database
```

## 📱 Portals

### Customer Portal
- Work request management
- Quote approval
- Invoice tracking
- Referral rewards
- Shopping/materials ordering

### Owner Portal (Command Center)
- Unified dashboard
- Business analytics
- User management
- Project pipeline
- Financial tracking

### Other Portals
- Subcontractor
- Vendor
- Investor
- Advertiser
- Employee

## 🔐 Security

- **User Data Isolation**: Each user only sees their own data
- **Role-based Access**: Owner, Admin, Management, Employee, Customer
- **Automatic Backups**: Data backed up every 30 seconds
- **Secure Authentication**: Supabase Auth with JWT tokens

## 🛠️ Development

### Local Development
```bash
pnpm install
pnpm dev
```

### Build
```bash
pnpm build
```

### Deploy
```bash
./deploy.sh
```

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [User Data Isolation](./USER_DATA_ISOLATION_GUIDE.md)
- [Data Isolation Status](./DATA_ISOLATION_STATUS.md)

## 🌐 Production URLs

- **Frontend**: TBD (after Vercel deployment)
- **Backend**: `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server`
- **Supabase Dashboard**: `https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm`

## 🤝 Support

For issues or questions:
1. Check the documentation
2. Review deployment logs
3. Check Supabase Edge Function logs

## 📄 License

Proprietary - Black Phoenix Builds
