import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
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
  
  // Validate date
  if (!input.date || isNaN(input.date.getTime())) {
    throw new DomainError('ERR_VALIDATION','Invalid date provided');
  }
  
  // Check if date is in the past
  if (input.date < new Date()) {
    throw new DomainError('ERR_VALIDATION','Event date cannot be in the past');
  }
  
  const parsed = eventCreateSchema.safeParse({ ...input, tags: input.tags ?? [] });
  if (!parsed.success) {
    console.error('Validation errors:', parsed.error.format());
    const firstError = parsed.error.issues[0];
    throw new DomainError('ERR_VALIDATION',`Invalid event data: ${firstError.path.join('.')} - ${firstError.message}`);
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

export async function deleteEvent(eventId: string) {
  if (!db) throw new DomainError('ERR_DEPENDENCY', 'Firestore not initialized');
  if (!auth?.currentUser) throw new DomainError('ERR_FORBIDDEN', 'User must be logged in to delete events');
  
  const ref = doc(db, 'events', eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new DomainError('ERR_NOT_FOUND', 'Event not found');
  
  await deleteDoc(ref);
  return true;
}

export function parseFormToEvent(input: {
  title: string; description: string; date: string; time: string; location: string; type: string;
  organizer: string; capacity: string; tags: string; imageUrl: string;
}) {
  // Parse date in DD-MM-YYYY format and convert to proper Date object
  const dateParts = input.date.split('-');
  let formattedDate: string;
  
  if (dateParts.length === 3) {
    if (dateParts[0].length === 4) {
      // Already in YYYY-MM-DD format
      formattedDate = input.date;
    } else {
      // Convert DD-MM-YYYY to YYYY-MM-DD
      formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    }
  } else {
    // Fallback to original date string
    formattedDate = input.date;
  }
  
  const date = new Date(`${formattedDate}T${input.time}`);
  
  // Validate the date
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  
  const tags = normalizeTags(input.tags);
  const capacity = input.capacity ? parseInt(input.capacity, 10) : null;
  
  // Handle imageUrl - convert empty string to null
  const imageUrl = input.imageUrl.trim() === '' ? null : input.imageUrl.trim();
  
  return { 
    ...input, 
    date, 
    tags, 
    capacity, 
    imageUrl,
    type: input.type as EventCreateInput['type'] 
  };
}
