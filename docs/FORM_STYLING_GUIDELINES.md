# Form Styling Guidelines

## Problem Statement

Input fields across the application were appearing with invisible or hard-to-read text due to missing text color classes. This document provides guidelines to ensure consistent, visible form styling.

## Solution

Use the standardized styling utilities from `@/lib/styles` to ensure all form inputs have proper visibility and consistent appearance.

## Key Rules

### 1. Always Include Text Color

**❌ Wrong:**

```jsx
<input className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
```

**✅ Correct:**

```jsx
<input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
```

### 2. Use Standardized Classes

**❌ Inconsistent:**

```jsx
<input className="w-full p-2 border rounded text-black" />
<input className="w-full px-4 py-3 border-2 rounded-md text-gray-800" />
```

**✅ Consistent:**

```jsx
import { formInputClasses } from '@/lib/styles';

<input className={formInputClasses.input} />
<input className={formInputClasses.input} />
```

### 3. Use Reusable Components

**✅ Best Practice:**

```jsx
import { Input, Textarea, Select } from '@/lib/styles';

<Input
  label="Customer Name"
  placeholder="Enter customer name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

<Textarea
  label="Description"
  rows={3}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>

<Select
  label="Status"
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]}
  value={status}
  onChange={(e) => setStatus(e.target.value)}
/>
```

## Standard Classes Reference

### Input Fields

```jsx
// Regular input
formInputClasses.input;
// Result: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"

// Search input (with left padding for icon)
formInputClasses.searchInput;
// Result: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"

// Textarea
formInputClasses.textarea;

// Select dropdown
formInputClasses.select;

// Error state
formInputClasses.inputError;

// Disabled state
formInputClasses.inputDisabled;
```

### Buttons

```jsx
buttonClasses.primary; // Blue button
buttonClasses.secondary; // Gray outlined button
buttonClasses.danger; // Red button
buttonClasses.success; // Green button
```

### Layout

```jsx
layoutClasses.modalOverlay;
layoutClasses.modalContent;
layoutClasses.card;
gridClasses.twoColumn;
gridClasses.threeColumn;
```

## Migration Guide

When creating new forms or fixing existing ones:

1. **Import the utilities:**

   ```jsx
   import { formInputClasses, Input, Textarea, Select } from "@/lib/styles";
   ```

2. **Replace custom input styling:**

   ```jsx
   // Before
   <input className="w-full px-3 py-2 border rounded" />

   // After
   <input className={formInputClasses.input} />
   ```

3. **Or use the component approach:**
   ```jsx
   // Instead of manual input
   <Input label="Customer Name" placeholder="Enter name" />
   ```

## Checklist for New Pages

- [ ] All input fields have visible text color (`text-gray-900` or equivalent)
- [ ] Search inputs use `formInputClasses.searchInput` for proper icon spacing
- [ ] Consistent focus states (`focus:ring-2 focus:ring-blue-500`)
- [ ] Proper placeholder color (`placeholder-gray-500`)
- [ ] Error states handled with `formInputClasses.inputError`
- [ ] Buttons use standardized button classes
- [ ] Form layout uses grid classes for consistency

## Testing

Always test form visibility in:

- Light mode
- Dark mode (if applicable)
- Different browsers
- With actual user input

This ensures text remains visible and readable across all scenarios.
