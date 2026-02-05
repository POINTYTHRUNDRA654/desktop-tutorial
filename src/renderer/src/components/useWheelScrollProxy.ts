import * as React from 'react';

function isOverflowScrollable(value: string): boolean {
  return value === 'auto' || value === 'scroll' || value === 'overlay';
}

function isVerticallyScrollable(node: HTMLElement): boolean {
  const style = window.getComputedStyle(node);
  if (!isOverflowScrollable(style.overflowY)) return false;
  return node.scrollHeight > node.clientHeight + 1;
}

function canScrollInDirection(node: HTMLElement, deltaY: number): boolean {
  if (!isVerticallyScrollable(node)) return false;
  if (deltaY < 0) return node.scrollTop > 0;
  if (deltaY > 0) return node.scrollTop + node.clientHeight < node.scrollHeight - 1;
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

/**
 * Lets mouse-wheel scrolling work even when the cursor is over
 * non-scrollable UI (headers/toolbars), by proxying wheel deltas
 * to a chosen scroll container.
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

      if (!Number.isFinite(e.deltaY) || Math.abs(e.deltaY) < 0.5) return;

      // If the wheel event happened over a scrollable area that can
      // scroll in this direction, let it behave normally.
      if (hasScrollableAncestor(target, root, e.deltaY)) return;

      const before = scrollTarget.scrollTop;
      scrollTarget.scrollBy({ top: e.deltaY, behavior: 'auto' });

      // Note: preventDefault() removed as wheel events are passive by default in modern browsers
      // The scroll behavior is handled by scrollBy() above
    },
    [getScrollTarget]
  );
}
