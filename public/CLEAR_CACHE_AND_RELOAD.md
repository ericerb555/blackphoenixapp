# How to See the Detailed Materials & Labor

Your localStorage has the old demo data cached. Follow these steps:

## Option 1: Clear and Reload (Recommended)
1. Open browser DevTools (F12)
2. Go to **Application** tab (or **Storage** in Firefox)
3. Find **Local Storage** in the left sidebar
4. Click on your site URL
5. Find the key `pipeline-items-demo` and **DELETE IT**
6. Refresh the page (F5)
7. Click the **"Load Test Data"** button

## Option 2: Just Click Load Test Data
1. Click the green **"Load Test Data"** button in the pipeline
2. Wait for "Loaded 5 test projects!" message
3. Refresh the page

## What You Should See After Reloading
Each quote should show:
- **Kitchen Remodel**: 31 Materials, 14 Labor items, ~$28,000
- **HVAC System**: 32 Materials, 14 Labor items, ~$24,000  
- **Deck Construction**: 15 Materials, 9 Labor items, ~$18,000
- **Roof Repair**: 18 Materials, 11 Labor items, ~$12,000
- **Painting**: 12 Materials, 8 Labor items, ~$8,500

## Why This Happened
The demo data was updated to use `generateDemoQuote()`, but your browser was loading the old cached version from localStorage that had empty material/labor arrays.
