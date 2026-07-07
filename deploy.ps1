# Black Phoenix Builds - PowerShell Deploy Script
# Run this in PowerShell to deploy your application

Write-Host "🚀 Black Phoenix Builds - Deployment Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if npm is installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm not found. Please install Node.js first:" -ForegroundColor Red
    Write-Host "   https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Supabase CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g supabase
    Write-Host "✅ Supabase CLI installed" -ForegroundColor Green
}

# Check if Vercel CLI is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 1: Deploy Backend (Supabase Edge Functions)" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue

# Check if logged in to Supabase
Write-Host "Checking Supabase authentication..."
$supabaseProjects = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Supabase..." -ForegroundColor Yellow
    supabase login
}

# Link project
Write-Host "Linking to Supabase project..." -ForegroundColor Cyan
supabase link --project-ref plzsvzwwcdopnawtiwzm

# Deploy edge functions
Write-Host "Deploying Edge Functions..." -ForegroundColor Cyan
supabase functions deploy server

Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Deploy Frontend (Vercel)" -ForegroundColor Blue
Write-Host "==================================" -ForegroundColor Blue

# Deploy to Vercel
Write-Host "Deploying to Vercel..." -ForegroundColor Cyan
vercel --prod

Write-Host ""
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Visit your Vercel URL to test the app"
Write-Host "2. Set up environment variables in Supabase and Vercel if needed"
Write-Host "3. Configure custom domain (optional)"
Write-Host ""
Write-Host "See DEPLOYMENT.md for detailed instructions"
