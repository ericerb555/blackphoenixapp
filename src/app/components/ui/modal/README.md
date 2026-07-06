# Modal Component Library - README

## Overview

The Modal Component Library provides a comprehensive set of reusable modal components for the enterprise business management application. Built with React and TypeScript, these components follow the deep orange dark theme (#ea580c) design system and offer consistent UX patterns across the entire application.

## Features

### Core Features
- ✅ **Responsive Design** - Works seamlessly across all screen sizes
- ✅ **Keyboard Navigation** - ESC to close, Tab navigation support
- ✅ **Click-Outside Handling** - Configurable overlay click behavior
- ✅ **Body Scroll Lock** - Prevents background scrolling when modal is open
- ✅ **Loading States** - Built-in loading indicators for async operations
- ✅ **TypeScript Support** - Full type safety with comprehensive interfaces
- ✅ **Accessible** - ARIA labels and semantic HTML
- ✅ **Theme Consistent** - Deep orange dark theme throughout

### Component Architecture

```
/components/ui/modal/
├── Modal.tsx              # Base modal container
├── ModalHeader.tsx        # Header with title, subtitle, icon
├── ModalBody.tsx          # Scrollable content area
├── ModalFooter.tsx        # Action buttons footer
├── ConfirmModal.tsx       # Pre-built confirmation dialog
├── FormModal.tsx          # Pre-built form modal
├── InfoModal.tsx          # Pre-built info modal
├── index.ts               # Barrel export
├── QUICK_REFERENCE.md     # Quick reference guide
├── README.md              # This file
└── MIGRATION_TRACKER.md   # Migration progress tracking
```

## Installation

Components are already installed in `/components/ui/modal/`. Import them:

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
// or
import { ConfirmModal, FormModal, InfoModal } from '@/components/ui/modal';
```

## Component Documentation

### Base Components

#### Modal
The foundation modal component with overlay, positioning, and close handling.

**Props:**
- `isOpen: boolean` - Controls visibility
- `onClose: () => void` - Close handler
- `children: ReactNode` - Modal content
- `size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'` - Width (default: 'md')
- `showCloseButton?: boolean` - Show X button (default: true)
- `closeOnOverlayClick?: boolean` - Click outside to close (default: true)
- `closeOnEsc?: boolean` - ESC key to close (default: true)
- `className?: string` - Additional CSS classes

#### ModalHeader
Consistent header section with title, subtitle, and optional icon.

**Props:**
- `title: string` - Main title (required)
- `subtitle?: string` - Optional subtitle
- `icon?: LucideIcon` - Optional icon component
- `className?: string` - Additional CSS classes

#### ModalBody
Scrollable content area with proper padding and overflow handling.

**Props:**
- `children: ReactNode` - Body content (required)
- `className?: string` - Additional CSS classes
- `noPadding?: boolean` - Remove default padding (default: false)

#### ModalFooter
Action buttons footer with consistent layout.

**Props:**
- `onCancel?: () => void` - Cancel button handler
- `onConfirm?: () => void` - Confirm button handler
- `cancelText?: string` - Cancel button text (default: 'Cancel')
- `confirmText?: string` - Confirm button text (default: 'Confirm')
- `isLoading?: boolean` - Show loading state (default: false)
- `disabled?: boolean` - Disable confirm button (default: false)
- `children?: ReactNode` - Custom footer content
- `className?: string` - Additional CSS classes
- `variant?: 'default' | 'danger'` - Visual variant (default: 'default')

### Pre-built Modals

#### ConfirmModal
Ready-to-use confirmation dialog for destructive or important actions.

**Props:**
- `isOpen: boolean` - Controls visibility (required)
- `onClose: () => void` - Close handler (required)
- `onConfirm: () => void` - Confirm action handler (required)
- `title: string` - Dialog title (required)
- `message: string` - Confirmation message (required)
- `confirmText?: string` - Confirm button text (default: 'Confirm')
- `cancelText?: string` - Cancel button text (default: 'Cancel')
- `variant?: 'default' | 'danger' | 'success'` - Visual variant (default: 'default')
- `isLoading?: boolean` - Show loading state (default: false)

**Variants:**
- `default` - Blue info icon, standard buttons
- `danger` - Red warning icon, red confirm button
- `success` - Green checkmark icon, green confirm button

#### FormModal
Pre-built modal optimized for forms with submit handling and validation support.

**Props:**
- `isOpen: boolean` - Controls visibility (required)
- `onClose: () => void` - Close handler (required)
- `onSubmit: (e: FormEvent) => void` - Form submit handler (required)
- `title: string` - Modal title (required)
- `subtitle?: string` - Optional subtitle
- `icon?: LucideIcon` - Optional header icon
- `submitText?: string` - Submit button text (default: 'Save')
- `cancelText?: string` - Cancel button text (default: 'Cancel')
- `isLoading?: boolean` - Show loading state (default: false)
- `disabled?: boolean` - Disable submit button (default: false)
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Modal width (default: 'md')
- `children: ReactNode` - Form fields (required)

**Features:**
- Wraps content in `<form>` element
- Prevents default form submission
- Disables overlay click to prevent data loss
- Integrates seamlessly with input components

#### InfoModal
Simple modal for displaying information or help content.

**Props:**
- `isOpen: boolean` - Controls visibility (required)
- `onClose: () => void` - Close handler (required)
- `title: string` - Modal title (required)
- `children: ReactNode` - Info content (required)
- `icon?: LucideIcon` - Optional header icon (default: Info icon)
- `buttonText?: string` - Action button text (default: 'Got it')
- `size?: 'sm' | 'md' | 'lg'` - Modal width (default: 'md')

## Usage Examples

### 1. Delete Confirmation

```tsx
import { useState } from 'react';
import { ConfirmModal } from '@/components/ui/modal';
import { toast } from 'sonner@2.0.3';

export function CustomerList() {
  const [showDelete, setShowDelete] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCustomer(selectedCustomer.id);
      toast.success('Customer deleted successfully');
      setShowDelete(false);
    } catch (error) {
      toast.error('Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Your component UI */}
      <ConfirmModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete ${selectedCustomer?.name}? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </>
  );
}
```

### 2. Add/Edit Form

```tsx
import { useState, FormEvent } from 'react';
import { FormModal } from '@/components/ui/modal';
import { TextInput, TextArea, Select } from '@/components/ui/input';
import { User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function AddCustomerModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    setIsLoading(true);
    try {
      await createCustomer({ name, email, phone, notes, status });
      toast.success('Customer added successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to add customer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Add New Customer"
      subtitle="Enter customer information"
      icon={User}
      submitText="Add Customer"
      isLoading={isLoading}
      size="lg"
    >
      <div className="space-y-4">
        <TextInput
          label="Name"
          value={name}
          onChange={setName}
          placeholder="John Doe"
          required
        />
        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="john@example.com"
          required
        />
        <TextInput
          label="Phone"
          type="tel"
          value={phone}
          onChange={setPhone}
          placeholder="(555) 123-4567"
        />
        <Select
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'pending', label: 'Pending' }
          ]}
        />
        <TextArea
          label="Notes"
          value={notes}
          onChange={setNotes}
          placeholder="Additional information..."
          rows={4}
        />
      </div>
    </FormModal>
  );
}
```

### 3. Custom Layout Modal

```tsx
import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export function SettingsModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader
        title="Settings"
        subtitle="Configure your preferences"
        icon={Settings}
      />
      <ModalBody noPadding>
        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-64 border-r border-[#2A2A2A] p-4">
            {/* Navigation tabs */}
          </div>
          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Settings content */}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <SecondaryButton onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PrimaryButton onClick={handleSave}>
          Save Changes
        </PrimaryButton>
      </ModalFooter>
    </Modal>
  );
}
```

## Integration with Existing Components

### With Input Component Library

The modal library integrates seamlessly with the input component library:

```tsx
<FormModal {...props}>
  <div className="space-y-4">
    <TextInput label="Field 1" value={v1} onChange={setV1} />
    <Select label="Field 2" value={v2} onChange={setV2} options={opts} />
    <Checkbox label="Field 3" checked={v3} onChange={setV3} />
    <TextArea label="Field 4" value={v4} onChange={setV4} />
  </div>
</FormModal>
```

### With Button Component Library

All modal footers use the button component library:

```tsx
<ModalFooter>
  <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
  <PrimaryButton onClick={onSave} isLoading={loading}>Save</PrimaryButton>
</ModalFooter>
```

## Design System

### Colors
- Background: `#1A1A1A`
- Secondary background: `#0F0F0F`
- Borders: `#2A2A2A`
- Overlay: `rgba(0, 0, 0, 0.8)`
- Primary accent: `#ea580c` (deep orange)
- Text primary: `white`
- Text secondary: `#9CA3AF` (gray-400)
- Text tertiary: `#D1D5DB` (gray-300)

### Spacing
- Modal padding: `1.5rem` (24px)
- Content spacing: `1rem` (16px)
- Border radius: `1rem` (16px) for modals, `0.5rem` (8px) for buttons

### Typography
- Title: `text-2xl font-bold`
- Subtitle: `text-sm text-gray-400`
- Body: `text-gray-300`

## Best Practices

1. **State Management**: Always use `useState` to control modal visibility
2. **Loading States**: Show loading indicators for all async operations
3. **Error Handling**: Use toast notifications for errors
4. **Form Validation**: Validate before submission, disable submit on invalid
5. **Prevent Data Loss**: Disable `closeOnOverlayClick` for forms
6. **Size Selection**: Use the smallest size that fits content comfortably
7. **Button Labels**: Use clear, action-oriented text
8. **Accessibility**: Provide descriptive titles and ARIA labels

## Migration Strategy

See `MIGRATION_TRACKER.md` for detailed migration progress and file tracking.

### Priority Levels
1. **High**: Frequently used modals (confirmations, forms)
2. **Medium**: Occasionally used modals (settings, info)
3. **Low**: Rarely used or specialized modals

### Migration Steps
1. Identify modal usage in file
2. Replace with appropriate modal component
3. Update state management if needed
4. Test functionality
5. Update migration tracker

## Performance

- Modals are lazy-loaded and only render when `isOpen` is true
- Body scroll lock is efficiently managed with cleanup
- Event listeners are properly cleaned up on unmount
- No unnecessary re-renders with proper memo usage

## Browser Support

- Chrome/Edge: ✅ Latest 2 versions
- Firefox: ✅ Latest 2 versions
- Safari: ✅ Latest 2 versions
- Mobile browsers: ✅ iOS Safari, Chrome Mobile

## Future Enhancements

- [ ] Animation variants (slide, fade, scale)
- [ ] Stacking modals support
- [ ] Drawer variant (slide from side)
- [ ] Full-screen mobile optimization
- [ ] Focus trap implementation
- [ ] Customizable z-index

## Support

For questions or issues, refer to:
- `QUICK_REFERENCE.md` - Common patterns and examples
- `MIGRATION_TRACKER.md` - Migration progress
- Phase 2 completion documentation - Input library integration

## Version

Current Version: 1.0.0
Created: Phase 3 - Component Architecture Refactoring
