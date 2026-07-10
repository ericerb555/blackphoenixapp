# Input Components - Quick Reference

**Fast lookup guide for migrating duplicate inputs to the component library.**

## 📦 Import

```tsx
import { 
  TextInput, 
  TextArea, 
  Select, 
  Checkbox, 
  ToggleSwitch, 
  NumberInput 
} from './components/ui/input';
```

## 🔄 Quick Migrations

### TextInput

**Before:**
```tsx
<input 
  type="text"
  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:ring-2 focus:ring-orange-500/50"
  placeholder="Enter text"
  value={value}
  onChange={onChange}
/>
```

**After:**
```tsx
<TextInput 
  placeholder="Enter text"
  value={value}
  onChange={onChange}
/>
```

---

### TextArea

**Before:**
```tsx
<textarea
  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white resize-none"
  rows={4}
  value={value}
  onChange={onChange}
/>
```

**After:**
```tsx
<TextArea 
  rows={4}
  value={value}
  onChange={onChange}
/>
```

---

### Select

**Before:**
```tsx
<select className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

**After (Method 1 - Children):**
```tsx
<Select>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</Select>
```

**After (Method 2 - Options Prop):**
```tsx
<Select options={[
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' }
]} />
```

---

### Checkbox

**Before:**
```tsx
<input 
  type="checkbox" 
  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-orange-600"
  defaultChecked 
/>
```

**After:**
```tsx
<Checkbox defaultChecked />
```

**With Label:**
```tsx
<Checkbox label="I agree to the terms" />
```

---

### ToggleSwitch

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

**With Label:**
```tsx
<ToggleSwitch 
  label="Enable notifications"
  description="Receive email alerts"
/>
```

---

### NumberInput

**Before:**
```tsx
<input 
  type="number"
  step="0.1"
  min="0"
  max="1"
  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
  value={value}
  onChange={onChange}
/>
```

**After:**
```tsx
<NumberInput 
  step={0.1}
  min={0}
  max={1}
  value={value}
  onChange={onChange}
/>
```

**With Unit:**
```tsx
<NumberInput 
  label="Price"
  unit="$"
  unitPosition="left"
  step={0.01}
/>
```

## 🎨 Common Patterns

### With Label and Required

```tsx
<TextInput 
  label="Email Address"
  type="email"
  required
/>
```

### With Validation Error

```tsx
<TextInput 
  label="Email"
  error={!!errors.email}
  errorMessage={errors.email}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

### With Helper Text

```tsx
<TextInput 
  label="Username"
  helperText="Only letters, numbers, and underscores"
/>
```

### With Icons

```tsx
import { Search, Mail } from 'lucide-react';

<TextInput 
  startIcon={<Search className="w-4 h-4" />}
  placeholder="Search..."
/>

<TextInput 
  endIcon={<Mail className="w-4 h-4" />}
  type="email"
  placeholder="Email"
/>
```

### Different Sizes

```tsx
<TextInput size="sm" />  {/* Small */}
<TextInput size="md" />  {/* Medium (default) */}
<TextInput size="lg" />  {/* Large */}
```

### Light Variant

```tsx
<TextInput variant="light" />
<TextArea variant="light" />
<Select variant="light" />
<Checkbox variant="light" />
```

## 🔍 Find & Replace Patterns

### Pattern 1: Dark Input (Most Common)

**Find:**
```
className=".*bg-\[#0A0A0A\].*border-\[#2A2A2A\].*"
```

**Replace with:** `<TextInput />`

### Pattern 2: Light Input

**Find:**
```
className=".*bg-white.*border-gray-300.*"
```

**Replace with:** `<TextInput variant="light" />`

### Pattern 3: Toggle Switch

**Find:**
```
<input type="checkbox" className="sr-only peer"
```

**Replace with:** `<ToggleSwitch`

### Pattern 4: Textarea

**Find:**
```
<textarea.*className=".*bg-\[#0A0A0A\].*"
```

**Replace with:** `<TextArea`

### Pattern 5: Select

**Find:**
```
<select.*className=".*bg-\[#0A0A0A\].*"
```

**Replace with:** `<Select`

## 🚨 Migration Checklist

For each file you migrate:

- [ ] Import the input components at the top
- [ ] Replace duplicate inputs with components
- [ ] Preserve all existing props (value, onChange, etc.)
- [ ] Add labels if they were separate before
- [ ] Test the form/feature functionality
- [ ] Check visual appearance matches original
- [ ] Verify error states still work
- [ ] Run build to catch TypeScript errors
- [ ] Test on mobile if responsive

## ⚠️ Watch Out For

1. **Custom onChange handlers**: Preserve them!
   ```tsx
   // Keep the logic
   onChange={(e) => {
     setCustomValue(e.target.value);
     validateField(e.target.value);
   }}
   ```

2. **Refs**: Use forwardRef if needed
   ```tsx
   const inputRef = useRef<HTMLInputElement>(null);
   <TextInput ref={inputRef} />
   ```

3. **Form libraries**: Components are compatible
   ```tsx
   // React Hook Form
   <TextInput {...register('email')} />
   
   // Formik
   <TextInput {...formik.getFieldProps('email')} />
   ```

4. **Controlled vs Uncontrolled**: Both work
   ```tsx
   // Controlled
   <TextInput value={value} onChange={onChange} />
   
   // Uncontrolled
   <TextInput defaultValue="initial" />
   ```

5. **Label positioning**: Flexible
   ```tsx
   // Internal label
   <TextInput label="Name" />
   
   // External label (if you need custom styling)
   <label>Name</label>
   <TextInput />
   ```

## 💡 Pro Tips

1. **Batch similar components**: Replace all TextInputs in a file at once
2. **Test incrementally**: Build after each file to catch issues early
3. **Use TypeScript**: Let it guide you with prop types
4. **Start simple**: Begin with settings/modals, not complex forms
5. **Keep variants consistent**: Don't mix dark/light unnecessarily

## 🔗 More Info

- Full documentation: `/components/ui/input/README.md`
- Migration tracker: `/components/ui/input/MIGRATION_TRACKER.md`
- Component source: `/components/ui/input/[ComponentName].tsx`

## 🆘 Common Issues

**Issue**: "Cannot find module './components/ui/input'"
- **Fix**: Check import path from your file location

**Issue**: Type error on onChange
- **Fix**: Components use standard React event types

**Issue**: Styling looks different
- **Fix**: Check variant prop (dark vs light)

**Issue**: Label not showing
- **Fix**: Add `label` prop to component

**Issue**: Can't pass ref
- **Fix**: Components support forwardRef, use normally

## ✅ Quick Test

After migration, verify:
1. ✅ Form submits with correct values
2. ✅ Validation errors display
3. ✅ Visual appearance matches original
4. ✅ Keyboard navigation works
5. ✅ No console errors
6. ✅ Build succeeds
