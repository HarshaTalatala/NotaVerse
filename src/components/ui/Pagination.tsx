import React from 'react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onChange, className = '' }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < pageCount;

  const go = (next: number) => {
    if (next >= 1 && next <= pageCount && next !== page) onChange(next);
  };

  // Window of pages (simple)
  const window: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pageCount, start + 4);
  for (let i = start; i <= end; i++) window.push(i);

  return (
    <nav className={`flex items-center gap-2 ${className}`} aria-label="Pagination">
      <button
        onClick={() => go(page - 1)}
        disabled={!canPrev}
        className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        Prev
      </button>
      {start > 1 && (
        <button
          onClick={() => go(1)}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >1</button>
      )}
      {start > 2 && <span className="px-1 text-gray-500">…</span>}
      {window.map(p => (
        <button
          key={p}
          onClick={() => go(p)}
          className={`px-3 py-1.5 text-sm rounded-md border ${p === page ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      {end < pageCount - 1 && <span className="px-1 text-gray-500">…</span>}
      {end < pageCount && (
        <button
          onClick={() => go(pageCount)}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >{pageCount}</button>
      )}
      <button
        onClick={() => go(page + 1)}
        disabled={!canNext}
        className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        Next
      </button>
    </nav>
  );
};

export default Pagination;
