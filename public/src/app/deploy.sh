#!/bin/bash

# 🚀 Business Hub - Supabase Deployment Script
# This script automates the deployment of your Supabase Edge Function

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Business Hub - Supabase Edge Function Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  macOS/Linux: brew install supabase/tap/supabase"
    echo "  NPM: npm install -g supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Project configuration
PROJECT_REF="plzsvzwwcdopnawtiwzm"
FUNCTION_NAME="server"

# Check if already linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "🔗 Linking to Supabase project..."
    supabase link --project-ref $PROJECT_REF
    echo ""
else
    echo "✅ Project already linked"
    echo ""
fi

# Deploy the function
echo "📦 Deploying edge function '$FUNCTION_NAME'..."
supabase functions deploy $FUNCTION_NAME

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📍 Function URL:"
    echo "   https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME"
    echo ""
    echo "🔍 Test the health endpoint:"
    echo "   https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/make-server-824f083c/health"
    echo ""
    echo "📊 View logs:"
    echo "   supabase functions logs $FUNCTION_NAME"
    echo ""
    echo "📊 View logs (live):"
    echo "   supabase functions logs $FUNCTION_NAME --follow"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚙️  NEXT STEPS:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Set environment variables (if not already set):"
    echo "   ./set-secrets.sh"
    echo ""
    echo "2. Test the deployment:"
    echo "   curl https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/make-server-824f083c/health"
    echo ""
    echo "3. Open your app and verify database connection!"
    echo ""
else
    echo ""
    echo "❌ Deployment failed! Check the errors above."
    echo ""
    exit 1
fi
