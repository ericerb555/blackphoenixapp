# Messaging System - Quick Integration Guide

## Adding Messaging Notification Bell to Layout

### Component: MessagingNotificationBell

**Location:** `/components/MessagingNotificationBell.tsx`

### Basic Usage

```tsx
import MessagingNotificationBell from './components/MessagingNotificationBell';

// In your layout component
<MessagingNotificationBell userId={currentUser.id} />
```

### Integration Example - EnterpriseLayoutNew.tsx

```tsx
import MessagingNotificationBell from './MessagingNotificationBell';

// In the header section, next to AdminNotificationBell
<div className="flex items-center gap-2">
  {/* Messaging Bell */}
  <MessagingNotificationBell userId={currentUser.id} />
  
  {/* Admin Notification Bell */}
  <AdminNotificationBell 
    onClick={() => {
      // Optional: Additional action when bell is clicked
    }}
  />
</div>
```

### Features

✅ **Real-time Updates:** Polls for new messages every 10 seconds
✅ **Unread Badge:** Shows count of unread messages
✅ **Pulse Animation:** Badge pulses when there are unread messages
✅ **Click Navigation:** Clicking navigates to the messaging page
✅ **Hover Effects:** Orange highlight on hover
✅ **Responsive:** Works on all screen sizes

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| userId | string | Yes | - | Current user's ID to fetch unread count |
| className | string | No | '' | Additional CSS classes for styling |

### Styling

The component uses the standard deep orange theme (#ea580c) and matches the existing design system:
- Gray icon by default
- Orange on hover
- Orange badge with pulse animation
- Consistent with other notification elements

## Direct Integration Steps

1. **Import the component:**
```tsx
import MessagingNotificationBell from './components/MessagingNotificationBell';
```

2. **Add to your layout:**
```tsx
<MessagingNotificationBell userId={currentUser.id} />
```

3. **That's it!** The component handles everything else:
   - Fetching unread count
   - Auto-updating
   - Navigation
   - Styling

## Accessing Messaging from Navigation

The messaging system is already configured in the routes:

```typescript
// config/routes.ts
'messaging': { title: 'Messaging', category: 'dashboard' }
```

Users can access messaging by:
1. Clicking the messaging notification bell
2. Navigating to `/messaging` directly
3. Using the navigation menu (if messaging is added to the menu)

## Testing the Integration

1. Add the MessagingNotificationBell to your layout
2. Send a test message to the current user
3. Wait up to 10 seconds for the count to update
4. Verify the badge appears with the correct count
5. Click the bell and verify navigation to messaging page
6. Check that the count decreases after reading messages

## Example: Full Header Integration

```tsx
<header className="bg-[#151515] border-b border-gray-800 px-6 py-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <h1 className="text-xl font-bold">Dashboard</h1>
    </div>
    
    <div className="flex items-center gap-3">
      {/* Search */}
      <input 
        type="search" 
        placeholder="Search..." 
        className="..." 
      />
      
      {/* Messaging Bell with Unread Count */}
      <MessagingNotificationBell userId={currentUser.id} />
      
      {/* Other Notification Bell */}
      <AdminNotificationBell />
      
      {/* User Menu */}
      <UserMenu />
    </div>
  </div>
</header>
```

## Customization

### Custom Styling
```tsx
<MessagingNotificationBell 
  userId={currentUser.id}
  className="ml-4 border border-gray-700"
/>
```

### Different Update Frequency
Edit the component to change polling interval (currently 10 seconds):

```tsx
// In MessagingNotificationBell.tsx
const interval = setInterval(loadUnreadCount, 5000); // 5 seconds instead of 10
```

## Mobile Considerations

The messaging bell is fully responsive and works on mobile devices:
- Touch-friendly size (minimum 44x44px tap target)
- Badge scales appropriately
- Animation performance optimized

## Accessibility

The component includes:
- Proper ARIA labels via `title` attribute
- Keyboard navigation support
- Color contrast compliant
- Screen reader friendly badge text

## Performance

- Minimal re-renders using React state
- Efficient polling with cleanup
- Lightweight API calls
- Optimized animations (CSS-based)

---

**Status:** Ready for Integration ✅
**Last Updated:** February 25, 2026
