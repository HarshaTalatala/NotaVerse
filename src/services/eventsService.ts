import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/services/firebase';
import { eventCreateSchema, EventCreateInput, normalizeTags } from '@/types/event';
import { DomainError } from '@/types/errors';

// Helper function to sanitize data for Firestore (convert undefined to null)
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  
  const sanitized: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeForFirestore(value);
  }
  return sanitized;
}

export async function createEvent(input: Omit<EventCreateInput,'date'|'tags'> & { date: Date; tags?: string[] }) {
  if (!db) throw new DomainError('ERR_DEPENDENCY','Firestore not initialized');
  if (!auth?.currentUser) throw new DomainError('ERR_FORBIDDEN','User must be logged in to create events');
  
  const parsed = eventCreateSchema.safeParse({ ...input, tags: input.tags ?? [] });
  if (!parsed.success) {
    throw new DomainError('ERR_VALIDATION','Invalid event data', parsed.error.format());
  }
  const data = parsed.data;
  const record = sanitizeForFirestore({
    ...data,
    rsvps: [],
    status: 'upcoming',
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser.uid
  });
  const ref = await addDoc(collection(db, 'events'), record);
  return ref.id;
}

export async function toggleRsvp(eventId: string, userId: string) {
  if (!db) throw new DomainError('ERR_DEPENDENCY','Firestore not initialized');
  const ref = doc(db, 'events', eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new DomainError('ERR_NOT_FOUND','Event not found');
  const data = snap.data();
  const rsvps: string[] = data.rsvps || [];
  const isIn = rsvps.includes(userId);
  await updateDoc(ref, { rsvps: isIn ? arrayRemove(userId) : arrayUnion(userId) });
  return !isIn;
}

export const SAMPLE_EVENTS: Array<Omit<EventCreateInput,'date'> & { date: Date }> = [
  {
    title: 'Alumni Networking Night 2025',
    description: 'Join us for an evening of networking, great food, and meaningful connections. Meet fellow alumni from various industries and expand your professional network.',
    date: new Date('2025-10-15T18:00:00'),
    location: 'Grand Ballroom, Marriott Downtown',
    type: 'networking',
    organizer: 'Alumni Association',
    capacity: 150,
    tags: ['networking','professional','food'],
    imageUrl: null,
  },
  {
    title: 'Tech Industry Career Workshop',
    description: 'Learn about the latest trends in technology careers, resume tips, and interview strategies from industry experts and successful alumni.',
    date: new Date('2025-10-22T14:00:00'),
    location: 'Innovation Center, Room 301',
    type: 'workshop',
    organizer: 'Career Services',
    capacity: 75,
    tags: ['career','technology','professional development'],
    imageUrl: null,
  }
];

export async function addSampleEvents(userId: string) {
  if (!db) throw new DomainError('ERR_DEPENDENCY','Firestore not initialized');
  for (const e of SAMPLE_EVENTS) {
    const eventData = sanitizeForFirestore({
      ...e,
      rsvps: [],
      status: 'upcoming',
      createdAt: serverTimestamp(),
      createdBy: userId
    });
    await addDoc(collection(db, 'events'), eventData);
  }
}

export function parseFormToEvent(input: {
  title: string; description: string; date: string; time: string; location: string; type: string;
  organizer: string; capacity: string; tags: string; imageUrl: string;
}) {
  const date = new Date(`${input.date}T${input.time}`);
  const tags = normalizeTags(input.tags);
  const capacity = input.capacity ? parseInt(input.capacity, 10) : null;
  return { ...input, date, tags, capacity, type: input.type as EventCreateInput['type'] };
}
