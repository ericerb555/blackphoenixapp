# 🌐 Website Settings - Landing Page Editor

## 🎯 Overview

The Website Settings page allows you to edit and preview your landing page content directly from the admin panel. No code required!

## 📍 Access

### Navigation Path:
1. Open the sidebar
2. Hover over **"Tools & Settings"** dropdown
3. Click **"Website Settings"**

### Direct URL:
- `/website-settings`
- `/landing-page-editor` (alias)

## ✨ Features

### 1. **Edit Mode**
Edit all landing page content including:

#### Hero Section
- Main Title
- Subtitle
- CTA Button Text
- CTA Button Link

#### Features (4 cards)
- Feature Title
- Description
- Icon Name (Lucide icons)

#### About Section
- Heading
- Description

#### Contact Information
- Email
- Phone
- Address

### 2. **Preview Mode**
- See exactly how your landing page will look
- Live preview of all changes
- Matches the actual landing page design

### 3. **View Toggle**
Switch between Edit and Preview modes with one click:
- **Edit** - Form-based content editing
- **Preview** - Visual preview of landing page

### 4. **Live Landing Page**
Click "View Live" to open the actual landing page in a new tab

### 5. **Change Tracking**
- Yellow banner appears when you have unsaved changes
- Clear indication of save status
- Reset to defaults option

## 💾 Data Storage

Content is stored in **localStorage** which means:
- ✅ Changes persist across sessions
- ✅ No backend required for basic editing
- ✅ Instant updates
- ℹ️ Per-browser storage (not synced across devices)

## 🎨 Customization Options

### Hero Section
Edit the main headline and call-to-action:
```
Title: "Enterprise Business Management"
Subtitle: "Complete solution for managing your construction and service business"
CTA Text: "Get Started"
CTA Link: "/login"
```

### Features
Four feature cards with:
- Custom titles
- Descriptions
- Icon names (Lucide library)

**Available Icons:**
- Building2 (Projects)
- Users (Team)
- BarChart3 (Analytics)
- Zap (Automation)
- Calendar (Scheduling)
- FileText (Documents)
- And many more...

### Contact Info
Update your business contact information:
- Email address
- Phone number
- Physical address

## 🚀 Usage Guide

### Step 1: Navigate to Website Settings
Go to **Tools & Settings** → **Website Settings**

### Step 2: Edit Content
1. Click fields to edit text
2. Make your changes
3. Yellow banner appears showing unsaved changes

### Step 3: Preview
1. Click **Preview** tab to see how it looks
2. Switch back to **Edit** to make more changes
3. Click **View Live** to see actual landing page

### Step 4: Save
1. Click **Save Changes** button
2. Changes are applied immediately
3. Green "All changes saved" indicator appears

### Step 5: Verify
1. Click **View Live** to open landing page
2. Verify your changes appear correctly
3. Landing page updates instantly

## 🔄 Reset to Defaults

If you want to start over:
1. Click **Reset to Defaults** button
2. Confirm the action
3. Click **Save Changes** to apply

Default content will be restored.

## 📱 Responsive Design

The editor and preview are fully responsive:
- Desktop: Full layout with side-by-side editing
- Tablet: Optimized columns
- Mobile: Stacked layout

## 🎯 Quick Tips

### 1. Icon Names
Use Lucide React icon names:
- Find icons at: https://lucide.dev/icons
- Use exact names: `Building2`, `Users`, `Mail`, etc.
- Case-sensitive!

### 2. Preview Often
Click Preview mode frequently to see how changes look

### 3. Save Early, Save Often
Save your changes regularly to avoid losing work

### 4. Test on Live Page
Always verify changes on the actual landing page after saving

### 5. Mobile Preview
The landing page is responsive - check it on mobile devices too

## 🛠️ Technical Details

### Component Location
- **Page:** `/pages/WebsiteSettings.tsx`
- **Route:** `/website-settings` or `/landing-page-editor`
- **Navigation:** Tools & Settings dropdown

### Data Structure
```typescript
{
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
  },
  features: Array<{
    title: string;
    description: string;
    icon: string;
  }>,
  about: {
    heading: string;
    description: string;
  },
  contact: {
    email: string;
    phone: string;
    address: string;
  }
}
```

### Storage Key
`landingPageContent` in localStorage

## 📊 Features Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Edit Hero Section | ✅ | Title, subtitle, CTA |
| Edit Features | ✅ | 4 customizable cards |
| Edit About Section | ✅ | Heading and description |
| Edit Contact Info | ✅ | Email, phone, address |
| Live Preview | ✅ | Real-time preview mode |
| Change Tracking | ✅ | Unsaved changes indicator |
| Save Changes | ✅ | Instant save to localStorage |
| Reset to Defaults | ✅ | Restore original content |
| View Live Page | ✅ | Open landing page in new tab |
| Icon Customization | ✅ | Lucide icon names |
| Form Validation | ✅ | Input validation |
| Responsive Design | ✅ | Works on all devices |

## 🔮 Future Enhancements

Potential features for future updates:
- [ ] Image upload for hero section
- [ ] Color scheme customization
- [ ] Add/remove feature cards (currently fixed at 4)
- [ ] Multiple landing page templates
- [ ] A/B testing support
- [ ] Analytics integration
- [ ] SEO metadata editor
- [ ] Multi-language support
- [ ] Custom CSS editor
- [ ] Sync with backend database

## 🆘 Troubleshooting

### Changes not appearing on live page?
1. Make sure you clicked "Save Changes"
2. Hard refresh the landing page (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for errors

### Lost changes?
- Changes are saved per-browser in localStorage
- Use the same browser to access saved content
- Clear browser data will reset content

### Preview looks different from live page?
- Preview is simplified - live page has full styling
- Some animations won't show in preview
- Check live page for accurate representation

### Reset didn't work?
1. Click Reset to Defaults
2. You must click Save Changes to apply
3. Refresh the page if needed

## ✅ Success Indicators

You'll know it's working when:
- ✅ Yellow banner shows when you have unsaved changes
- ✅ Green "All changes saved" appears after saving
- ✅ Preview mode shows your updated content
- ✅ Live landing page displays new content
- ✅ Changes persist after page refresh

## 🎉 Getting Started

**Ready to customize your landing page?**

1. Navigate to: **Tools & Settings** → **Website Settings**
2. Make your edits
3. Click Preview to check
4. Save Changes
5. View Live to verify

That's it! Your landing page is now customized. 🚀

---

**Need Help?** Check the in-app tooltips and help text for guidance on each field.
