# Table Component Library

Professional, fully-typed table components for the enterprise business management application.

## 🎊 Status: Phase 6 Tracks A1-A2 Complete

**Phase 5**: All 42 table instances migrated (100%)  
**Phase 6 Track A1**: Column sorting added ✅  
**Phase 6 Track A2**: Client-side pagination added ✅ NEW

## Components

### DataTable
Full-featured table component with custom renderers, sorting, and styling control.

**Location**: `/components/ui/table/DataTable.tsx`

**Features**:
- ✨ **Built-in column sorting** (automatic or controlled)
- ✨ **Built-in client-side pagination** (automatic or controlled)
- Custom column renderers with full JSX support
- Type-safe with TypeScript generics
- Customizable styling (container, header, rows)
- Built-in empty state handling
- Hover effects and row click handlers
- Left/center/right column alignment
- Action columns with buttons
- Status badges and icons
- Loading state integration

**Usage**:
```typescript
import { DataTable } from '../components/ui/table/DataTable';
import type { ColumnDef } from '../components/ui/table/DataTable';

interface RowData {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

const columns: ColumnDef<RowData>[] = [
  {
    header: 'Name',
    accessorKey: 'name',
    cell: (row) => <span className="text-white font-medium">{row.name}</span>,
  },
  {
    header: 'Status',
    accessorKey: 'status',
    cell: (row) => (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
        row.status === 'active' 
          ? 'bg-green-600/20 text-green-400' 
          : 'bg-gray-600/20 text-gray-400'
      }`}>
        {row.status.toUpperCase()}
      </span>
    ),
    align: 'center',
  },
];

<DataTable
  columns={columns}
  data={myData}
  emptyMessage="No data found"
  containerClassName="bg-[#1A1A1A] border-[#2A2A2A]"
  headerClassName="bg-[#0A0A0A] border-[#2A2A2A]"
  rowClassName="hover:bg-[#2A2A2A]/50"
  onRowClick={(row) => console.log('Clicked:', row)}
/>
```

### SimpleTable
Lightweight table for basic use cases.

**Location**: `/components/ui/table/SimpleTable.tsx`

**Usage**:
```typescript
import { SimpleTable } from '../components/ui/table/SimpleTable';

const headers = ['Name', 'Email', 'Role'];
const rows = [
  ['John Doe', 'john@example.com', 'Admin'],
  ['Jane Smith', 'jane@example.com', 'User'],
];

<SimpleTable
  headers={headers}
  rows={rows}
  emptyMessage="No data"
/>
```

## Design System

All table components follow the deep orange dark theme:

- **Primary**: `#ea580c` (deep orange)
- **Background**: `#0A0A0A` (near black)
- **Surface**: `#1A1A1A` (dark gray)
- **Borders**: `#2A2A2A` (medium gray)
- **Text**: White and gray variants
- **Hover**: `#2A2A2A` with 50% opacity

## Migration Status

✅ **100% Complete** - All 42 table instances migrated

### Statistics
- **Files Migrated**: 39 files
- **Tables Replaced**: 42 instances
- **Code Eliminated**: ~3,490+ lines of duplicate HTML
- **Net Reduction**: ~340+ lines
- **Theme Standardization**: 100% deep orange dark theme

See [MIGRATION_TRACKER.md](./MIGRATION_TRACKER.md) for detailed migration history.

See [PHASE5_COMPLETION_SUMMARY.md](./PHASE5_COMPLETION_SUMMARY.md) for complete phase summary.

## Column Definition API

### ColumnDef<T> Interface

```typescript
interface ColumnDef<T> {
  // Required
  header: string;           // Column header text
  accessorKey: keyof T;     // Data property to access
  
  // Optional
  cell?: (row: T) => React.ReactNode;  // Custom cell renderer
  align?: 'left' | 'center' | 'right'; // Column alignment
}
```

### Common Patterns

#### Status Badges
```typescript
{
  header: 'Status',
  accessorKey: 'status',
  cell: (row) => (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
      row.status === 'active' ? 'bg-green-600/20 text-green-400' :
      row.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
      'bg-red-600/20 text-red-400'
    }`}>
      {row.status.toUpperCase()}
    </span>
  ),
}
```

#### Action Buttons
```typescript
{
  header: 'Actions',
  accessorKey: 'id',
  cell: (row) => (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(row.id);
        }}
        className="p-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg"
      >
        <Edit className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(row.id);
        }}
        className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  ),
  align: 'right',
}
```

#### Custom Icons
```typescript
{
  header: 'User',
  accessorKey: 'name',
  cell: (row) => (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full flex items-center justify-center">
        <span className="text-white font-bold text-sm">
          {row.name.charAt(0)}
        </span>
      </div>
      <div>
        <p className="font-medium text-white">{row.name}</p>
        <p className="text-sm text-gray-400">{row.email}</p>
      </div>
    </div>
  ),
}
```

#### Financial Formatting
```typescript
{
  header: 'Amount',
  accessorKey: 'amount',
  cell: (row) => (
    <span className="font-bold text-green-400">
      ${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
    </span>
  ),
  align: 'right',
}
```

#### Progress Bars
```typescript
{
  header: 'Storage',
  accessorKey: 'storageUsed',
  cell: (row) => (
    <div>
      <p className="text-sm text-white">{row.storageUsed} GB</p>
      <p className="text-xs text-gray-400">of {row.storageQuota} GB</p>
      <div className="w-24 h-1 bg-[#2A2A2A] rounded-full mt-1 overflow-hidden">
        <div
          className="h-full bg-orange-600"
          style={{ width: `${(row.storageUsed / row.storageQuota) * 100}%` }}
        />
      </div>
    </div>
  ),
}
```

## Best Practices

1. **Always define interfaces** for row data types
2. **Use TypeScript generics** for type safety: `ColumnDef<YourType>[]`
3. **Stop event propagation** in nested buttons to prevent row clicks
4. **Use className props** for custom styling instead of modifying component
5. **Keep cell renderers simple** - extract complex logic to separate functions
6. **Leverage alignment** for consistent column layout (numbers right, text left)
7. **Use empty messages** to guide users when no data is available

## Component Props

### DataTable Props

```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[];           // Column definitions
  data: T[];                         // Row data array
  emptyMessage?: string;             // Message when data is empty
  containerClassName?: string;       // Table container classes
  headerClassName?: string;          // Header row classes
  rowClassName?: string;             // Body row classes
  onRowClick?: (row: T) => void;    // Row click handler
}
```

### SimpleTable Props

```typescript
interface SimpleTableProps {
  headers: string[];                 // Header labels
  rows: string[][];                  // Row data (2D array)
  emptyMessage?: string;             // Message when rows empty
  className?: string;                // Container classes
}
```

## Files Using DataTable

All 39 migrated files use DataTable. Key examples:

### Pages
- `/pages/Customers.tsx` - Customer management
- `/pages/EmployeeManagement.tsx` - Employee directory
- `/pages/Subscriptions.tsx` - Subscription tracking
- `/pages/CRMManagement.tsx` - CRM contacts
- `/pages/PaymentHub.tsx` - Payment transactions
- `/pages/WorkflowManager.tsx` - Workflow orchestration
- `/pages/OwnersPortalV2.tsx` - Executive dashboard
- `/pages/EnterpriseHR.tsx` - HR management
- `/pages/WorkflowSentinel.tsx` - AI workflow monitoring

### Components
- `/components/SubscriptionHub.tsx` - Subscription management (2 tables)
- `/components/EnterpriseAdminHub.tsx` - Admin dashboard
- `/components/PermissionMatrix.tsx` - Permission comparison
- `/components/RoleManagementSystem.tsx` - User roles
- `/components/ExecutiveDashboardPanel.tsx` - Company metrics
- `/components/InvoiceViewer.tsx` - Invoice line items
- `/components/crm/ContactsList.tsx` - Contact directory
- `/components/crm/PipelineView.tsx` - Sales pipeline

See [MIGRATION_TRACKER.md](./MIGRATION_TRACKER.md) for complete list.

## Loading & Empty States

DataTable integrates with loading components:

```typescript
import { LoadingSpinner } from '../components/ui/loading/LoadingSpinner';
import { EmptyState } from '../components/ui/loading/EmptyState';

// Show loading
{isLoading && <LoadingSpinner />}

// Show table when loaded
{!isLoading && data.length > 0 && (
  <DataTable
    columns={columns}
    data={data}
    emptyMessage="No data found"
  />
)}

// Show empty state
{!isLoading && data.length === 0 && (
  <EmptyState
    icon={Database}
    title="No Data"
    description="Get started by adding items"
  />
)}
```

## 🆕 Column Sorting (Phase 6 Track A1)

DataTable now supports **built-in client-side sorting** with two modes:

### Automatic Sorting (Uncontrolled)

The easiest way - DataTable manages sorting state internally:

```typescript
const columns: DataTableColumn<User>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true, // ← Enable sorting
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
  },
  {
    key: 'createdAt',
    header: 'Created',
    sortable: true,
    // Custom sort for dates
    sortFn: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
  {
    key: 'status',
    header: 'Status',
    // Not sortable - no sortable prop
  },
];

<DataTable
  columns={columns}
  data={users}
  defaultSort={{ key: 'name', direction: 'asc' }} // Optional: set initial sort
/>
```

**Features**:
- Click column header to sort
- Click again to toggle ascending ↔ descending
- Sort icons automatically update (↕️ → ↑ → ↓)
- Orange highlight on active sort column
- Supports string, number, and date sorting out of the box

### Controlled Sorting

For advanced use cases where you need to control sort state:

```typescript
const [sortBy, setSortBy] = useState<string>('name');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

<DataTable
  columns={columns}
  data={users}
  sortBy={sortBy}
  sortDirection={sortDirection}
  onSort={(key, direction) => {
    setSortBy(key);
    setSortDirection(direction);
    // You can also trigger server-side sorting here
  }}
/>
```

### Custom Sort Functions

For complex data types, provide a custom `sortFn`:

```typescript
// Dates
{
  key: 'date',
  header: 'Date',
  sortable: true,
  sortFn: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
}

// Numbers
{
  key: 'amount',
  header: 'Amount',
  sortable: true,
  sortFn: (a, b) => a.amount - b.amount,
}

// Complex objects
{
  key: 'user',
  header: 'User',
  sortable: true,
  sortFn: (a, b) => a.user.lastName.localeCompare(b.user.lastName),
}

// Status priority
{
  key: 'status',
  header: 'Status',
  sortable: true,
  sortFn: (a, b) => {
    const priority = { active: 1, pending: 2, inactive: 3 };
    return priority[a.status] - priority[b.status];
  },
}
```

### Sorting Features

**Built-in Support**:
- ✅ Strings (case-insensitive, locale-aware)
- ✅ Numbers (numeric comparison)
- ✅ Dates (timestamp comparison)
- ✅ Null/undefined handling (always sorted last)
- ✅ Mixed types (fallback to string comparison)

**UI Features**:
- ✅ Visual sort indicators (arrows)
- ✅ Orange highlight on active sort
- ✅ Hover effect on sortable headers
- ✅ Keyboard accessible
- ✅ Non-breaking (existing tables work as-is)

**Performance**:
- Uses `useMemo` for efficient sorting
- Only re-sorts when data or sort changes
- Supports tables with 1000+ rows

### Migration Guide

**Existing tables work without changes!** To add sorting:

1. Add `sortable: true` to columns you want sortable
2. Optionally add `defaultSort` for initial sort
3. For complex data, add custom `sortFn`

That's it! Your table now has sorting.

## 🆕 Client-Side Pagination (Phase 6 Track A2)

DataTable now supports **built-in client-side pagination** that works seamlessly with sorting:

### Automatic Pagination (Uncontrolled)

The easiest way - DataTable manages pagination state internally:

```typescript
<DataTable
  columns={columns}
  data={customers}
  pagination={true}  // ← Enable pagination
  pageSize={25}      // ← Records per page
  pageSizeOptions={[10, 25, 50, 100]}  // ← Page size dropdown options
/>
```

**Features**:
- Page size selector (10, 25, 50, 100)
- First/Last page buttons (⏮ ⏭)
- Previous/Next buttons (◀ ▶)
- Page number buttons (1 2 3 4 5)
- Records counter ("Showing 1 to 25 of 120 results")
- Auto-reset to page 1 when page size changes
- Works perfectly with sorting

### Controlled Pagination (Server-Side)

For server-side pagination, control the state yourself:

```typescript
const [page, setPage] = useState(1);

<DataTable
  columns={columns}
  data={currentPageData}  // Only pass current page data
  pagination={true}
  currentPage={page}
  onPageChange={(newPage) => {
    setPage(newPage);
    fetchDataForPage(newPage);  // Fetch from API
  }}
/>
```

### Sorting + Pagination Combined

They work beautifully together:

```typescript
<DataTable
  columns={[
    { key: 'name', header: 'Name', sortable: true },
    { key: 'amount', header: 'Amount', sortable: true, sortFn: (a, b) => a.amount - b.amount },
    { key: 'date', header: 'Date', sortable: true }
  ]}
  data={transactions}
  defaultSort={{ key: 'date', direction: 'desc' }}  // Sort by date (newest first)
  pagination={true}
  pageSize={50}
/>
```

**Behavior**: Table sorts ALL data first, then shows the current page. Sorting doesn't reset pagination.

### Pagination UI

**Left Side**:
```
Showing 1 to 25 of 120 results    Show: [25 ▼]
```

**Right Side**:
```
⏮ ◀ [1] 2  3  4  5 ▶ ⏭
```

- **Orange active page** indicator
- **Disabled buttons** at boundaries
- **Smart page numbers** - shows up to 5, sliding window for many pages
- **Tooltips** on navigation buttons
- **Keyboard accessible**

### Performance Benefits

Pagination dramatically improves performance for large datasets:

| Dataset Size | Without Pagination | With Pagination (25/page) |
|--------------|-------------------|---------------------------|
| 100 rows     | ~600 DOM nodes    | ~150 DOM nodes            |
| 1000 rows    | ~6,000 DOM nodes  | ~150 DOM nodes (97% reduction) |
| 5000 rows    | ~30,000 DOM nodes | ~150 DOM nodes (99.5% reduction) |

### Migration Guide

**Existing tables work without changes!** To add pagination:

1. Add `pagination={true}` prop
2. Optionally set `pageSize={25}` for initial page size
3. Optionally customize `pageSizeOptions`

That's it! Your table now has sorting + pagination.

## Future Enhancements

Phase 6 remaining tracks:

- [x] **Column sorting** (Track A1 - COMPLETE ✅)
- [x] **Client-side pagination** (Track A2 - COMPLETE ✅)
- [ ] Column filtering (Track A3)
- [ ] Export to CSV/Excel/PDF (Track A4)
- [ ] Server-side pagination
- [ ] Column resizing
- [ ] Bulk selection with checkboxes
- [ ] Virtual scrolling for large datasets
- [ ] Column visibility toggle
- [ ] Saved table configurations

## Support

For questions or issues with table components, see:
- [MIGRATION_TRACKER.md](./MIGRATION_TRACKER.md) - Detailed migration history
- [PHASE5_COMPLETION_SUMMARY.md](./PHASE5_COMPLETION_SUMMARY.md) - Complete phase summary
- Component source code with JSDoc comments

---

**Last Updated**: February 19, 2026  
**Status**: ✅ Production Ready  
**Phase 5**: Complete (100%)  
**Phase 6 Track A1**: Complete (Column Sorting) ✅  
**Phase 6 Track A2**: Complete (Client-Side Pagination) ✅
