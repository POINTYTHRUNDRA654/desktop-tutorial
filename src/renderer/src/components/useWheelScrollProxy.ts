import * as React from 'react';

function isOverflowScrollable(value: string): boolean {
  return value === 'auto' || value === 'scroll' || value === 'overlay';
}

function isVerticallyScrollable(node: HTMLElement): boolean {
  const style = window.getComputedStyle(node);
  if (!isOverflowScrollable(style.overflowY)) return false;
  return node.scrollHeight > node.clientHeight + 1;
}

function isHorizontallyScrollable(node: HTMLElement): boolean {
  const style = window.getComputedStyle(node);
  if (!isOverflowScrollable(style.overflowX)) return false;
  return node.scrollWidth > node.clientWidth + 1;
}

function canScrollInDirection(node: HTMLElement, deltaY: number): boolean {
  if (!isVerticallyScrollable(node)) return false;
  if (deltaY < 0) return node.scrollTop > 0;
  if (deltaY > 0) return node.scrollTop + node.clientHeight < node.scrollHeight - 1;
  return false;
}

function canScrollHorizontallyInDirection(node: HTMLElement, deltaX: number): boolean {
  if (!isHorizontallyScrollable(node)) return false;
  if (deltaX < 0) return node.scrollLeft > 0;
  if (deltaX > 0) return node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
  return false;
}

function hasScrollableAncestor(target: HTMLElement, root: HTMLElement, deltaY: number): boolean {
  let current: HTMLElement | null = target;
  while (current) {
    if (canScrollInDirection(current, deltaY)) return true;
    if (current === root) break;
    current = current.parentElement;
  }
  return false;
}

function hasHorizontalScrollableAncestor(target: HTMLElement, root: HTMLElement, deltaX: number): boolean {
  let current: HTMLElement | null = target;
  while (current) {
    if (canScrollHorizontallyInDirection(current, deltaX)) return true;
    if (current === root) break;
    current = current.parentElement;
  }
  return false;
}

/**
 * Lets mouse-wheel scrolling work even when the cursor is over
 * non-scrollable UI (headers/toolbars), by proxying wheel deltas
 * to a chosen scroll container.  Supports both vertical (deltaY)
 * and horizontal (deltaX) scrolling.
 * 
 * Enhanced support:
 * - Vertical scrolling: Normal mouse wheel or Shift+Wheel
 * - Horizontal scrolling: Shift+Wheel or natural deltaX
 * - Left-to-right scroll wheel: Shift+Wheel scrolls horizontally
 */
export function useWheelScrollProxy<T extends HTMLElement>(scrollTargetRef: React.RefObject<T | null>) {
  return useWheelScrollProxyFrom(() => scrollTargetRef.current);
}

export function useWheelScrollProxyFrom(getScrollTarget: () => HTMLElement | null) {
  return React.useCallback(
    (e: React.WheelEvent) => {
      const scrollTarget = getScrollTarget();
      if (!scrollTarget) return;

      const root = e.currentTarget;
      const target = e.target;
      if (!(root instanceof HTMLElement) || !(target instanceof HTMLElement)) return;

      const hasVertical = Number.isFinite(e.deltaY) && Math.abs(e.deltaY) >= 0.5;
      const hasHorizontal = Number.isFinite(e.deltaX) && Math.abs(e.deltaX) >= 0.5;

      if (!hasVertical && !hasHorizontal) return;

      // Shift+Wheel: Force horizontal scroll (convert deltaY to deltaX)
      if (e.shiftKey && hasVertical) {
        const horizontalDelta = e.deltaY;
        if (!hasHorizontalScrollableAncestor(target, root, horizontalDelta)) {
          scrollTarget.scrollBy({ left: horizontalDelta, behavior: 'auto' });
        }
        return;
      }

      // Vertical scroll proxy
      if (hasVertical && !hasScrollableAncestor(target, root, e.deltaY)) {
        scrollTarget.scrollBy({ top: e.deltaY, behavior: 'auto' });
      }

      // Horizontal scroll proxy
      if (hasHorizontal && !hasHorizontalScrollableAncestor(target, root, e.deltaX)) {
        scrollTarget.scrollBy({ left: e.deltaX, behavior: 'auto' });
      }

      // Note: preventDefault() removed as wheel events are passive by default in modern browsers.
      // Each axis is proxied independently — vertical only when no scrollable ancestor handles
      // deltaY, and horizontal only when no scrollable ancestor handles deltaX.
    },
    [getScrollTarget]
  );
}
