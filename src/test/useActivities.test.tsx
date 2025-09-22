/// <reference types="vitest" />
import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useActivities } from '@/hooks/useActivities';

// Mock services
vi.mock('@/services/collaborationApi', () => ({
  activitiesApi: {
    getActivities: vi.fn(async (params:any) => {
      // Return different data based on role param to simulate backend filtering
      if (params.role === 'admin') {
        return {
          success: true,
          data: [
            { id: '1', userId: 'u1', userName: 'Admin', userRole: 'admin', type: 'note_created', entityId: 'n1', entityType: 'note', description: 'Admin note', createdAt: new Date() },
            { id: '2', userId: 'u2', userName: 'Student', userRole: 'student', type: 'comment_added', entityId: 'c1', entityType: 'comment', description: 'Student comment', createdAt: new Date() }
          ],
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
        };
      }
      // Non-admin: only own activity plus a team/public one
      return {
        success: true,
        data: [
          { id: '2', userId: params.userId || 'u2', userName: 'Student', userRole: 'student', type: 'comment_added', entityId: 'c1', entityType: 'comment', description: 'Student comment', createdAt: new Date() }
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      };
    })
  }
}));

vi.mock('@/services/firebaseCollaborationService', () => ({
  firebaseCollaborationService: {
    getActivities: vi.fn(async () => ({ success: true, data: [], pagination: { page:1, limit:20, total:0, totalPages:0 } }))
  }
}));

describe('useActivities role filtering', () => {
  it('returns all activities for admin role', async () => {
    const { result, rerender } = renderHook(({ role }) => useActivities({ role }), { initialProps: { role: 'admin' } });
    // Wait a tick for async fetch
    await new Promise(r => setTimeout(r, 0));
    expect(result.current.activities.length).toBe(2);
  });

  it('returns limited activities for student role', async () => {
    const { result } = renderHook(() => useActivities({ role: 'student', userId: 'u2' }));
    await new Promise(r => setTimeout(r, 0));
    expect(result.current.activities.length).toBe(1);
  });
});
