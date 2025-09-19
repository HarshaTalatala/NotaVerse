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