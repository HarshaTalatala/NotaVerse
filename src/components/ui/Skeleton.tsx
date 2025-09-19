import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  // Mark as presentational; parent container should manage any aria-busy or status messaging.
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
        />
      ))}
    </>
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = '' }) => (
  <div className={className} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="animate-pulse h-3 rounded bg-gray-200 dark:bg-gray-700 mb-2 last:mb-0" />
    ))}
  </div>
);

export default Skeleton;
