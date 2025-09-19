export type Role = 'admin' | 'alumni' | 'student';

export interface Alumni {
  id: string;
  name: string;
  email?: string;
  graduationYear?: number;
  company?: string;
  title?: string;
  location?: string;
  linkedIn?: string;
  bio?: string;
  skills?: string[];
  industry?: string;
  experience?: number;
  profileImage?: string;
  createdAt?: any;
}

export type EventType = 'networking' | 'workshop' | 'conference' | 'social' | 'career' | 'other';

export interface Event {
  id: string;
  title: string;
  date: any;
  location?: string;
  description?: string;
  type?: EventType;
  capacity?: number;
  organizer?: string;
  imageUrl?: string;
  tags?: string[];
  rsvps?: string[];
  createdAt?: any;
  createdBy?: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

export const EVENT_TYPES: EventType[] = ['networking', 'workshop', 'conference', 'social', 'career', 'other'];
export const ROLES: Role[] = ['admin', 'alumni', 'student'];
