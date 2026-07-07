# Domain Management - Quick Reference

## 🚀 Quick Start

### Add a Domain
1. Go to `/domain-management`
2. Click "Add Domain"
3. Enter domain name (e.g., `app.example.com`)
4. Choose verification method (DNS or HTML)
5. Follow DNS configuration instructions
6. Click "Verify" when DNS is configured

### Import Domains
1. Click "Import" button
2. Choose format (JSON or CSV)
3. Paste your data
4. Click "Import Domains"

### Export Domains
1. Click "Export" button
2. Choose format (JSON or CSV)
3. File downloads automatically

## 📋 Quick Actions

| Action | Location | Shortcut |
|--------|----------|----------|
| Add Domain | Domain Management Page | "Add Domain" button |
| Verify Domain | Domain card | "Verify" button |
| Set Primary | Verified domain card | "Set Primary" button |
| Delete Domain | Domain card | Trash icon |
| Import | Top toolbar | "Import" button |
| Export | Top toolbar | "Export" button |
| Templates | Top toolbar | "Templates" button |

## 🔧 API Quick Reference

```typescript
// Get all domains
const { data } = await DomainService.getDomains();

// Add domain
const { data } = await DomainService.addDomain('example.com', 'dns');

// Verify domain
const { success } = await DomainService.verifyDomain(domainId);

// Set primary
const { success } = await DomainService.setPrimaryDomain(domainId);

// Delete domain
const { success } = await DomainService.deleteDomain(domainId);

// Export
const { data } = await DomainService.exportDomains();

// Bulk import
const { success, results } = await DomainService.bulkImportDomains([
  { domain: 'example.com', verificationMethod: 'dns' }
]);
```

## 📊 Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| ✅ Verified | Green | Domain is verified and active |
| ⏳ Pending | Yellow | Awaiting DNS configuration |
| ❌ Failed | Red | Verification failed |
| ⭐ Primary | Orange | Primary domain for application |
| 🔒 SSL | Blue | SSL certificate enabled |

## 📝 Import Formats

### JSON
```json
[
  { "domain": "example.com", "verificationMethod": "dns" },
  { "domain": "app.example.com", "verificationMethod": "dns" }
]
```

### CSV
```csv
domain,verificationMethod
example.com,dns
app.example.com,dns
```

## 🎯 Common Tasks

### Setup New Domain
```bash
1. Add domain → 2. Configure DNS → 3. Wait 24-48hrs → 4. Verify → 5. Set as primary (optional)
```

### Migrate Domains
```bash
1. Export from old system → 2. Format as JSON/CSV → 3. Import to new system → 4. Verify all → 5. Set primary
```

### Backup Domains
```bash
1. Export as JSON → 2. Save to secure location → 3. Repeat monthly
```

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| Won't verify | Wait 48hrs for DNS propagation |
| Can't delete | Can't delete primary domain - set another as primary first |
| Import fails | Check format - JSON must be array, CSV needs headers |
| Duplicate error | Domain already exists - check existing domains |

## 🌐 DNS Configuration

### Required Records
```
CNAME @ → plzsvzwwcdopnawtiwzm.supabase.co
CNAME www → plzsvzwwcdopnawtiwzm.supabase.co
TXT _domain-verification → domain-verification=<token>
```

### Common Registrars
- GoDaddy: Domains → DNS Management
- Namecheap: Domain List → Manage → Advanced DNS
- Cloudflare: DNS → Add Record
- Google Domains: DNS → Custom Records

## 🎨 Widget Usage

### Compact Mode (Sidebars)
```tsx
<DomainManagerWidget compact={true} showActions={true} />
```

### Full Mode (Pages)
```tsx
<DomainManagerWidget 
  compact={false}
  showActions={true}
  onDomainClick={(domain) => navigate(`/domains/${domain.id}`)}
/>
```

## 📍 Where to Find It

- **Main Page**: `/domain-management`
- **Owner Dashboard**: Branding section
- **Global Nav**: Admin → Domain Management
- **Company Profile**: Settings → Domains

## ⚡ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + K` | Open domain search |
| `A` | Add new domain |
| `E` | Export domains |
| `I` | Import domains |
| `Esc` | Close modal |

## 💡 Pro Tips

1. **Always backup before bulk operations** - Export before importing
2. **Use templates for consistency** - Apply standard/enterprise templates
3. **Set up www and root** - Add both `example.com` and `www.example.com`
4. **Monitor health regularly** - Check stats dashboard weekly
5. **Document your setup** - Keep notes on which domain serves what

## 🔗 Related Systems

- Company Branding Profile
- Portal Management
- Email Configuration
- API Endpoints
- SSL Certificates

## 📞 Support

- View server logs for errors
- Check browser console
- Review DNS with registrar
- Test with DNS lookup tools
