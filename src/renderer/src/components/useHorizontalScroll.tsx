import * as React from 'react';
import { useWheelScrollProxyFrom } from './useWheelScrollProxy';

/**
 * Enhanced hook for adding horizontal scroll wheel support to scrollable containers.
 * 
 * Usage:
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const wheelHandler = useHorizontalScroll(containerRef);
 *   
 *   <div ref={containerRef} onWheel={wheelHandler} className="overflow-x-auto">
 * 
 * Features:
 * - Left/Right scroll with mouse wheel (natural deltaX)
 * - Shift+Wheel converts vertical scroll to horizontal for easy horizontal panning
 * - Automatic detection of horizontally scrollable elements
 * - Works with nested scrollable ancestors
 */
export function useHorizontalScroll<T extends HTMLElement>(
    scrollTargetRef?: React.RefObject<T | null>
): (e: React.WheelEvent) => void {
    // If no ref provided, use the currentTarget as the scroll target
    const getScrollTarget = React.useCallback(() => {
        return scrollTargetRef?.current ?? null;
    }, [scrollTargetRef]);

    return useWheelScrollProxyFrom(getScrollTarget);
}

/**
 * Hook to enable horizontal scroll on the current element
 * Returns a ref to attach to your container and a wheel handler
 */
export function useHorizontalScrollWithRef<T extends HTMLElement = HTMLDivElement>() {
    const scrollRef = React.useRef<T>(null);
    const wheelHandler = useHorizontalScroll(scrollRef);

    return {
        ref: scrollRef,
        onWheel: wheelHandler,
    };
}

/**
 * Utility to add horizontal scroll support to any element via component
 * Apply to containers that need left-to-right scrolling
 */
export const HorizontalScrollContainer = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }
>(({ onWheel, ...props }, ref) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const wheelHandler = useHorizontalScroll(scrollRef);

    React.useImperativeHandle(ref, () => scrollRef.current as HTMLDivElement, []);

    return (
        <div
            ref={scrollRef}
            onWheel={(e) => {
                wheelHandler(e);
                onWheel?.(e);
            }}
            {...props}
        />
    );
});

HorizontalScrollContainer.displayName = 'HorizontalScrollContainer';
