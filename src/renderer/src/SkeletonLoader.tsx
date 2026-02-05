import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = true,
  animate = true
}) => {
  const baseClasses = 'bg-slate-700';
  const roundedClasses = rounded ? 'rounded' : '';
  const animateClasses = animate ? 'animate-pulse' : '';

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${roundedClasses} ${animateClasses} ${className}`}
      style={style}
    />
  );
};

interface SkeletonLoaderProps {
  type?: 'module' | 'card' | 'list' | 'text';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'module',
  count = 1
}) => {
  if (type === 'module') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0e0a] text-[#00ff00]">
        <div className="flex flex-col items-center gap-6">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 w-full max-w-md">
            <Skeleton width={48} height={48} rounded={false} />
            <div className="flex-1 space-y-2">
              <Skeleton height={20} width="80%" />
              <Skeleton height={16} width="60%" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="space-y-4 w-full max-w-lg">
            <Skeleton height={24} width="90%" />
            <Skeleton height={24} width="85%" />
            <Skeleton height={24} width="75%" />
          </div>

          {/* Action buttons skeleton */}
          <div className="flex gap-3">
            <Skeleton width={100} height={36} />
            <Skeleton width={120} height={36} />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-slate-800 p-4 rounded-lg">
            <div className="flex items-start gap-4">
              <Skeleton width={48} height={48} />
              <div className="flex-1 space-y-2">
                <Skeleton height={20} width="70%" />
                <Skeleton height={16} width="50%" />
                <Skeleton height={14} width="40%" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-slate-800 rounded">
            <Skeleton width={32} height={32} />
            <div className="flex-1 space-y-1">
              <Skeleton height={16} width="60%" />
              <Skeleton height={12} width="40%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} height={16} width={`${80 - i * 10}%`} />
        ))}
      </div>
    );
  }

  return <Skeleton />;
};

// Enhanced ModuleLoader with better skeleton
export const ModuleLoader = () => <SkeletonLoader type="module" />;