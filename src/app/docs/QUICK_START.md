# ⚡ QUICK START GUIDE

Get the app running in 5 minutes.

---

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Git

---

## Step 1: Clone & Install (2 min)

```bash
# Clone the repo
git clone <your-repo-url>
cd <project-folder>

# Install dependencies
npm install
```

---

## Step 2: Database Setup (1 min)

1. Go to: https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm
2. Click **SQL Editor** → **New Query**
3. Open `/DATABASE_SETUP_NOW.md` and copy the SQL
4. Paste and click **RUN**

✅ You should see: "Success. No rows returned"

---

## Step 3: Run the App (1 min)

```bash
npm run dev
```

Open: http://localhost:5173

---

## Step 4: Login (1 min)

**Default credentials** (demo mode):
- Email: `admin@example.com`
- Password: `password123`

**Or create account**: Click "Sign Up"

---

## ✅ Verification Checklist

- [ ] App loads without errors
- [ ] No yellow "Server not available" banner
- [ ] Can navigate between pages
- [ ] Browser console has no red errors

---

## 🚨 Common Issues

### "Server not available" banner shows
→ Run database setup (Step 2 above)

### "Module not found" errors
→ Run `npm install` again

### Port 5173 already in use
→ Run `npm run dev -- --port 3000`

### White screen / blank page
→ Check browser console (F12) for errors

---

## 📚 Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand structure
- Read [ADDING_FEATURES.md](./ADDING_FEATURES.md) to add pages
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) if stuck

---

**Need help?** Check the troubleshooting guide or team chat.
