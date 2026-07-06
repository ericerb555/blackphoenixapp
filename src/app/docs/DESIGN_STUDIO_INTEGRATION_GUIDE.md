# Design Studio Pro - Integration Guide

## 🔧 HOW TO ADD NEW FEATURES TO DESIGN STUDIO

Quick guide to integrate the 3 new components into your Design Studio Pro.

---

## ✅ NEW COMPONENTS CREATED:

1. **`/components/KitchenCabinetDesigner.tsx`** - Kitchen & cabinet layout tool
2. **`/components/ConstructionScheduleGenerator.tsx`** - Project scheduling tool
3. **`/components/BlueprintAnalyzer.tsx`** - Blueprint upload & analysis tool

---

## 📝 STEP 1: IMPORT THE COMPONENTS

**Edit `/pages/DesignStudioPro.tsx`**

Add these imports at the top:

```typescript
import KitchenCabinetDesigner from '../components/KitchenCabinetDesigner';
import ConstructionScheduleGenerator from '../components/ConstructionScheduleGenerator';
import BlueprintAnalyzer from '../components/BlueprintAnalyzer';
```

---

## 📝 STEP 2: ADD STATE VARIABLES

**In the `DesignStudioPro` component, add these state hooks:**

```typescript
const [showKitchenDesigner, setShowKitchenDesigner] = useState(false);
const [showScheduleGenerator, setShowScheduleGenerator] = useState(false);
const [showBlueprintAnalyzer, setShowBlueprintAnalyzer] = useState(false);
```

---

## 📝 STEP 3: ADD TOOLBAR BUTTONS

**Find the toolbar section in the render and add these buttons:**

```typescript
{/* Kitchen Design Button */}
<button
  onClick={() => setShowKitchenDesigner(true)}
  className="p-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-xl transition border border-[#2A2A2A] flex flex-col items-center gap-1"
  title="Kitchen & Cabinet Designer"
>
  <Package className="w-5 h-5 text-orange-500" />
  <span className="text-xs">Kitchen</span>
</button>

{/* Schedule Generator Button */}
<button
  onClick={() => setShowScheduleGenerator(true)}
  className="p-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-xl transition border border-[#2A2A2A] flex flex-col items-center gap-1"
  title="Construction Schedule Generator"
>
  <Calendar className="w-5 h-5 text-blue-500" />
  <span className="text-xs">Schedule</span>
</button>

{/* Blueprint Analyzer Button */}
<button
  onClick={() => setShowBlueprintAnalyzer(true)}
  className="p-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-xl transition border border-[#2A2A2A] flex flex-col items-center gap-1"
  title="Blueprint Analyzer & Reader"
>
  <Upload className="w-5 h-5 text-purple-500" />
  <span className="text-xs">Import</span>
</button>
```

---

## 📝 STEP 4: ADD MODAL COMPONENTS

**At the end of the render (before closing div), add:**

```typescript
{/* Kitchen Designer Modal */}
{showKitchenDesigner && (
  <KitchenCabinetDesigner
    onClose={() => setShowKitchenDesigner(false)}
    onSave={(data) => {
      console.log('Kitchen design saved:', data);
      // Optional: Add saved cabinets to canvas
      toast.success('Kitchen design saved!');
    }}
  />
)}

{/* Schedule Generator Modal */}
{showScheduleGenerator && (
  <ConstructionScheduleGenerator
    onClose={() => setShowScheduleGenerator(false)}
    projectName={currentProject?.name || 'Current Project'}
    onSave={(scheduleData) => {
      console.log('Schedule saved:', scheduleData);
      toast.success('Project schedule saved!');
    }}
  />
)}

{/* Blueprint Analyzer Modal */}
{showBlueprintAnalyzer && (
  <BlueprintAnalyzer
    onClose={() => setShowBlueprintAnalyzer(false)}
    onImport={(blueprintData) => {
      console.log('Blueprint imported:', blueprintData);
      // Optional: Convert blueprint data to canvas elements
      toast.success('Blueprint imported successfully!');
    }}
  />
)}
```

---

## 🎯 THAT'S IT!

**3 simple steps:**
1. Import components
2. Add state
3. Add buttons + modals

**Total time: 5 minutes**

---

## 🚀 OPTIONAL ENHANCEMENTS

### **A. Add to Main Menu**

If you have a menu dropdown, add these items:

```typescript
<DropdownMenuItem onClick={() => setShowKitchenDesigner(true)}>
  <Package className="w-4 h-4 mr-2" />
  Kitchen Designer
</DropdownMenuItem>

<DropdownMenuItem onClick={() => setShowScheduleGenerator(true)}>
  <Calendar className="w-4 h-4 mr-2" />
  Generate Schedule
</DropdownMenuItem>

<DropdownMenuItem onClick={() => setShowBlueprintAnalyzer(true)}>
  <Upload className="w-4 h-4 mr-2" />
  Import Blueprint
</DropdownMenuItem>
```

---

### **B. Add Keyboard Shortcuts**

In your keyboard event handler:

```typescript
case 'KeyK': // K for Kitchen
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    setShowKitchenDesigner(true);
  }
  break;

case 'KeyS': // S for Schedule
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    setShowScheduleGenerator(true);
  }
  break;

case 'KeyI': // I for Import
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    setShowBlueprintAnalyzer(true);
  }
  break;
```

---

### **C. Save Data to Project**

When user saves from a modal, add to project data:

```typescript
const handleKitchenSave = (kitchenData: any) => {
  setCurrentProject({
    ...currentProject,
    kitchenDesign: kitchenData,
    lastModified: new Date()
  });
  toast.success('Kitchen design saved to project!');
};

const handleScheduleSave = (scheduleData: any) => {
  setCurrentProject({
    ...currentProject,
    schedule: scheduleData,
    lastModified: new Date()
  });
  toast.success('Schedule saved to project!');
};

const handleBlueprintImport = (blueprintData: any) => {
  // Convert blueprint analysis to canvas elements
  const newElements = convertBlueprintToElements(blueprintData);
  setElements([...elements, ...newElements]);
  toast.success('Blueprint imported to canvas!');
};
```

---

### **D. Add to Quick Actions Toolbar**

If you have a QuickActionsToolbar component:

```typescript
const quickActions = [
  // ... existing actions
  {
    icon: Package,
    label: 'Kitchen',
    action: () => setShowKitchenDesigner(true),
    color: 'orange'
  },
  {
    icon: Calendar,
    label: 'Schedule',
    action: () => setShowScheduleGenerator(true),
    color: 'blue'
  },
  {
    icon: Upload,
    label: 'Import',
    action: () => setShowBlueprintAnalyzer(true),
    color: 'purple'
  }
];
```

---

## 📦 IMPORT STATEMENT REFERENCE

**Full import section for `/pages/DesignStudioPro.tsx`:**

```typescript
// Existing imports...
import FloorPlan3DViewer from '../components/FloorPlan3DViewer';
import AIVideoUpload from '../components/AIVideoUpload';
import ExportFloorPlanModal from '../components/ExportFloorPlanModal';
// ... etc

// NEW IMPORTS - Add these three lines:
import KitchenCabinetDesigner from '../components/KitchenCabinetDesigner';
import ConstructionScheduleGenerator from '../components/ConstructionScheduleGenerator';
import BlueprintAnalyzer from '../components/BlueprintAnalyzer';
```

---

## ✅ VERIFICATION CHECKLIST

After integration, verify:

- [ ] Kitchen Designer button appears in toolbar
- [ ] Schedule Generator button appears in toolbar
- [ ] Blueprint Analyzer button appears in toolbar
- [ ] Clicking Kitchen button opens modal
- [ ] Clicking Schedule button opens modal
- [ ] Clicking Blueprint button opens modal
- [ ] Modals close properly
- [ ] Save functions work
- [ ] Export functions work
- [ ] No console errors
- [ ] Toast notifications appear

---

## 🎉 DONE!

Your Design Studio Pro now has:

✅ **Kitchen & Cabinet Designer** - Full cabinet layout system  
✅ **Construction Schedule Generator** - Gantt charts + material schedules  
✅ **Blueprint Analyzer** - AI-powered blueprint import  

**Plus all existing features:**
- Floor plans
- Electrical layouts
- Plumbing layouts
- 3D rendering
- Export blueprints
- And 20+ more features!

---

## 🔗 RELATED FILES

**New Components:**
- `/components/KitchenCabinetDesigner.tsx`
- `/components/ConstructionScheduleGenerator.tsx`
- `/components/BlueprintAnalyzer.tsx`

**Main Design Studio:**
- `/pages/DesignStudioPro.tsx`

**Existing Support Components:**
- `/components/MEPLibrary.tsx` (Electrical/Plumbing)
- `/components/FurnitureLibrary.tsx` (Furniture)
- `/components/FloorPlan3DViewer.tsx` (3D rendering)
- `/components/ExportFloorPlanModal.tsx` (Export)
- `/components/MultiStoryManager.tsx` (Multi-floor)

**Documentation:**
- `/docs/DESIGN_STUDIO_COMPLETE_CAPABILITIES.md` (Full feature list)
- `/docs/DESIGN_STUDIO_INTEGRATION_GUIDE.md` (This file)

---

**Ready to integrate! 🚀**
