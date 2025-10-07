# Accessibility Testing Guide for Clyne Paper CRM

## Quick Start

You now have two accessibility testing tools to ensure your UI changes meet readability and contrast standards:

### 1. Browser Console Tool (Immediate Testing)

1. Start your CRM application:

   ```bash
   npm run dev
   ```

2. Open your CRM in the browser (http://localhost:3000)

3. Open Developer Tools (F12)

4. In the Console tab, load the testing script:

   ```javascript
   // Copy and paste the contents of frontend/accessibility-tester.js
   // Or use this shortcut:
   fetch("/accessibility-tester.js")
     .then((r) => r.text())
     .then(eval);
   ```

5. Run comprehensive test:
   ```javascript
   AccessibilityTester.runFullTest();
   ```

### 2. Automated Test Suite

Run the test suite:

```bash
cd frontend
npm test accessibility.test.js
```

## Specific Tests for Payment Terms Feature

### Testing Your Recent Changes

Since you implemented customer payment terms, test these specific UI elements:

1. **Customer Creation Modal**:

   - Payment terms dropdown accessibility
   - Label associations
   - Keyboard navigation

2. **Invoice Creation Modal**:
   - Due date field contrast
   - Auto-calculation announcements
   - Error message readability

### Browser Testing Commands

```javascript
// Test payment terms specifically
AccessibilityTester.testPaymentTermsAccessibility();

// Test color contrast only
AccessibilityTester.testColorContrast();

// Test form fields only
AccessibilityTester.testFormAccessibility();
```

## Common Issues and Solutions

### Color Contrast Issues

**Problem**: Text contrast ratio below 4.5:1
**Solution**:

- Use Tailwind's `text-gray-900` for dark text on white
- Use `text-white` on `bg-blue-600` or darker backgrounds
- Avoid `text-gray-400` on white backgrounds

**Example fixes**:

```jsx
// ❌ Poor contrast
<p className="text-gray-400">Payment terms</p>

// ✅ Good contrast
<p className="text-gray-700">Payment terms</p>
```

### Form Accessibility Issues

**Problem**: Form fields without labels
**Solution**: Add `aria-label` or associate with `<label>` elements

```jsx
// ❌ Missing label
<select name="paymentTerms">
  <option value="30">30 days</option>
</select>

// ✅ Accessible label
<select name="paymentTerms" aria-label="Default payment terms in days">
  <option value="30">30 days</option>
</select>
```

### Payment Terms Specific Accessibility

**Auto-calculated due dates** should announce changes:

```jsx
<input
  type="date"
  value={dueDate}
  aria-describedby="due-date-help"
/>
<div id="due-date-help" className="sr-only">
  Due date automatically calculated based on {customerPaymentTerms} day payment terms
</div>
```

## WCAG Compliance Checklist

### AA Level (Required)

- [x] Color contrast ≥ 4.5:1 for normal text
- [x] Color contrast ≥ 3:1 for large text (18px+)
- [x] All form fields have labels
- [x] Keyboard navigation works
- [x] Focus indicators are visible

### AAA Level (Recommended)

- [ ] Color contrast ≥ 7:1 for normal text
- [ ] Color contrast ≥ 4.5:1 for large text
- [ ] Content can be zoomed to 200% without scrolling

## Testing Workflow

### For Each UI Change:

1. **Before Committing**:

   ```javascript
   AccessibilityTester.runFullTest();
   ```

2. **Check Specific Areas**:

   - If you changed buttons: Test color contrast
   - If you added forms: Test form accessibility
   - If you modified modals: Test keyboard navigation

3. **Fix Common Issues**:
   - Replace `text-gray-400` with `text-gray-700`
   - Add `aria-label` to unlabeled inputs
   - Ensure focus indicators are visible

### Automated Testing Integration

Add to your package.json scripts:

```json
{
  "scripts": {
    "test:accessibility": "jest accessibility.test.js",
    "test:all": "jest && npm run test:accessibility"
  }
}
```

## Quick Reference: Tailwind Accessible Color Combinations

### Text on White Background

- ✅ `text-gray-900` (21:1 ratio)
- ✅ `text-gray-800` (12.6:1 ratio)
- ✅ `text-gray-700` (9.5:1 ratio)
- ⚠️ `text-gray-600` (5.7:1 ratio) - borderline
- ❌ `text-gray-500` (3.9:1 ratio) - fails AA
- ❌ `text-gray-400` (2.8:1 ratio) - fails AA

### White Text on Colored Backgrounds

- ✅ `text-white bg-blue-600` (5.9:1 ratio)
- ✅ `text-white bg-red-600` (5.4:1 ratio)
- ✅ `text-white bg-green-600` (4.6:1 ratio)
- ❌ `text-white bg-yellow-400` (1.8:1 ratio) - fails

### Button Combinations

```jsx
// ✅ Primary button
<button className="bg-blue-600 text-white hover:bg-blue-700">

// ✅ Secondary button
<button className="bg-gray-200 text-gray-900 hover:bg-gray-300">

// ✅ Danger button
<button className="bg-red-600 text-white hover:bg-red-700">
```

## Integration with Your Development Process

1. **Install once** - The tools are now set up
2. **Test during development** - Use browser console tool while coding
3. **Validate before commits** - Run automated tests
4. **Monitor continuously** - Include in CI/CD pipeline

The accessibility testing is now integrated with your payment terms feature and ready to validate that your text and UI elements meet WCAG standards for readability and contrast!
