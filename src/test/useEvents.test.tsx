/// <reference types="vitest" />
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useEvents } from '@/hooks/useEvents';

// Vitest mock
vi.mock('@/services/firebase', () => ({ db: undefined }));

describe('useEvents hook', () => {
  it('initializes with empty events when db undefined', () => {
    const { result } = renderHook(() => useEvents());
    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('updates search state', () => {
    const { result } = renderHook(() => useEvents());
    act(() => {
      result.current.setSearch('network');
    });
    expect(result.current.search).toBe('network');
  });
});
