@echo off
REM 🔐 Business Hub - Set Supabase Secrets (Windows)

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔐 Business Hub - Environment Variables Setup
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Project configuration
set PROJECT_REF=plzsvzwwcdopnawtiwzm
set SUPABASE_URL=https://%PROJECT_REF%.supabase.co
set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o

echo Setting Supabase configuration...

REM Set Supabase URL and Anon Key
supabase secrets set SUPABASE_URL=%SUPABASE_URL%
supabase secrets set SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%

echo.
echo ✅ Supabase URL and Anon Key set
echo.

REM Service Role Key
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔑 Service Role Key Required
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Please get your Service Role Key from:
echo https://supabase.com/dashboard/project/%PROJECT_REF%/settings/api
echo.
echo ⚠️  WARNING: This is a SECRET key - do not share it!
echo.

set /p SERVICE_ROLE_KEY="Paste your Service Role Key: "

if "%SERVICE_ROLE_KEY%"=="" (
    echo ❌ Service Role Key is required!
    exit /b 1
)

supabase secrets set SUPABASE_SERVICE_ROLE_KEY=%SERVICE_ROLE_KEY%
echo ✅ Service Role Key set
echo.

REM Database URL (optional)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🗄️  Database URL (Optional but recommended)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Get from: https://supabase.com/dashboard/project/%PROJECT_REF%/settings/database
echo Look for: Connection String ^> URI
echo.

set /p DB_URL="Paste your Database URL (or press Enter to skip): "

if not "%DB_URL%"=="" (
    supabase secrets set SUPABASE_DB_URL=%DB_URL%
    echo ✅ Database URL set
) else (
    echo ⏭️  Skipped Database URL
)
echo.

REM Optional API Keys
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔌 Optional API Keys
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo The following are optional. Press Enter to skip any.
echo.

REM OpenAI
set /p OPENAI_KEY="OpenAI API Key (for AI features, or press Enter to skip): "
if not "%OPENAI_KEY%"=="" (
    supabase secrets set OPENAI_API_KEY=%OPENAI_KEY%
    echo ✅ OPENAI_API_KEY set
) else (
    echo ⏭️  Skipped OPENAI_API_KEY
)
echo.

REM Resend
set /p RESEND_KEY="Resend API Key (for emails, or press Enter to skip): "
if not "%RESEND_KEY%"=="" (
    supabase secrets set RESEND_API_KEY=%RESEND_KEY%
    echo ✅ RESEND_API_KEY set
) else (
    echo ⏭️  Skipped RESEND_API_KEY
)
echo.

REM Twilio
set /p TWILIO_SID="Twilio Account SID (for SMS, or press Enter to skip): "
if not "%TWILIO_SID%"=="" (
    supabase secrets set TWILIO_ACCOUNT_SID=%TWILIO_SID%
    
    set /p TWILIO_TOKEN="Twilio Auth Token: "
    supabase secrets set TWILIO_AUTH_TOKEN=%TWILIO_TOKEN%
    
    set /p TWILIO_PHONE="Twilio Phone Number: "
    supabase secrets set TWILIO_PHONE_NUMBER=%TWILIO_PHONE%
    
    echo ✅ Twilio credentials set
) else (
    echo ⏭️  Skipped Twilio
)
echo.

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✅ SECRETS CONFIGURATION COMPLETE!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 📋 View all secrets:
echo    supabase secrets list
echo.
echo 🚀 Ready to deploy?
echo    deploy.bat
echo.
