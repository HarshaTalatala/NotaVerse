/// <reference types="vitest" />
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useAlumni } from '@/hooks/useAlumni';

// Mock firebase service to simulate uninitialized db
vi.mock('@/services/firebase', () => ({ 
  db: undefined, 
  auth: null 
}));

describe('useAlumni hook', () => {
  it('initializes with empty alumni when db undefined', () => {
    const { result } = renderHook(() => useAlumni());
    expect(result.current.alumni).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.total).toBe(0);
  });

  it('updates search, year, industry and sort state', () => {
    const { result } = renderHook(() => useAlumni());
    act(() => {
      result.current.setSearch('john');
      result.current.setYear('2022');
      result.current.setIndustry('software');
      result.current.setSortBy('company');
    });
    expect(result.current.search).toBe('john');
    expect(result.current.year).toBe('2022');
    expect(result.current.industry).toBe('software');
    expect(result.current.sortBy).toBe('company');
  });

  it('resets pagination to within bounds when no data', () => {
    const { result } = renderHook(() => useAlumni({ page: 5 }));
    // page should clamp to 1 because total=0
    expect(result.current.page).toBe(1);
  });
});
