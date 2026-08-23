# 🏢 Business Hub - Enterprise Management Platform

> **A comprehensive business management application with CRM, invoicing, vendor management, AI-powered quoting, eCommerce, and multi-tenant SaaS capabilities.**

Built with **React**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

---

## 🚀 **Quick Deploy**

Get your app live in 5 minutes:

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link project
supabase link --project-ref plzsvzwwcdopnawtiwzm

# 4. Set secrets (interactive)
./set-secrets.sh        # macOS/Linux
set-secrets.bat         # Windows

# 5. Deploy!
./deploy.sh             # macOS/Linux
deploy.bat              # Windows
```

**📖 Full Instructions:** See [`QUICK_START.md`](./QUICK_START.md)

---

## ✨ Features

### 🎯 **Core Capabilities**
- ✅ **Multi-Tenant SaaS** - Multiple companies, role-based access
- ✅ **CRM System** - Customer management, pipeline tracking
- ✅ **Quote Generation** - AI-powered quotes from blueprints
- ✅ **Invoice Management** - Professional invoicing system
- ✅ **Vendor Hub** - Integrated product sourcing (Grainger, Home Depot, Lowe's)
- ✅ **eCommerce Platform** - Hybrid marketplace with dropshipping
- ✅ **Payment Processing** - Stripe, Square, PayPal integration
- ✅ **Project Management** - Unified pipeline for all project types
- ✅ **Time Tracking** - Employee hours, labor rates, billable time
- ✅ **Analytics Engine** - Real-time business metrics
- ✅ **Notification System** - Email, SMS, push notifications

### 🤖 **AI Features**
- ✅ **Blueprint Analyzer** - GPT-4 Vision for construction plans
- ✅ **AI Bid Router** - Smart vendor matching
- ✅ **Quote Generator** - Automatic material & labor estimation
- ✅ **Design Studio Pro** - AI-powered floor plan generation

### 🎨 **Design & UX**
- ✅ **Dark Theme** - Deep orange accent (#ea580c)
- ✅ **Responsive Design** - Mobile, tablet, desktop
- ✅ **107 Pages** - Comprehensive feature coverage
- ✅ **Unified Navigation** - Consistent back button system
- ✅ **Modern UI** - Glassmorphism, gradients, animations

### 🔐 **Security & Auth**
- ✅ **Supabase Auth** - Email/password, social login
- ✅ **Role-Based Access** - Owner, Admin, Employee, Customer
- ✅ **Multi-Company** - Secure company switching
- ✅ **API Security** - JWT tokens, row-level security

---

## 📂 **Project Structure**

```
business-hub/
├── App.tsx                 # Main application entry
├── routes.tsx              # React Router configuration
├── components/             # Reusable UI components
│   ├── BusinessProfilesHub.tsx
│   ├── CommandCenter.tsx
│   ├── OwnerControlsPanel.tsx
│   ├── ui/                 # Design system components
│   └── ...
├── pages/                  # Route pages (107 total)
│   ├── OwnersDashboard.tsx
│   ├── BidRoom.tsx             # Phoenix Exchange
│   ├── UnifiedProjectPipeline.tsx
│   └── ...
├── supabase/
│   └── functions/
│       └── server/         # Edge function (40+ routes)
│           ├── index.tsx
│           ├── companies.tsx
│           ├── quote-generator.tsx
│           ├── ai-blueprint-analysis.tsx
│           └── ...
├── contexts/               # React contexts
│   ├── AuthContext.tsx
│   ├── CompanyContext.tsx
│   └── ...
├── lib/                    # Utilities
│   ├── supabase.ts
│   └── ...
└── styles/
    └── globals.css         # Tailwind v4 + custom styles
```

---

## 🛠️ **Tech Stack**

### **Frontend**
- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router** - Navigation (data mode)
- **Tailwind CSS v4** - Styling
- **Lucide React** - Icons
- **Recharts** - Charts & analytics
- **Sonner** - Toast notifications
- **Motion** (Framer Motion) - Animations

### **Backend**
- **Supabase** - Database, auth, storage
- **Deno** - Edge function runtime
- **Hono** - Web framework
- **PostgreSQL** - Database (via Supabase)
- **KV Store** - Key-value persistence

### **Integrations**
- **OpenAI GPT-4** - AI features
- **Stripe** - Payment processing
- **Twilio** - SMS notifications
- **Resend** - Email delivery
- **Vendor APIs** - Product sourcing

---

## 📖 **Documentation**

| File | Description |
|------|-------------|
| [`QUICK_START.md`](./QUICK_START.md) | 5-minute deployment guide |
| [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) | Comprehensive deployment docs |
| `deploy.sh` / `deploy.bat` | Automated deployment scripts |
| `set-secrets.sh` / `set-secrets.bat` | Environment setup scripts |
| `diagnostic-tool.html` | Debug tool for API endpoints |

---

## 🔧 **Development**

### **Local Setup**

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### **Environment Variables**

Create `.env.local`:

```bash
VITE_SUPABASE_URL=https://plzsvzwwcdopnawtiwzm.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### **Deploy Edge Function**

```bash
# After making changes to /supabase/functions/server/
./deploy.sh
```

---

## 🌐 **Deployment Options**

### **Recommended: Vercel**

```bash
npm install -g vercel
vercel login
vercel
```

### **Alternative: Netlify**

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### **Manual: Static Hosting**

```bash
npm run build
# Upload /dist folder to any static host
```

---

## 🎯 **Key Pages**

| Route | Description |
|-------|-------------|
| `/` | Dashboard / Command Center |
| `/company-profile` | Business Profiles Hub |
| `/unified-project-pipeline` | All project types |
| `/bid-room-v2` | Vendor bid management |
| `/quote-from-blueprint` | AI quote generator |
| `/ecommerce-hub` | Hybrid marketplace |
| `/analytics-dashboard` | Business metrics |
| `/owners-dashboard` | Owner controls |

**Total:** 107 pages with unified navigation

---

## 🔌 **API Endpoints**

Base URL: `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/make-server-824f083c/health` | GET | Health check |
| `/make-server-824f083c/companies` | GET/POST | Company management |
| `/make-server-824f083c/quotes` | POST | Generate quotes |
| `/make-server-824f083c/ai-blueprint-analyze` | POST | Blueprint analysis |
| `/make-server-824f083c/ecommerce-products` | GET | Product catalog |
| `/make-server-824f083c/pipeline` | GET/POST | Project pipeline |

**Total:** 40+ endpoints across 45 router files

---

## 🐛 **Troubleshooting**

### **Health endpoint returns 404**

```bash
# Redeploy the function
./deploy.sh
```

### **"Server offline" in app**

1. Check function is deployed: https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm/functions
2. Verify secrets are set: `supabase secrets list`
3. Check logs: `supabase functions logs server`

### **Database errors**

The app uses a KV store that auto-creates on first use. No manual database setup required!

### **Still stuck?**

```bash
# View real-time logs
supabase functions logs server --follow

# Test health endpoint
curl https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server/make-server-824f083c/health
```

---

## 📊 **Monitoring**

### **View Logs**

```bash
# Recent logs
supabase functions logs server

# Live logs
supabase functions logs server --follow
```

### **Check Secrets**

```bash
supabase secrets list
```

### **Analytics Dashboard**

Built-in analytics available at `/analytics-dashboard` in the app.

---

## 🚦 **Status**

- ✅ **Frontend:** Production-ready
- ✅ **Backend:** Deployed on Supabase Edge Functions
- ✅ **Database:** KV Store + Supabase PostgreSQL
- ✅ **Auth:** Supabase Auth with social login support
- ✅ **Payments:** Stripe, Square, PayPal integrated
- ✅ **AI:** GPT-4 Vision for blueprints
- ✅ **Mobile:** Fully responsive

**Current Version:** 4.5 (Media Library Integration)

---

## 📝 **License**

This is a Figma Make generated application. All rights reserved.

---

## 🆘 **Support**

For issues with:
- **Deployment:** See `DEPLOYMENT_GUIDE.md`
- **API Errors:** Use `diagnostic-tool.html`
- **Frontend Issues:** Check browser console
- **Backend Issues:** Check `supabase functions logs server`

---

## 🎉 **What's Included**

This is a **complete, production-ready** business management platform with:

- 🏢 **107 pages** of functionality
- 🔌 **40+ API endpoints**
- 🎨 **Unified design system**
- 🔐 **Enterprise security**
- 📊 **Real-time analytics**
- 🤖 **AI-powered features**
- 💳 **Payment processing**
- 📧 **Notification system**
- 🛒 **eCommerce platform**
- 👥 **Multi-tenant SaaS**

**Total lines of code:** 50,000+

**Ready to launch!** 🚀

---

Built with ❤️ using **Figma Make**
