# Horizontal Scroll Wheel Support - Implementation Guide

**Date**: April 6, 2026  
**Version**: 1.0  
**Status**: Complete

## Overview

Mossy now includes comprehensive left-to-right horizontal scroll wheel support across all scrollable UI components. Users can effortlessly navigate horizontally in message areas, code blocks, and content panels using their mouse wheel.

## Features

### 1. **Natural Horizontal Scrolling**
- Direct mouse wheel horizontal movement (deltaX) scrolls left-to-right naturally
- Works on any container with `overflow-x-auto` class

### 2. **Shift+Wheel Modifier for Intuitive Panning**
- **Shift + Vertical Scroll** → Horizontal Scroll conversion
- Enables users to scroll horizontally without needing a specialized mouse wheel
- Works across all scrollable areas simultaneously

### 3. **Smart Scroll Proxying**
- Scrolling works even when hovering over non-scrollable UI elements (headers, toolbars)
- Automatically determines which ancestor container should handle the scroll
- Prevents scroll conflicts when multiple containers are scrollable

### 4. **Bi-directional Scroll Detection**
- Automatically detects if a container is scrollable on X or Y axis
- Validates scroll boundaries (prevents over-scrolling)
- Gracefully handles mixed vertical/horizontal scroll scenarios

## Components Updated

### Core Infrastructure

#### `src/renderer/src/components/useWheelScrollProxy.ts`
Enhanced with:
- Shift+Wheel support for horizontal scroll conversion
- Improved deltaX + deltaY handling
- Support for nested scrollable elements

#### `src/renderer/src/components/useHorizontalScroll.tsx` (NEW)
Provides three ways to integrate horizontal scroll:

```tsx
// 1. Hook with ref pattern
const ref = useRef<HTMLDivElement>(null);
const wheelHandler = useHorizontalScroll(ref);
<div ref={ref} onWheel={wheelHandler} />

// 2. Hook with built-in ref
const { ref, onWheel } = useHorizontalScrollWithRef();
<div ref={ref} onWheel={onWheel} />

// 3. Ready-to-use component
<HorizontalScrollContainer className="overflow-x-auto">
  {/* Content here */}
</HorizontalScrollContainer>
```

### Updated Components

| Component | File | Changes |
|-----------|------|---------|
| ChatInterface | `src/renderer/src/ChatInterface.tsx` | Enhanced `MessageList` with `useHorizontalScroll` |
| AIModAssistant | `src/renderer/src/AIModAssistant.tsx` | Added horizontal scroll to messages container |
| AICopilot | `src/renderer/src/AICopilot.tsx` | Added horizontal scroll with `messagesContainerRef` |
| CKCrashPreventionMining | `src/renderer/src/CKCrashPreventionMining.tsx` | Enhanced existing `useWheelScrollProxyFrom` |

## How It Works

### Scroll Detection Logic

```typescript
// 1. Vertical scrolling (default)
// Standard mouse wheel vertical movement

// 2. Shift+Wheel → Horizontal conversion
// Shift + Vertical movement = Horizontal scroll
if (e.shiftKey && hasVertical) {
  scrollTarget.scrollBy({ left: e.deltaY })
}

// 3. Natural horizontal scrolling
// Direct horizontal wheel movement (e.g., trackpad)
if (hasHorizontal) {
  scrollTarget.scrollBy({ left: e.deltaX })
}
```

### Boundary Prevention

```typescript
// Checks if an element can scroll in a direction before attempting
canScrollInDirection(node, deltaY): boolean
canScrollHorizontallyInDirection(node, deltaX): boolean

// Validates:
// - Element has overflow property set (auto/scroll)
// - Current scroll position allows movement
// - Target hasn't hit scroll boundaries
```

## User Guide

### Using Horizontal Scroll

| Action | Result |
|--------|--------|
| **Mouse Wheel** (vertical) | Scroll up/down |
| **Mouse Wheel** (horizontal) | Scroll left/right |
| **Shift + Mouse Wheel** | Horizontal pan (left-to-right) |
| **Two-finger trackpad drag** | Native horizontal scroll |

### Examples

**Chat Interface - Long Code Blocks:**
```
- User receives a long Papyrus script in the chat
- Code block extends beyond visible area
- Use Shift+Wheel or direct horizontal wheel to view full code
```

**Message Lists - Wide Content:**
```
- Side-scrollable message content
- Long file paths or console output
- Horizontal scroll reveals hidden text
```

**Code Blocks - Line Overflow:**
```
- Extended code lines (> 80 characters)
- Use horizontal scroll to inspect formatting
- Shift+Wheel for quick panning
```

## Implementation Details

### Required CSS Classes

Ensure containers have proper overflow properties:

```html
<!-- For horizontal scrolling support -->
<div class="overflow-x-auto">
  <!-- Content -->
</div>

<!-- For both axes -->
<div class="overflow-y-auto overflow-x-auto">
  <!-- Content -->
</div>
```

### Integration Pattern

```tsx
import { useHorizontalScroll } from './components/useHorizontalScroll';
import { useRef } from 'react';

export function MyComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelHandler = useHorizontalScroll(containerRef);

  return (
    <div 
      ref={containerRef} 
      onWheel={wheelHandler}
      className="overflow-x-auto overflow-y-auto"
    >
      {/* Scrollable content */}
    </div>
  );
}
```

### Type Safety

```tsx
// Proper TypeScript support
const scrollRef = useRef<HTMLDivElement>(null);
const wheelHandler = useHorizontalScroll(scrollRef);
// wheelHandler: (e: React.WheelEvent) => void
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| deltaX/deltaY | ✅ | ✅ | ✅ | ✅ |
| Passive Events | ✅ | ✅ | ✅ | ✅ |
| Shift Key Detection | ✅ | ✅ | ✅ | ✅ |
| Scroll Boundaries | ✅ | ✅ | ✅ | ✅ |

## Performance Notes

- **Zero Dependencies**: Pure React + TypeScript, no external libraries
- **Passive Event Listeners**: Scroll events are passive (won't block page rendering)
- **Memoized Callbacks**: `useWheelScrollProxyFrom` returns memoized handler
- **No Memory Leaks**: Properly cleaned up refs and event listeners

## Debugging

### Enable Scroll Debugging

Add to component for development:

```tsx
const wheelHandler = useHorizontalScroll(containerRef);

const debugWheelHandler = (e: React.WheelEvent) => {
  console.log('Wheel:', {
    deltaX: e.deltaX,
    deltaY: e.deltaY,
    shiftKey: e.shiftKey,
    target: e.target,
  });
  wheelHandler(e);
};

// Use debugWheelHandler instead
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Scrolling not working | Ensure `overflow-x-auto` class is present |
| Scroll too fast | Adjust deltaY/deltaX multiplier in handler |
| Conflicts with page scroll | Check parent container overflow settings |
| Shift+Wheel not working | Verify `e.shiftKey` detection in handler |

## Future Enhancements

- [ ] Customizable scroll speed multiplier
- [ ] Smooth scroll animation options
- [ ] Scroll indication indicators (scrollbar thumbs)
- [ ] Keyboard shortcut support (Arrow keys)
- [ ] Touch gesture support (two-finger pan)
- [ ] Performance monitoring/analytics

## Testing Checklist

- [x] Vertical scrolling works normally
- [x] Horizontal scrolling with natural wheel movement
- [x] Shift+Wheel horizontal conversion
- [x] Scroll boundaries respected
- [x] Multiple scrollable containers handled correctly
- [x] No conflicts with nested scrolling elements
- [x] Works across all updated components
- [x] TypeScript types correct
- [x] ESLint passing (aside from pre-existing warnings)

## References

- [MDN: WheelEvent](https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent)
- [MDN: Element.scrollBy()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollBy)
- [React Events Documentation](https://react.dev/reference/react-dom/components/common#react-event-object)

---

**Maintainer**: AI Assistant  
**Last Updated**: April 6, 2026  
**Next Review**: Q3 2026
