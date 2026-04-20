import React, { useEffect, useRef, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { SkeletonLoader } from './SkeletonLoader';
import { recordPanelEntry } from './panelActivity';

interface KeepAlivePanelProps {
  path: string;
  children: React.ReactNode;
}

const PanelLoader = () => <SkeletonLoader type="module" />;

/**
 * Mounts a panel on its first visit and keeps it alive in the DOM thereafter.
 * Inactive panels are hidden with CSS (display:none) so background operations
 * — scans, downloads, monitoring sessions, etc. — continue running even when
 * the user navigates to a different panel.
 *
 * Exact pathname matching is intentional: each route (e.g. "/tools" and
 * "/tools/asset-deduplicator") has its own dedicated KeepAlivePanel entry in
 * App.tsx, so a child path being active should correctly hide the parent hub
 * panel and show only the child panel.
 */
const KeepAlivePanel: React.FC<KeepAlivePanelProps> = ({ path, children }) => {
  const location = useLocation();
  const mountedRef = useRef(false);

  const isActive = location.pathname === path;

  // Mark as mounted on first visit; never reset so the component stays alive.
  if (isActive) mountedRef.current = true;

  // Notify Mossy's activity store whenever this panel becomes active.
  useEffect(() => {
    if (isActive) {
      recordPanelEntry(path);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Don't render anything until the user first navigates to this panel.
  if (!mountedRef.current) return null;

  return (
    <div
      aria-hidden={!isActive}
      style={{ display: isActive ? 'block' : 'none' }}
    >
      <Suspense fallback={<PanelLoader />}>
        {children}
      </Suspense>
    </div>
  );
};

export default KeepAlivePanel;
