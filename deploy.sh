#!/bin/bash

# Black Phoenix Builds - Quick Deploy Script
# Run this script to deploy your application

set -e  # Exit on error

echo "🚀 Black Phoenix Builds - Deployment Script"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI not found. Installing...${NC}"
    npm install -g supabase
    echo -e "${GREEN}✅ Supabase CLI installed${NC}"
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
    echo -e "${GREEN}✅ Vercel CLI installed${NC}"
fi

echo ""
echo -e "${BLUE}Step 1: Deploy Backend (Supabase Edge Functions)${NC}"
echo "=================================================="

# Check if logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "Please login to Supabase..."
    supabase login
fi

# Link project
echo "Linking to Supabase project..."
supabase link --project-ref plzsvzwwcdopnawtiwzm

# Deploy edge functions
echo "Deploying Edge Functions..."
supabase functions deploy server

echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
echo ""

echo -e "${BLUE}Step 2: Deploy Frontend (Vercel)${NC}"
echo "=================================="

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Visit your Vercel URL to test the app"
echo "2. Set up environment variables in Supabase and Vercel if needed"
echo "3. Configure custom domain (optional)"
echo ""
echo "See DEPLOYMENT.md for detailed instructions"
