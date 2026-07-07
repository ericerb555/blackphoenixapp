#!/bin/bash

# 🔐 Business Hub - Set Supabase Secrets
# This script helps you set all required environment variables

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Business Hub - Environment Variables Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Required secrets
PROJECT_REF="plzsvzwwcdopnawtiwzm"
SUPABASE_URL="https://$PROJECT_REF.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o"

echo "Setting Supabase configuration..."

# Set Supabase URL and Anon Key
supabase secrets set SUPABASE_URL="$SUPABASE_URL"
supabase secrets set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"

echo ""
echo "✅ Supabase URL and Anon Key set"
echo ""

# Service Role Key (needs user input)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Service Role Key Required"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Please get your Service Role Key from:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
echo ""
echo "⚠️  WARNING: This is a SECRET key - do not share it!"
echo ""
read -sp "Paste your Service Role Key: " SERVICE_ROLE_KEY
echo ""

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ Service Role Key is required!"
    exit 1
fi

supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
echo "✅ Service Role Key set"
echo ""

# Database URL (needs user input)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  Database URL (Optional but recommended)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Get from: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo "Look for: Connection String > URI"
echo ""
read -p "Paste your Database URL (or press Enter to skip): " DB_URL

if [ ! -z "$DB_URL" ]; then
    supabase secrets set SUPABASE_DB_URL="$DB_URL"
    echo "✅ Database URL set"
else
    echo "⏭️  Skipped Database URL (app will use KV store)"
fi
echo ""

# Optional API Keys
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 Optional API Keys"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The following are optional. Press Enter to skip any."
echo ""

# Function to set optional secret
set_optional_secret() {
    local name=$1
    local description=$2
    
    read -p "$description (or press Enter to skip): " value
    if [ ! -z "$value" ]; then
        supabase secrets set $name="$value"
        echo "✅ $name set"
    else
        echo "⏭️  Skipped $name"
    fi
    echo ""
}

set_optional_secret "OPENAI_API_KEY" "OpenAI API Key (for AI features)"
set_optional_secret "RESEND_API_KEY" "Resend API Key (for emails)"
set_optional_secret "TWILIO_ACCOUNT_SID" "Twilio Account SID (for SMS)"
set_optional_secret "TWILIO_AUTH_TOKEN" "Twilio Auth Token"
set_optional_secret "TWILIO_PHONE_NUMBER" "Twilio Phone Number"
set_optional_secret "GRAINGER_API_KEY" "Grainger API Key (for products)"
set_optional_secret "HOME_DEPOT_API_KEY" "Home Depot API Key"
set_optional_secret "LOWES_API_KEY" "Lowe's API Key"
set_optional_secret "ADMIN_NOTIFICATION_PHONES" "Admin Phone Numbers (comma-separated)"
set_optional_secret "COMPANY_NAME" "Your Company Name"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SECRETS CONFIGURATION COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 View all secrets:"
echo "   supabase secrets list"
echo ""
echo "🚀 Ready to deploy?"
echo "   ./deploy.sh"
echo ""
