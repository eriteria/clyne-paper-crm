# Loading System Documentation

This CRM application includes a comprehensive loading system with two types of loading indicators:

## 1. Page Navigation Loading Bar

A subtle blue progress bar appears at the top of the page when navigating between pages.

### Features:

- **Automatic**: Shows automatically when clicking links or navigating
- **Non-blocking**: Doesn't prevent user interaction
- **Smooth animation**: Uses NProgress library for smooth transitions
- **Dark mode support**: Automatically adjusts colors for dark mode

### Configuration:

The progress bar is configured in `src/components/ProgressBar.tsx` with these settings:

- **Speed**: 500ms animation duration
- **Minimum**: Shows at least 30% progress initially
- **No spinner**: Clean bar without spinner for minimal distraction

## 2. Loading Overlay for Long Operations

A centered loading modal with spinner for operations that require user to wait.

### Usage in Components:

```tsx
import { useAsyncAction } from "@/hooks/useAsyncAction";

function MyComponent() {
  const { executeWithLoading } = useAsyncAction();

  const handleLongOperation = async () => {
    await executeWithLoading(
      async () => {
        // Your async operation here
        const result = await apiClient.post("/some-endpoint", data);
        return result;
      },
      "Saving changes..." // Optional loading message
    );
  };

  return <button onClick={handleLongOperation}>Save Changes</button>;
}
```

### Manual Loading Control:

```tsx
import { useLoading } from "@/hooks/useLoading";

function MyComponent() {
  const { setLoading, setLoadingMessage } = useLoading();

  const handleManualLoading = async () => {
    setLoadingMessage("Processing data...");
    setLoading(true);

    try {
      // Your operation
      await someOperation();
    } finally {
      setLoading(false);
    }
  };
}
```

## File Structure:

- `src/components/ProgressBar.tsx` - Page navigation progress bar
- `src/components/LoadingIndicator.tsx` - Modal loading overlay
- `src/hooks/useLoading.tsx` - Loading state context and provider
- `src/hooks/useAsyncAction.tsx` - Utility hook for async operations
- `src/app/globals.css` - NProgress styling
- `src/app/layout.tsx` - Providers setup

## Styling:

The loading bar uses Tailwind's blue color scheme:

- **Light mode**: `blue-500` (#3b82f6)
- **Dark mode**: `blue-400` (#60a5fa)

The overlay uses a subtle backdrop blur effect with transparency for a modern look.

## Best Practices:

1. **Page navigation**: Automatic - no code needed
2. **Form submissions**: Use `useAsyncAction` for consistent UX
3. **Long API calls**: Always show loading state for operations > 1 second
4. **Error handling**: Always wrap in try/finally to ensure loading state clears
5. **User feedback**: Provide descriptive loading messages when possible
