# Modal Component Library - Quick Reference

## Import

```tsx
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmModal,
  FormModal,
  InfoModal
} from '@/components/ui/modal';
```

## Component Overview

| Component | Purpose | Use Case |
|-----------|---------|----------|
| `Modal` | Base modal container | Custom modal layouts |
| `ModalHeader` | Modal header section | Title, subtitle, icon |
| `ModalBody` | Scrollable content area | Modal content |
| `ModalFooter` | Action buttons footer | Cancel/Confirm actions |
| `ConfirmModal` | Pre-built confirmation | Delete, approve, reject |
| `FormModal` | Pre-built form modal | Add/edit forms |
| `InfoModal` | Pre-built info display | Help, notifications |

## Common Patterns

### 1. Confirmation Dialog (Danger)

```tsx
const [showDelete, setShowDelete] = useState(false);

<ConfirmModal
  isOpen={showDelete}
  onClose={() => setShowDelete(false)}
  onConfirm={handleDelete}
  title="Delete Customer"
  message="Are you sure you want to delete this customer? This action cannot be undone."
  variant="danger"
  confirmText="Delete"
  cancelText="Cancel"
/>
```

### 2. Add/Edit Form Modal

```tsx
const [showEdit, setShowEdit] = useState(false);
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [loading, setLoading] = useState(false);

const handleSubmit = async (e: FormEvent) => {
  setLoading(true);
  // Save logic here
  setLoading(false);
  setShowEdit(false);
};

<FormModal
  isOpen={showEdit}
  onClose={() => setShowEdit(false)}
  onSubmit={handleSubmit}
  title="Edit Customer"
  subtitle="Update customer information"
  icon={User}
  isLoading={loading}
>
  <div className="space-y-4">
    <TextInput
      label="Name"
      value={name}
      onChange={setName}
      required
    />
    <TextInput
      label="Email"
      type="email"
      value={email}
      onChange={setEmail}
      required
    />
  </div>
</FormModal>
```

### 3. Custom Modal Layout

```tsx
const [showCustom, setShowCustom] = useState(false);

<Modal
  isOpen={showCustom}
  onClose={() => setShowCustom(false)}
  size="lg"
>
  <ModalHeader
    title="Custom Modal"
    subtitle="With custom content"
    icon={Settings}
  />
  <ModalBody>
    <div className="space-y-4">
      {/* Your custom content */}
    </div>
  </ModalBody>
  <ModalFooter>
    <SecondaryButton onClick={() => setShowCustom(false)}>
      Cancel
    </SecondaryButton>
    <PrimaryButton onClick={handleSave}>
      Save Changes
    </PrimaryButton>
  </ModalFooter>
</Modal>
```

### 4. Info/Help Modal

```tsx
const [showInfo, setShowInfo] = useState(false);

<InfoModal
  isOpen={showInfo}
  onClose={() => setShowInfo(false)}
  title="About This Feature"
  icon={HelpCircle}
>
  <div className="space-y-3 text-gray-300">
    <p>This feature allows you to...</p>
    <ul className="list-disc list-inside space-y-1 ml-2">
      <li>Create new items</li>
      <li>Edit existing items</li>
      <li>Delete items</li>
    </ul>
  </div>
</InfoModal>
```

## Props Reference

### Modal

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | required | Controls modal visibility |
| `onClose` | function | required | Close handler |
| `children` | ReactNode | required | Modal content |
| `size` | 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full' | 'md' | Modal width |
| `showCloseButton` | boolean | true | Show X button |
| `closeOnOverlayClick` | boolean | true | Close on backdrop click |
| `closeOnEsc` | boolean | true | Close on ESC key |
| `className` | string | '' | Additional CSS classes |

### ConfirmModal

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | required | Controls modal visibility |
| `onClose` | function | required | Close handler |
| `onConfirm` | function | required | Confirm action handler |
| `title` | string | required | Modal title |
| `message` | string | required | Confirmation message |
| `variant` | 'default' \| 'danger' \| 'success' | 'default' | Visual variant |
| `confirmText` | string | 'Confirm' | Confirm button text |
| `cancelText` | string | 'Cancel' | Cancel button text |
| `isLoading` | boolean | false | Loading state |

### FormModal

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | required | Controls modal visibility |
| `onClose` | function | required | Close handler |
| `onSubmit` | function | required | Form submit handler |
| `title` | string | required | Modal title |
| `subtitle` | string | - | Optional subtitle |
| `icon` | LucideIcon | - | Optional header icon |
| `submitText` | string | 'Save' | Submit button text |
| `cancelText` | string | 'Cancel' | Cancel button text |
| `isLoading` | boolean | false | Loading state |
| `disabled` | boolean | false | Disable submit |
| `size` | 'sm' \| 'md' \| 'lg' \| 'xl' | 'md' | Modal width |
| `children` | ReactNode | required | Form content |

## Size Reference

| Size | Max Width | Best For |
|------|-----------|----------|
| `sm` | 28rem (448px) | Confirmations, alerts |
| `md` | 42rem (672px) | Simple forms, info |
| `lg` | 56rem (896px) | Complex forms, lists |
| `xl` | 72rem (1152px) | Multi-column layouts |
| `full` | 80rem (1280px) | Large data tables, grids |

## Styling Classes

All modals use the deep orange dark theme:

- Background: `bg-[#1A1A1A]`
- Borders: `border-[#2A2A2A]`
- Overlay: `bg-black/80`
- Text: `text-white`, `text-gray-400`, `text-gray-300`
- Primary accent: `#ea580c`

## Best Practices

1. **State Management**: Use `useState` for modal visibility
2. **Loading States**: Always show loading indicators for async operations
3. **Validation**: Validate forms before submission
4. **Error Handling**: Show error messages using toast notifications
5. **Accessibility**: Use descriptive titles and ARIA labels
6. **Close Behavior**: Disable `closeOnOverlayClick` for forms to prevent data loss
7. **Size Selection**: Choose the smallest size that fits your content
8. **Button Text**: Use clear, action-oriented button labels

## Migration Guide

### Before (Old Pattern)

```tsx
{showModal && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
    <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-2xl w-full">
      <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Title</h2>
        <button onClick={() => setShowModal(false)}>
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>
      <div className="p-6">Content</div>
      <div className="p-6 border-t border-[#2A2A2A] flex justify-end gap-3">
        <button onClick={() => setShowModal(false)}>Cancel</button>
        <button onClick={handleSave}>Save</button>
      </div>
    </div>
  </div>
)}
```

### After (New Pattern)

```tsx
<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
  <ModalHeader title="Title" />
  <ModalBody>Content</ModalBody>
  <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSave} />
</Modal>
```

Or even simpler with `ConfirmModal`:

```tsx
<ConfirmModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handleSave}
  title="Title"
  message="Content"
/>
```

## Integration with Input Library

Modals work seamlessly with the input component library:

```tsx
<FormModal isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} title="Add Item">
  <div className="space-y-4">
    <TextInput label="Name" value={name} onChange={setName} />
    <TextArea label="Description" value={desc} onChange={setDesc} />
    <Select
      label="Category"
      value={category}
      onChange={setCategory}
      options={categories}
    />
    <Checkbox
      label="Active"
      checked={active}
      onChange={setActive}
    />
  </div>
</FormModal>
```
