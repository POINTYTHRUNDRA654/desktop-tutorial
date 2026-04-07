# Horizontal Scroll Wheel - Quick Start Guide

## What Was Added?

Mossy now has full **left-to-right horizontal scroll wheel support** across all scrollable UI areas.

**Two ways to scroll horizontally:**
1. **Natural horizontal scrolling**: Direct mouse wheel movement on trackpads
2. **Shift+Wheel modifier**: Hold Shift + vertical wheel scroll = horizontal pan

## For Developers: Adding Horizontal Scroll to Containers

### Quick Integration (3 steps)

#### Step 1: Import the hook
```tsx
import { useHorizontalScroll } from './components/useHorizontalScroll';
```

#### Step 2: Create a ref and get the wheel handler
```tsx
const containerRef = useRef<HTMLDivElement>(null);
const wheelHandler = useHorizontalScroll(containerRef);
```

#### Step 3: Apply to your container
```tsx
<div 
  ref={containerRef} 
  onWheel={wheelHandler}
  className="overflow-x-auto overflow-y-auto"
>
  {/* Your content */}
</div>
```

### Alternative: Use the ready-made component
```tsx
import { HorizontalScrollContainer } from './components/useHorizontalScroll';

<HorizontalScrollContainer className="overflow-x-auto">
  {/* Content */}
</HorizontalScrollContainer>
```

## Files Modified

| File | Change |
| --- | --- |
| `src/renderer/src/components/useWheelScrollProxy.ts` | Added Shift+Wheel detection |
| `src/renderer/src/components/useHorizontalScroll.tsx` | NEW - Main hook & component |
| `src/renderer/src/ChatInterface.tsx` | MessageList enhanced |
| `src/renderer/src/AIModAssistant.tsx` | Message container enhanced |
| `src/renderer/src/AICopilot.tsx` | Message container enhanced |

## CSS Requirements

Ensure your scrollable container has:
```tailwind
overflow-x-auto     /* Enable horizontal scrolling */
overflow-y-auto     /* Enable vertical scrolling (optional) */
```

## Testing Checklist

- [ ] Normal vertical scrolling works
- [ ] Horizontal scrolling with native mouse wheel works
- [ ] Shift+Wheel converts to horizontal scroll
- [ ] Scroll stops at boundaries (no over-scroll)
- [ ] Works on overlays and non-scroll areas
- [ ] No conflicts with page scroll

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Scrolling not working | Check `overflow-x-auto` class presence |
| Shift+Wheel not working | Verify event listener is attached |
| Too fast/slow | Adjust `e.deltaY` or `e.deltaX` multiplier |
| Affecting outer scroll | Check parent container overflow settings |

## Performance Notes

✅ Zero external dependencies  
✅ Uses passive event listeners (won't block rendering)  
✅ Memoized callbacks (no unnecessary re-renders)  
✅ Works with nested scrollable elements  

## Documentation

See [HORIZONTAL_SCROLL_IMPLEMENTATION.md](../HORIZONTAL_SCROLL_IMPLEMENTATION.md) for:
- Complete feature list
- Browser compatibility
- Debug tips
- Future enhancements

---

**Last Updated**: April 6, 2026  
**Status**: ✅ Production Ready
