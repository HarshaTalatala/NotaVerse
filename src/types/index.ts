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

// Collaboration Hub Types
export interface Note {
  id?: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  tags?: string[];
  isPublic: boolean;
  teamId?: string;
  collaborators?: string[];
  lastModified: Date;
  createdAt: Date;
  version: number;
}

export interface Comment {
  id?: string;
  noteId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  content: string;
  parentCommentId?: string;
  replies?: Comment[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface FileAttachment {
  id?: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  blobUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  teamId?: string;
  noteId?: string;
  isPublic: boolean;
  tags?: string[];
  createdAt: Date;
}

export interface Team {
  id?: string;
  name: string;
  description: string;
  createdBy: string;
  createdByName: string;
  members: TeamMember[];
  isPrivate: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface TeamMember {
  userId: string;
  userName: string;
  userRole: Role;
  teamRole: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
}

export interface Activity {
  id?: string;
  userId: string;
  userName: string;
  userRole: Role;
  type: 'note_created' | 'note_updated' | 'comment_added' | 'file_uploaded' | 'team_joined' | 'team_created';
  entityId: string;
  entityType: 'note' | 'comment' | 'file' | 'team';
  description: string;
  metadata?: any;
  createdAt: Date;
}

export interface SearchFilters {
  tags?: string[];
  authorId?: string;
  teamId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  type?: 'note' | 'file' | 'team';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
