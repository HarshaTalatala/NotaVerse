/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Firestore mocks
const addDoc = vi.fn(async () => ({ id: 'new123' }));
const getDoc = vi.fn();
const updateDoc = vi.fn();
const docFn = vi.fn();
const collectionFn = vi.fn();
const serverTimestamp = vi.fn(() => new Date());
const arrayUnion = (...v: any[]) => v;
const arrayRemove = (...v: any[]) => v;

vi.mock('firebase/firestore', () => ({
  addDoc: addDoc,
  getDoc: getDoc,
  updateDoc: updateDoc,
  doc: docFn,
  collection: collectionFn,
  serverTimestamp,
  arrayUnion,
  arrayRemove
}));

vi.mock('@/services/firebase', () => ({ 
  db: {}, 
  auth: { currentUser: { uid: 'test-user-123' } }
}));

describe('eventsService', () => {
  beforeEach(() => {
    addDoc.mockClear();
    getDoc.mockClear();
    updateDoc.mockClear();
  });

  it('rejects invalid createEvent payload', async () => {
    (globalThis as any).CURRENT_USER_ID = 'user1';
    const { createEvent } = await import('@/services/eventsService');
    await expect(createEvent({
      title: 'Hi', // too short < 3? (schema min 3) intentionally borderline length; adjust to cause failure
      description: 'short', // <10
      date: new Date(),
      location: '',
      type: 'networking',
      organizer: 'Org'
    } as any)).rejects.toThrow('Invalid event data');
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('creates valid event', async () => {
    (globalThis as any).CURRENT_USER_ID = 'user1';
    const { createEvent } = await import('@/services/eventsService');
    const id = await createEvent({
      title: 'Valid Title',
      description: 'This is a sufficiently long description',
      date: new Date(),
      location: 'Hall',
      type: 'workshop',
      organizer: 'Org',
      capacity: 10,
      tags: ['one']
    });
    expect(id).toBe('new123');
    expect(addDoc).toHaveBeenCalled();
  });

  it('toggleRsvp adds when absent then removes when present', async () => {
    // First call: event with empty rsvps
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ rsvps: [] }) });
    // Second call: event with user already present
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ rsvps: ['u1'] }) });
    const { toggleRsvp } = await import('@/services/eventsService');
    const added = await toggleRsvp('evt', 'u1');
    expect(added).toBe(true);
    const removed = await toggleRsvp('evt', 'u1');
    expect(removed).toBe(false);
    expect(updateDoc).toHaveBeenCalledTimes(2);
  });
});
