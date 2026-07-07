# Standard Button Component - Design System

## Overview

The `StandardButton` component is the **official standardized button design** used across the entire application. This design is based on the CRM Management specialized CRM button style and provides a consistent, beautiful, and interactive button experience.

## ✅ MANDATORY USAGE

**FROM NOW ON, ALL NEW BUTTONS MUST USE THIS STANDARD DESIGN.**

## Component Location

```
/components/ui/button/StandardButton.tsx
```

## Two Variants

### 1. StandardButton (Full-width with description)
Perfect for navigation, feature selection, and primary actions.

### 2. CompactStandardButton (Inline, no description)
Perfect for action buttons like "Add", "Edit", "Delete", "Save", etc.

---

## Usage Examples

### Standard Button (Navigation/Feature Selection)

```tsx
import { StandardButton } from './components/ui/button/StandardButton';
import { Building2 } from 'lucide-react';

<StandardButton
  onClick={() => console.log('clicked')}
  color="blue"
  icon={<Building2 className="w-5 h-5" />}
  label="Condo Association"
  description="Property Management"
  active={false}
  showChevron={true}
/>
```

### Compact Button (Actions)

```tsx
import { CompactStandardButton } from './components/ui/button/StandardButton';
import { Plus } from 'lucide-react';

<CompactStandardButton
  onClick={() => addItem()}
  color="green"
  icon={<Plus className="w-4 h-4" />}
  label="Add Product"
  size="md"
/>
```

---

## Props

### StandardButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onClick` | `() => void` | - | Click handler |
| `color` | `'blue' \| 'purple' \| 'green' \| 'orange' \| 'red' \| 'teal' \| 'pink' \| 'yellow'` | `'blue'` | Color scheme |
| `icon` | `ReactNode` | - | Icon component (Lucide React) |
| `label` | `string` | **required** | Button label text |
| `description` | `string` | - | Subtitle text below label |
| `active` | `boolean` | `false` | Active/selected state |
| `badge` | `string` | - | Badge text (e.g., "NEW") |
| `showChevron` | `boolean` | `true` | Show chevron arrow |
| `disabled` | `boolean` | `false` | Disabled state |
| `className` | `string` | `''` | Additional CSS classes |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `fullWidth` | `boolean` | `true` | Full width or auto width |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type |

### CompactStandardButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onClick` | `() => void` | - | Click handler |
| `color` | `'blue' \| 'purple' \| 'green' \| 'orange' \| 'red' \| 'teal' \| 'pink' \| 'yellow'` | `'blue'` | Color scheme |
| `icon` | `ReactNode` | - | Icon component (Lucide React) |
| `label` | `string` | **required** | Button label text |
| `disabled` | `boolean` | `false` | Disabled state |
| `className` | `string` | `''` | Additional CSS classes |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type |

---

## Color Schemes

Each color has two states (active and inactive) with beautiful gradient effects:

- **Blue** - Primary actions, navigation (`from-blue-500 via-cyan-500 to-blue-600`)
- **Purple** - Special features, premium content (`from-purple-500 via-pink-500 to-purple-600`)
- **Green** - Success actions, add/create (`from-green-500 via-emerald-500 to-green-600`)
- **Orange** - Upgrade, premium features (`from-orange-500 via-red-500 to-orange-600`)
- **Red** - Delete, destructive actions (`from-red-500 via-rose-500 to-red-600`)
- **Teal** - Alternative actions (`from-teal-500 via-cyan-500 to-teal-600`)
- **Pink** - Highlighted features (`from-pink-500 via-rose-500 to-pink-600`)
- **Yellow** - Warnings, notifications (`from-yellow-500 via-amber-500 to-yellow-600`)

---

## Visual Features

### Inactive State (Default)
- Subtle gradient background (10% opacity)
- Border with 30% opacity
- Hover effects:
  - Background gradient increases to 20% opacity
  - Border opacity increases to 50%
  - Shadow appears
  - Slight scale increase (102%)
  - Text changes to white

### Active State
- Full gradient background
- 2px border
- Large shadow with glow effect
- Scale increase (105%)
- Animated chevron (pulse)
- ✨ Sparkle emoji indicator
- Icon background with white overlay

### Transitions
- Smooth 300ms duration
- All properties animated
- Scale, shadow, color, border

---

## Size Variants

### Small (`size="sm"`)
- Padding: `px-3 py-2`
- Text: `text-xs`
- Icon padding: `p-1.5`
- Description: `text-[10px]`

### Medium (`size="md"`) - Default
- Padding: `px-4 py-3`
- Text: `text-sm`
- Icon padding: `p-2`
- Description: `text-xs`

### Large (`size="lg"`)
- Padding: `px-5 py-4`
- Text: `text-base`
- Icon padding: `p-2.5`
- Description: `text-sm`

---

## Real-World Examples

### Navigation Menu (Specialized CRM)

```tsx
<div className="space-y-3">
  <StandardButton
    onClick={() => setView('condo')}
    color="blue"
    icon={<Building2 className="w-5 h-5" />}
    label="Condo Association"
    description="Property Management"
    active={view === 'condo'}
  />
  
  <StandardButton
    onClick={() => setView('portfolio')}
    color="purple"
    icon={<Briefcase className="w-5 h-5" />}
    label="Portfolio Management"
    description="Investment Properties"
    active={view === 'portfolio'}
  />
  
  <StandardButton
    onClick={() => setView('builder')}
    color="green"
    icon={<Settings className="w-5 h-5" />}
    label="CRM System Builder"
    description="Custom CRM Tools"
    active={view === 'builder'}
    badge="NEW"
  />
</div>
```

### Action Buttons

```tsx
<div className="flex items-center gap-3">
  <CompactStandardButton
    onClick={() => addProduct()}
    color="green"
    icon={<Plus className="w-4 h-4" />}
    label="Add Product"
  />
  
  <CompactStandardButton
    onClick={() => exportData()}
    color="blue"
    icon={<Download className="w-4 h-4" />}
    label="Export"
  />
  
  <CompactStandardButton
    onClick={() => deleteSelected()}
    color="red"
    icon={<Trash2 className="w-4 h-4" />}
    label="Delete"
  />
</div>
```

### Form Submit Button

```tsx
<CompactStandardButton
  type="submit"
  color="orange"
  icon={<Check className="w-4 h-4" />}
  label="Save Changes"
  size="lg"
/>
```

---

## Color Usage Guidelines

### Recommended Use Cases

| Color | Use For |
|-------|---------|
| **Blue** | Primary navigation, default actions, information |
| **Purple** | Premium features, special sections, portfolio |
| **Green** | Add/Create actions, success, confirmations |
| **Orange** | Upgrades, premium packages, warnings |
| **Red** | Delete, cancel, destructive actions |
| **Teal** | Alternative options, secondary navigation |
| **Pink** | Highlighted features, favorites, social |
| **Yellow** | Caution, pending states, notifications |

---

## Migration Guide

### Old Button Style ❌

```tsx
<button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white">
  Add Product
</button>
```

### New Standard Style ✅

```tsx
<CompactStandardButton
  color="green"
  icon={<Plus className="w-4 h-4" />}
  label="Add Product"
/>
```

---

## Components Already Using Standard Buttons

1. ✅ `/pages/CRMManagement.tsx` - Specialized CRM section
2. ✅ `/components/VendorAdvertisingManagement.tsx` - Navigation tabs and action buttons

---

## Files Modified

### Created:
- `/components/ui/button/StandardButton.tsx` - Component
- `/components/ui/button/STANDARD_BUTTON_GUIDE.md` - This documentation

### Updated:
- `/components/VendorAdvertisingManagement.tsx` - Migrated to standard buttons

---

## Best Practices

1. **Always use an icon** - Buttons look better and are more recognizable with icons
2. **Choose appropriate colors** - Follow the color usage guidelines
3. **Use active state for selections** - Show which option is currently selected
4. **Add descriptions for navigation** - Help users understand what each button does
5. **Use compact buttons for actions** - Keep action buttons smaller and inline
6. **Consistent sizing** - Use `md` size for most cases, `lg` for important actions
7. **Badge for new features** - Use `badge="NEW"` to highlight new functionality

---

## Accessibility

- Keyboard navigable (standard button behavior)
- Disabled state clearly indicated
- High contrast in active state
- Clear hover feedback
- Semantic button element

---

## Browser Support

- All modern browsers
- Tailwind CSS v4 required
- CSS transitions and transforms
- Gradient backgrounds
- Box shadows

---

## Questions?

Refer to the implementation in:
1. `/components/ui/button/StandardButton.tsx` for the component code
2. `/pages/CRMManagement.tsx` lines 644-740 for real-world usage examples
3. `/components/VendorAdvertisingManagement.tsx` for recent implementation

---

**Remember: This is now the STANDARD button design. All future buttons should use this component!**
