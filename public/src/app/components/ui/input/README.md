# Input Component Library

A comprehensive collection of form input components for the enterprise business management application. These components eliminate duplication across 100+ input instances found in 40+ files.

## 🎯 Purpose

Replace duplicate input field implementations with a unified, theme-aware component library that provides:
- **Consistency**: Single source of truth for all input styling
- **Accessibility**: ARIA labels, error states, and keyboard navigation
- **Flexibility**: Multiple variants, sizes, and customization options
- **Theme Support**: Dark and light variants matching the app's design system

## 📦 Components

### TextInput
Standard text input field with icon support.

**Features:**
- Dark/light variants
- Small/medium/large sizes
- Start/end icon support
- Error states with messages
- Helper text
- Label with required indicator

**Usage:**
```tsx
import { TextInput } from './components/ui/input';

// Basic
<TextInput placeholder="Enter text" />

// With label and validation
<TextInput 
  label="Email Address"
  type="email"
  required
  error={!!errors.email}
  errorMessage={errors.email}
/>

// With icons
<TextInput 
  startIcon={<Search className="w-4 h-4" />}
  placeholder="Search..."
/>
```

### TextArea
Multi-line text input for longer content.

**Features:**
- Dark/light variants
- Configurable rows
- Resize control (none/vertical/horizontal/both)
- Error states
- Character counter support (via helper text)

**Usage:**
```tsx
import { TextArea } from './components/ui/input';

// Basic
<TextArea 
  label="Description"
  rows={5}
  placeholder="Enter description..."
/>

// With validation
<TextArea 
  label="Project Scope"
  required
  error={!value}
  errorMessage="Description is required"
  helperText={`${value.length}/500 characters`}
/>
```

### Select
Native select dropdown with custom styling.

**Features:**
- Dark/light variants
- Small/medium/large sizes
- Options as prop or children
- Custom chevron icon
- Error states

**Usage:**
```tsx
import { Select } from './components/ui/input';

// With options prop
<Select 
  label="Status"
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]}
/>

// With children
<Select label="Country" required>
  <option value="">Select a country</option>
  <option value="us">United States</option>
  <option value="ca">Canada</option>
</Select>
```

### Checkbox
Standard checkbox with label and description.

**Features:**
- Dark/light variants
- Small/medium/large sizes
- Label and description text
- Error states
- Controlled/uncontrolled modes

**Usage:**
```tsx
import { Checkbox } from './components/ui/input';

// Simple
<Checkbox label="I agree to the terms" />

// With description
<Checkbox 
  label="Email Notifications"
  description="Receive email alerts for important updates"
  checked={emailEnabled}
  onChange={(e) => setEmailEnabled(e.target.checked)}
/>

// With validation
<Checkbox 
  label="Required field"
  error={!checked}
  errorMessage="You must accept this"
/>
```

### ToggleSwitch
iOS-style toggle switch (custom orange pattern).

**Features:**
- Small/medium/large sizes
- Orange/blue/green colors
- Label and description
- Left/right label positioning
- Accessibility support

**Usage:**
```tsx
import { ToggleSwitch } from './components/ui/input';

// Basic
<ToggleSwitch label="Enable feature" />

// With description
<ToggleSwitch 
  label="Auto Backup"
  description="Every day at 3:00 AM"
  checked={autoBackup}
  onChange={(e) => setAutoBackup(e.target.checked)}
/>

// Label on right
<ToggleSwitch 
  label="Notifications"
  labelPosition="right"
/>
```

### NumberInput
Number input with optional increment/decrement buttons.

**Features:**
- Dark/light variants
- Unit/prefix display (e.g., "$", "kg", "%")
- Increment/decrement buttons
- Min/max/step support
- Custom increment/decrement handlers

**Usage:**
```tsx
import { NumberInput } from './components/ui/input';

// Basic
<NumberInput 
  label="Age"
  min={0}
  max={120}
/>

// With unit
<NumberInput 
  label="Price"
  unit="$"
  unitPosition="left"
  step={0.01}
/>

// With buttons
<NumberInput 
  label="Quantity"
  showButtons
  min={0}
  value={quantity}
  onChange={(e) => setQuantity(Number(e.target.value))}
/>
```

## 🎨 Variants

### Dark Variant (Default)
- Background: `#0A0A0A`
- Border: `#2A2A2A`
- Text: White
- Focus: Orange ring (`#ea580c`)
- Primary color: Orange (`#ea580c`)

### Light Variant
- Background: White
- Border: `#d1d5db` (gray-300)
- Text: `#111827` (gray-900)
- Focus: Blue ring
- Primary color: Blue

## 📏 Sizes

All components support three size variants:
- **sm**: Small - Compact spacing, smaller text
- **md**: Medium - Default, balanced spacing
- **lg**: Large - Generous spacing, larger text

## ♿ Accessibility

All components include:
- Proper ARIA attributes (`aria-invalid`, `aria-describedby`)
- Label associations
- Keyboard navigation support
- Focus indicators
- Screen reader support
- Error announcements

## 🔄 Migration Guide

### Finding Duplicates

Input fields are duplicated across 40+ files:

**TextInputs**: Found in form components, modals, settings pages
**TextAreas**: `ClientWorkRequestForm.tsx`, `AIPromptTemplateDesigner.tsx`, various modals
**Selects**: Filter dropdowns, settings selectors, form fields
**Checkboxes**: Settings, permissions, filters
**Toggles**: `PaymentNotificationSystem.tsx`, `SystemBackupRecovery.tsx`
**Numbers**: Measurement workflows, pricing inputs

### Migration Steps

1. **Import the component:**
```tsx
import { TextInput, TextArea, Select, Checkbox, ToggleSwitch, NumberInput } from './components/ui/input';
```

2. **Replace raw HTML inputs:**

**Before:**
```tsx
<input 
  type="text"
  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
  placeholder="Enter text"
/>
```

**After:**
```tsx
<TextInput placeholder="Enter text" />
```

3. **Migrate textareas:**

**Before:**
```tsx
<textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white resize-none"
  rows={4}
/>
```

**After:**
```tsx
<TextArea 
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
/>
```

4. **Migrate selects:**

**Before:**
```tsx
<select className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

**After:**
```tsx
<Select options={[
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' }
]} />
```

5. **Migrate toggle switches:**

**Before:**
```tsx
<label className="relative inline-flex items-center cursor-pointer">
  <input type="checkbox" className="sr-only peer" defaultChecked />
  <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
</label>
```

**After:**
```tsx
<ToggleSwitch defaultChecked />
```

## 🎯 Benefits

1. **Reduced Code**: Eliminate 100+ duplicate input implementations
2. **Consistency**: All inputs follow the same design system
3. **Maintainability**: Update styles in one place
4. **Type Safety**: Full TypeScript support with prop types
5. **Accessibility**: Built-in ARIA support and keyboard navigation
6. **Developer Experience**: Clear API, comprehensive docs, helpful examples

## 📊 Impact

- **Files with duplicates**: 40+ files
- **Duplicate instances**: 100+ input elements
- **Lines of code saved**: ~2,000+ lines
- **Components created**: 6 flexible input components

## 🔍 Component Locations

Key files with input field duplications:
- `/components/forms/ClientWorkRequestForm.tsx` - 12+ textareas, multiple inputs
- `/components/payments/PaymentNotificationSystem.tsx` - 4 toggle switches
- `/components/crm/ContactsList.tsx` - 4 select dropdowns
- `/pages/MasterScheduling.tsx` - 4 checkboxes
- `/pages/CADSystem.tsx` - Multiple checkboxes
- `/components/cv/CVMeasurementWorkflow.tsx` - Number inputs

## 🚀 Next Steps

After input field consolidation, continue Phase 2 with:
1. **Modal/Dialog components** - Consolidate modal patterns
2. **Card components** - Unify card layouts
3. **Table components** - Standardize data tables
4. **Form layouts** - Create form wrapper components

## 📝 Notes

- All components use `forwardRef` for ref forwarding
- Dark variant is default (matches 90% of app usage)
- Light variant available for specific UI sections
- Components are fully controlled or uncontrolled
- Full compatibility with form libraries (React Hook Form, Formik, etc.)
