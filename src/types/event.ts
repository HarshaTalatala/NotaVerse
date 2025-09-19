import { z } from 'zod';

// Firestore Timestamp compatible placeholder type for typing only
// (At runtime we accept Date; conversion to Timestamp happens in service if db available.)
export interface EventRecord {
  id: string;
  title: string;
  description?: string;
  date?: any; // Firestore Timestamp
  location?: string;
  type?: 'networking' | 'workshop' | 'conference' | 'social' | 'career' | 'other';
  organizer?: string;
  capacity?: number | null;
  tags?: string[];
  imageUrl?: string | null;
  rsvps?: string[];
  status?: string;
  createdAt?: any;
  createdBy?: string;
}

export const eventCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  date: z.date(),
  location: z.string().min(2, 'Location required'),
  type: z.enum(['networking','workshop','conference','social','career','other']),
  organizer: z.string().min(2).default('Event Organizer'),
  capacity: z.number().int().positive().max(10000).nullable().optional(),
  tags: z.array(z.string().min(1)).max(25).optional().default([]),
  imageUrl: z.string().url().nullable().optional(),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;

export const normalizeTags = (raw: string): string[] =>
  raw
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 25);
