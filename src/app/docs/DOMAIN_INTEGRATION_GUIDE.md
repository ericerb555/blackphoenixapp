# Domain Management - App Integration Guide

## Overview

This guide shows how to integrate and use the domain management system throughout your application.

## 🎯 Integration Scenarios

### 1. Displaying Primary Domain in Branding

```tsx
import { useState, useEffect } from 'react';
import { DomainService } from '../lib/services/domainService';

function CompanyBranding() {
  const [primaryDomain, setPrimaryDomain] = useState(null);

  useEffect(() => {
    loadPrimaryDomain();
  }, []);

  const loadPrimaryDomain = async () => {
    const { data } = await DomainService.getPrimaryDomain();
    setPrimaryDomain(data);
  };

  return (
    <div>
      <h3>Your Primary Domain</h3>
      {primaryDomain ? (
        <p>
          Your application is accessible at: 
          <strong>https://{primaryDomain.domain}</strong>
        </p>
      ) : (
        <p>No primary domain configured. <a href="/domain-management">Add one now</a></p>
      )}
    </div>
  );
}
```

### 2. Domain Selector for Portal Creation

```tsx
import { useState, useEffect } from 'react';
import { DomainService } from '../lib/services/domainService';

function PortalCreationForm() {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    const { data } = await DomainService.getDomains();
    // Only show verified domains
    const verified = data.filter(d => d.status === 'verified');
    setDomains(verified);
  };

  return (
    <div>
      <label>Portal Domain</label>
      <select 
        value={selectedDomain} 
        onChange={(e) => setSelectedDomain(e.target.value)}
      >
        <option value="">Select a domain...</option>
        {domains.map(domain => (
          <option key={domain.id} value={domain.domain}>
            {domain.domain}
          </option>
        ))}
      </select>
      
      {domains.length === 0 && (
        <p className="text-sm text-gray-400">
          No verified domains. <a href="/domain-management">Add a domain first</a>
        </p>
      )}
    </div>
  );
}
```

### 3. Domain Health Status Widget

```tsx
import { useState, useEffect } from 'react';
import { DomainService } from '../lib/services/domainService';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

function DomainHealthStatus() {
  const [stats, setStats] = useState({ verified: 0, pending: 0, failed: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data } = await DomainService.getDomains();
    setStats({
      verified: data.filter(d => d.status === 'verified').length,
      pending: data.filter(d => d.status === 'pending').length,
      failed: data.filter(d => d.status === 'failed').length
    });
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="stat-card">
        <CheckCircle className="text-green-400" />
        <span>{stats.verified} Verified</span>
      </div>
      <div className="stat-card">
        <Clock className="text-yellow-400" />
        <span>{stats.pending} Pending</span>
      </div>
      <div className="stat-card">
        <AlertCircle className="text-red-400" />
        <span>{stats.failed} Failed</span>
      </div>
    </div>
  );
}
```

### 4. Email Configuration with Domain

```tsx
import { DomainService } from '../lib/services/domainService';

async function configureEmailSettings() {
  const { data: primaryDomain } = await DomainService.getPrimaryDomain();
  
  if (primaryDomain) {
    const emailConfig = {
      fromEmail: `noreply@${primaryDomain.domain}`,
      replyTo: `support@${primaryDomain.domain}`,
      domain: primaryDomain.domain
    };
    
    // Save email configuration
    await saveEmailConfig(emailConfig);
  } else {
    console.error('No primary domain configured for email');
  }
}
```

### 5. Custom Portal URLs

```tsx
import { DomainService } from '../lib/services/domainService';

function PortalLinkGenerator({ portalType, customerId }) {
  const [portalUrl, setPortalUrl] = useState('');

  useEffect(() => {
    generateUrl();
  }, [portalType, customerId]);

  const generateUrl = async () => {
    const { data: domains } = await DomainService.getDomains();
    
    // Find domain for this portal type
    const portalDomain = domains.find(d => 
      d.domain.includes(portalType) && d.status === 'verified'
    );

    if (portalDomain) {
      setPortalUrl(`https://${portalDomain.domain}/customer/${customerId}`);
    } else {
      // Fallback to primary domain
      const { data: primary } = await DomainService.getPrimaryDomain();
      setPortalUrl(`https://${primary.domain}/${portalType}/${customerId}`);
    }
  };

  return (
    <div>
      <label>Portal Access Link</label>
      <input type="text" value={portalUrl} readOnly />
      <button onClick={() => navigator.clipboard.writeText(portalUrl)}>
        Copy Link
      </button>
    </div>
  );
}
```

### 6. Domain-Based Routing

```tsx
// In your main App.tsx or routing configuration
import { useEffect, useState } from 'react';
import { DomainService } from './lib/services/domainService';

function App() {
  const [currentDomain, setCurrentDomain] = useState(null);

  useEffect(() => {
    detectCurrentDomain();
  }, []);

  const detectCurrentDomain = async () => {
    const hostname = window.location.hostname;
    const { data: domains } = await DomainService.getDomains();
    
    const matchedDomain = domains.find(d => 
      hostname.includes(d.domain) && d.status === 'verified'
    );
    
    setCurrentDomain(matchedDomain);
  };

  // Route to different app sections based on domain
  if (currentDomain) {
    if (currentDomain.domain.includes('customer')) {
      return <CustomerPortalApp />;
    } else if (currentDomain.domain.includes('vendor')) {
      return <VendorPortalApp />;
    } else if (currentDomain.domain.includes('admin')) {
      return <AdminApp />;
    }
  }

  return <MainApp />;
}
```

### 7. Company Switcher with Domains

```tsx
import { DomainService } from '../lib/services/domainService';

function CompanySwitcher({ companies }) {
  const [companyDomains, setCompanyDomains] = useState({});

  useEffect(() => {
    loadCompanyDomains();
  }, [companies]);

  const loadCompanyDomains = async () => {
    const { data: domains } = await DomainService.getDomains();
    
    // Group domains by company (assuming domain metadata includes companyId)
    const grouped = {};
    domains.forEach(domain => {
      if (domain.companyId) {
        if (!grouped[domain.companyId]) {
          grouped[domain.companyId] = [];
        }
        grouped[domain.companyId].push(domain);
      }
    });
    
    setCompanyDomains(grouped);
  };

  return (
    <div>
      {companies.map(company => (
        <div key={company.id} className="company-card">
          <h3>{company.name}</h3>
          {companyDomains[company.id] && (
            <div className="domains">
              {companyDomains[company.id].map(domain => (
                <span key={domain.id} className="domain-badge">
                  {domain.domain}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 8. DNS Setup Helper Component

```tsx
import { useState } from 'react';
import { Copy, CheckCircle } from 'lucide-react';

function DNSSetupHelper({ dnsRecords }) {
  const [copiedRecord, setCopiedRecord] = useState(null);

  const copyRecord = (value, index) => {
    navigator.clipboard.writeText(value);
    setCopiedRecord(index);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  return (
    <div className="dns-setup">
      <h4>DNS Configuration</h4>
      <p>Add these records to your domain registrar:</p>
      
      {dnsRecords.map((record, index) => (
        <div key={index} className="dns-record">
          <div className="record-type">{record.type}</div>
          <div className="record-details">
            <div>
              <strong>Name:</strong> {record.name}
            </div>
            <div>
              <strong>Value:</strong> {record.value}
            </div>
            <div>
              <strong>TTL:</strong> {record.ttl}
            </div>
          </div>
          <button onClick={() => copyRecord(record.value, index)}>
            {copiedRecord === index ? (
              <CheckCircle className="text-green-400" />
            ) : (
              <Copy />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 9. Domain Import Component

```tsx
import { useState } from 'react';
import { DomainService } from '../lib/services/domainService';
import { Upload, AlertCircle } from 'lucide-react';

function DomainImporter() {
  const [importData, setImportData] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    setImporting(true);
    
    try {
      const domains = JSON.parse(importData);
      const { success, results } = await DomainService.bulkImportDomains(domains);
      
      setResult({
        success,
        imported: results.summary.imported,
        failed: results.summary.failed,
        skipped: results.summary.skipped
      });
    } catch (error) {
      setResult({
        success: false,
        error: 'Invalid JSON format'
      });
    }
    
    setImporting(false);
  };

  return (
    <div className="domain-importer">
      <h3>Import Domains</h3>
      
      <textarea
        value={importData}
        onChange={(e) => setImportData(e.target.value)}
        placeholder='[{"domain": "example.com", "verificationMethod": "dns"}]'
        rows={10}
      />
      
      <button 
        onClick={handleImport} 
        disabled={importing || !importData}
      >
        <Upload /> {importing ? 'Importing...' : 'Import Domains'}
      </button>
      
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <>
              <p>✅ Import completed!</p>
              <ul>
                <li>Imported: {result.imported}</li>
                <li>Skipped: {result.skipped}</li>
                <li>Failed: {result.failed}</li>
              </ul>
            </>
          ) : (
            <p><AlertCircle /> {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

### 10. Domain Verification Status Tracker

```tsx
import { useState, useEffect } from 'react';
import { DomainService } from '../lib/services/domainService';
import { RefreshCw, CheckCircle, Clock, XCircle } from 'lucide-react';

function DomainVerificationTracker({ domainId }) {
  const [domain, setDomain] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadDomain();
  }, [domainId]);

  const loadDomain = async () => {
    const { data: domains } = await DomainService.getDomains();
    const found = domains.find(d => d.id === domainId);
    setDomain(found);
  };

  const verifyDomain = async () => {
    setVerifying(true);
    const { success } = await DomainService.verifyDomain(domainId);
    
    if (success) {
      toast.success('Domain verified!');
      await loadDomain();
    } else {
      toast.error('Verification failed. Check DNS settings.');
    }
    
    setVerifying(false);
  };

  if (!domain) return null;

  return (
    <div className="verification-tracker">
      <div className="status">
        {domain.status === 'verified' && <CheckCircle className="text-green-400" />}
        {domain.status === 'pending' && <Clock className="text-yellow-400" />}
        {domain.status === 'failed' && <XCircle className="text-red-400" />}
        <span>{domain.status}</span>
      </div>
      
      {domain.status === 'pending' && (
        <>
          <p>DNS propagation can take up to 48 hours</p>
          <button onClick={verifyDomain} disabled={verifying}>
            <RefreshCw className={verifying ? 'animate-spin' : ''} />
            {verifying ? 'Verifying...' : 'Check Again'}
          </button>
        </>
      )}
      
      {domain.verifiedAt && (
        <p className="text-sm text-gray-400">
          Verified on {new Date(domain.verifiedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
```

## 🔗 Service Methods Available

```typescript
// Get all domains
DomainService.getDomains(): Promise<{ data: DomainConfig[]; error: string | null }>

// Get primary domain
DomainService.getPrimaryDomain(): Promise<{ data: DomainConfig | null; error: string | null }>

// Add domain
DomainService.addDomain(domain: string, method: 'dns' | 'html'): Promise<{ data: DomainConfig | null; error: string | null }>

// Verify domain
DomainService.verifyDomain(domainId: string): Promise<{ success: boolean; error: string | null }>

// Set primary
DomainService.setPrimaryDomain(domainId: string): Promise<{ success: boolean; error: string | null }>

// Delete domain
DomainService.deleteDomain(domainId: string): Promise<{ success: boolean; error: string | null }>

// Export domains
DomainService.exportDomains(): Promise<{ data: any[] | null; error: string | null }>

// Bulk import
DomainService.bulkImportDomains(domains: any[]): Promise<{ success: boolean; results?: any; error: string | null }>

// Check DNS
DomainService.checkDNS(domain: string): Promise<{ configured: boolean; records: any[] }>
```

## 🎨 Using the Widget

### Compact Mode (for sidebars, panels)
```tsx
import DomainManagerWidget from '../components/DomainManagerWidget';

<DomainManagerWidget 
  compact={true}
  showActions={true}
/>
```

### Full Mode (for dedicated sections)
```tsx
<DomainManagerWidget 
  compact={false}
  showActions={true}
  onDomainClick={(domain) => {
    console.log('Domain clicked:', domain);
    // Navigate or show details
  }}
/>
```

## 🚦 Best Practices

1. **Always check verification status** before using a domain
2. **Cache domain data** to reduce API calls
3. **Handle loading states** gracefully
4. **Provide fallbacks** when no domain is configured
5. **Show clear CTAs** to add domains when needed
6. **Use primary domain** as default for critical operations
7. **Validate domain format** before operations
8. **Handle errors** with user-friendly messages

## 📍 Common Integration Points

- Company Profile → Show primary domain
- Portal Creation → Domain selector
- Email Settings → Use domain for from address
- Branding Manager → Display custom domain
- Dashboard → Domain health widget
- Settings → Link to domain management
- Navigation → Quick domain status
- Footer → Show active domain

## 💡 Pro Tips

1. **Preload domains** on app startup for better UX
2. **Use compact widget** in dashboards and sidebars
3. **Implement domain caching** with 5-minute TTL
4. **Show domain status** in relevant contexts
5. **Provide domain templates** for quick setup
6. **Auto-refresh** domain data after verification
7. **Link to management page** when setup needed
8. **Display DNS instructions** prominently

---

This integration guide provides practical examples for using domains throughout your application. Customize these patterns to fit your specific use cases!
