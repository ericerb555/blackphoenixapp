@echo off
REM 🚀 Business Hub - Supabase Deployment Script (Windows)

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🚀 Business Hub - Supabase Edge Function Deployment
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Supabase CLI not found!
    echo.
    echo Please install it first:
    echo   Scoop: scoop install supabase
    echo   NPM: npm install -g supabase
    echo.
    exit /b 1
)

echo ✅ Supabase CLI found
echo.

REM Project configuration
set PROJECT_REF=plzsvzwwcdopnawtiwzm
set FUNCTION_NAME=server

REM Check if already linked
if not exist ".supabase\config.toml" (
    echo 🔗 Linking to Supabase project...
    supabase link --project-ref %PROJECT_REF%
    echo.
) else (
    echo ✅ Project already linked
    echo.
)

REM Deploy the function
echo 📦 Deploying edge function '%FUNCTION_NAME%'...
supabase functions deploy %FUNCTION_NAME%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo ✅ DEPLOYMENT SUCCESSFUL!
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo 📍 Function URL:
    echo    https://%PROJECT_REF%.supabase.co/functions/v1/%FUNCTION_NAME%
    echo.
    echo 🔍 Test the health endpoint:
    echo    https://%PROJECT_REF%.supabase.co/functions/v1/%FUNCTION_NAME%/make-server-824f083c/health
    echo.
    echo 📊 View logs:
    echo    supabase functions logs %FUNCTION_NAME%
    echo.
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo ⚙️  NEXT STEPS:
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo 1. Set environment variables (if not already set):
    echo    set-secrets.bat
    echo.
    echo 2. Test the deployment in your browser
    echo.
    echo 3. Open your app and verify database connection!
    echo.
) else (
    echo.
    echo ❌ Deployment failed! Check the errors above.
    echo.
    exit /b 1
)
