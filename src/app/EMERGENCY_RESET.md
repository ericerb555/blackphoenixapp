# 🆘 EMERGENCY RESET - If App Won't Load

## If the app is completely blank or won't load:

### **Option 1: Clear LocalStorage in Console**

1. **Press F12** (opens browser DevTools)
2. **Go to Console tab**
3. **Copy and paste this command:**

```javascript
// EMERGENCY RESET - Clears all app data
localStorage.clear();
sessionStorage.clear();
console.log('✅ All data cleared! Refresh the page (F5) to restart.');
```

4. **Press Enter**
5. **Refresh the page** (press F5)
6. **The app should load fresh**

---

### **Option 2: Clear Specific Keys Only**

```javascript
// Clear only company-related data
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('companies_')) {
    localStorage.removeItem(key);
    console.log('Removed:', key);
  }
});
console.log('✅ Company data cleared! Refresh (F5).');
```

---

### **Option 3: Clear Site Data (Chrome)**

1. **Press F12**
2. **Go to Application tab** (at the top)
3. **On the left, click "Storage"**
4. **Click "Clear site data" button**
5. **Refresh the page** (F5)

---

### **Option 4: Hard Refresh**

- **Windows:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R

---

## **Check for Errors:**

Open Console (F12) and look for:

❌ **Red error messages**
❌ **Syntax errors**
❌ **Failed to fetch**
❌ **JSON.parse errors**

**Copy any error messages and share them with me!**

---

## **Most Common Causes:**

1. **Corrupted localStorage** → Clear it
2. **Cached old code** → Hard refresh
3. **Syntax error in recent changes** → Check console
4. **Infinite loop** → Check console for repeated messages

---

## **After Reset:**

The app should load to the **Command Center** dashboard.

If you had companies before, they're gone (unless you have a backup).

**Start fresh:**
1. Go to Business Profiles Hub
2. Create a new company
3. Test that it persists after refresh

---

## **Still Not Working?**

Tell me:
1. What you see on screen (blank, error, loading forever?)
2. Any error messages in console (F12 → Console tab)
3. What browser you're using

I'll fix it immediately!
