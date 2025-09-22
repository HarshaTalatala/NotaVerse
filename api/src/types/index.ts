export interface Student {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  department: string;
  year: number;
  gpa?: number;
  courses?: string[];
  interests?: string[];
  skills?: string[];
  projects?: Project[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Alumni {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  department: string;
  graduationYear: number;
  currentCompany?: string;
  currentPosition?: string;
  experience?: number;
  skills?: string[];
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  isAvailableForMentoring?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Event {
  id?: string;
  title: string;
  description: string;
  type: 'workshop' | 'seminar' | 'networking' | 'career-fair' | 'social' | 'academic';
  startDate: Date;
  endDate: Date;
  location: string;
  maxAttendees?: number;
  currentAttendees?: number;
  organizer: string;
  organizerEmail: string;
  tags?: string[];
  imageUrl?: string;
  registrationRequired?: boolean;
  registrationDeadline?: Date;
  attendees?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Project {
  id?: string;
  title: string;
  description: string;
  technologies?: string[];
  githubUrl?: string;
  liveUrl?: string;
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

// Collaboration Hub Types
export interface Note {
  id?: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'alumni' | 'admin';
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
  authorRole: 'student' | 'alumni' | 'admin';
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
  userRole: 'student' | 'alumni' | 'admin';
  teamRole: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
}

export interface Activity {
  id?: string;
  userId: string;
  userName: string;
  userRole: 'student' | 'alumni' | 'admin';
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