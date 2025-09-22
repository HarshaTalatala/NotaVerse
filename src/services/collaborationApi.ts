import { 
  Note, 
  Comment, 
  FileAttachment, 
  Team, 
  Activity, 
  ApiResponse, 
  PaginatedResponse,
  SearchFilters 
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071/api';

// In development mode, skip API calls entirely to avoid CORS errors
const isDevelopment = import.meta.env.DEV;
const skipApiInDev = import.meta.env.VITE_SKIP_API_IN_DEV === 'true';

// Debug: Log API skip configuration
console.log('🔧 Collaboration API Config:', {
  isDevelopment,
  skipApiInDev,
  apiBaseUrl: API_BASE_URL
});

// Helper function for API requests with silent failure
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T> | PaginatedResponse<T>> {
  // Skip API calls in development if configured to do so
  if (isDevelopment && skipApiInDev) {
    throw new Error('API calls disabled in development');
  }

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Use a very short timeout to fail fast and avoid hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    // Silently fail and throw error to be caught by hooks
    throw new Error('API unavailable');
  }
}

// Notes API
export const notesApi = {
  // Get all notes with filters
  getNotes: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
    authorId?: string;
    teamId?: string;
    isPublic?: boolean;
  } = {}): Promise<PaginatedResponse<Note>> => {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.tags?.length) searchParams.append('tags', params.tags.join(','));
    if (params.authorId) searchParams.append('authorId', params.authorId);
    if (params.teamId) searchParams.append('teamId', params.teamId);
    if (params.isPublic !== undefined) searchParams.append('isPublic', params.isPublic.toString());

    return apiRequest<Note>(`/notes?${searchParams}`) as Promise<PaginatedResponse<Note>>;
  },

  // Get a specific note
  getNote: async (id: string): Promise<ApiResponse<Note>> => {
    return apiRequest<Note>(`/notes/${id}`) as Promise<ApiResponse<Note>>;
  },

  // Create a new note
  createNote: async (note: Omit<Note, 'id' | 'createdAt' | 'lastModified' | 'version'>): Promise<ApiResponse<{ id: string }>> => {
    return apiRequest<{ id: string }>('/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    }) as Promise<ApiResponse<{ id: string }>>;
  },

  // Update a note
  updateNote: async (id: string, updates: Partial<Note>): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }) as Promise<ApiResponse<null>>;
  },

  // Delete a note
  deleteNote: async (id: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/notes/${id}`, {
      method: 'DELETE',
    }) as Promise<ApiResponse<null>>;
  },
};

// Comments API
export const commentsApi = {
  // Get comments for a note
  getComments: async (noteId: string, params: {
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<Comment>> => {
    const searchParams = new URLSearchParams({ noteId });
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    return apiRequest<Comment>(`/comments?${searchParams}`) as Promise<PaginatedResponse<Comment>>;
  },

  // Create a new comment
  createComment: async (comment: Omit<Comment, 'id' | 'createdAt' | 'replies'>): Promise<ApiResponse<{ id: string }>> => {
    return apiRequest<{ id: string }>('/comments', {
      method: 'POST',
      body: JSON.stringify(comment),
    }) as Promise<ApiResponse<{ id: string }>>;
  },

  // Update a comment
  updateComment: async (id: string, content: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }) as Promise<ApiResponse<null>>;
  },

  // Delete a comment
  deleteComment: async (id: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/comments/${id}`, {
      method: 'DELETE',
    }) as Promise<ApiResponse<null>>;
  },
};

// Files API
export const filesApi = {
  // Get files with filters
  getFiles: async (params: {
    page?: number;
    limit?: number;
    teamId?: string;
    noteId?: string;
    userId?: string;
    isPublic?: boolean;
    tags?: string[];
  } = {}): Promise<PaginatedResponse<FileAttachment>> => {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.teamId) searchParams.append('teamId', params.teamId);
    if (params.noteId) searchParams.append('noteId', params.noteId);
    if (params.userId) searchParams.append('userId', params.userId);
    if (params.isPublic !== undefined) searchParams.append('isPublic', params.isPublic.toString());
    if (params.tags?.length) searchParams.append('tags', params.tags.join(','));

    return apiRequest<FileAttachment>(`/files?${searchParams}`) as Promise<PaginatedResponse<FileAttachment>>;
  },

  // Get file metadata
  getFile: async (id: string): Promise<ApiResponse<FileAttachment>> => {
    return apiRequest<FileAttachment>(`/files/${id}`) as Promise<ApiResponse<FileAttachment>>;
  },

  // Upload a file
  uploadFile: async (file: File, metadata: {
    uploadedBy: string;
    uploadedByName: string;
    teamId?: string;
    noteId?: string;
    isPublic: boolean;
    tags?: string[];
  }): Promise<ApiResponse<{ id: string; url: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', metadata.uploadedBy);
    formData.append('uploadedByName', metadata.uploadedByName);
    formData.append('isPublic', metadata.isPublic.toString());
    
    if (metadata.teamId) formData.append('teamId', metadata.teamId);
    if (metadata.noteId) formData.append('noteId', metadata.noteId);
    if (metadata.tags?.length) formData.append('tags', metadata.tags.join(','));

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }

    return response.json();
  },

  // Delete a file
  deleteFile: async (id: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/files/${id}`, {
      method: 'DELETE',
    }) as Promise<ApiResponse<null>>;
  },

  // Get download URL for a file
  getDownloadUrl: (id: string): string => {
    return `${API_BASE_URL}/files/${id}/download`;
  },
};

// Teams API
export const teamsApi = {
  // Get teams with filters
  getTeams: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
    isPrivate?: boolean;
    tags?: string[];
  } = {}): Promise<PaginatedResponse<Team>> => {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.userId) searchParams.append('userId', params.userId);
    if (params.isPrivate !== undefined) searchParams.append('isPrivate', params.isPrivate.toString());
    if (params.tags?.length) searchParams.append('tags', params.tags.join(','));

    return apiRequest<Team>(`/teams?${searchParams}`) as Promise<PaginatedResponse<Team>>;
  },

  // Get a specific team
  getTeam: async (id: string): Promise<ApiResponse<Team>> => {
    return apiRequest<Team>(`/teams/${id}`) as Promise<ApiResponse<Team>>;
  },

  // Create a new team
  createTeam: async (team: Omit<Team, 'id' | 'members' | 'createdAt'>): Promise<ApiResponse<{ id: string }>> => {
    return apiRequest<{ id: string }>('/teams', {
      method: 'POST',
      body: JSON.stringify(team),
    }) as Promise<ApiResponse<{ id: string }>>;
  },

  // Update a team
  updateTeam: async (teamId: string, updates: Partial<Team>): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }) as Promise<ApiResponse<null>>;
  },

  // Join a team
  joinTeam: async (teamId: string, userInfo: {
    userId: string;
    userName: string;
    userRole: 'student' | 'alumni' | 'admin';
  }): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/teams/${teamId}/join`, {
      method: 'POST',
      body: JSON.stringify(userInfo),
    }) as Promise<ApiResponse<null>>;
  },

  // Update member role
  updateMemberRole: async (teamId: string, userId: string, data: {
    teamRole: 'owner' | 'admin' | 'editor' | 'viewer';
    updatedBy: string;
  }): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/teams/${teamId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<ApiResponse<null>>;
  },

  // Remove member from team
  removeMember: async (teamId: string, userId: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    }) as Promise<ApiResponse<null>>;
  },

  // Delete a team
  deleteTeam: async (id: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/teams/${id}`, {
      method: 'DELETE',
    }) as Promise<ApiResponse<null>>;
  },
};

// Activities API
export const activitiesApi = {
  // Get activities with filters
  getActivities: async (params: {
    page?: number;
    limit?: number;
    userId?: string;
    teamId?: string;
    type?: string;
    entityType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    role?: string;
  } = {}): Promise<PaginatedResponse<Activity>> => {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.userId) searchParams.append('userId', params.userId);
    if (params.teamId) searchParams.append('teamId', params.teamId);
    if (params.type) searchParams.append('type', params.type);
    if (params.entityType) searchParams.append('entityType', params.entityType);
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom.toISOString());
    if (params.dateTo) searchParams.append('dateTo', params.dateTo.toISOString());
    if (params.role) searchParams.append('role', params.role);

    return apiRequest<Activity>(`/activities?${searchParams}`) as Promise<PaginatedResponse<Activity>>;
  },

  // Get dashboard activities
  getDashboardActivities: async (userId: string, limit: number = 10): Promise<ApiResponse<{
    activities: Activity[];
    stats: any;
  }>> => {
    const searchParams = new URLSearchParams({
      userId,
      limit: limit.toString(),
    });

    return apiRequest<{
      activities: Activity[];
      stats: any;
    }>(`/activities/dashboard?${searchParams}`) as Promise<ApiResponse<{
      activities: Activity[];
      stats: any;
    }>>;
  },

  // Create a manual activity
  createActivity: async (activity: Omit<Activity, 'id' | 'createdAt'>): Promise<ApiResponse<{ id: string }>> => {
    return apiRequest<{ id: string }>('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    }) as Promise<ApiResponse<{ id: string }>>;
  },

  // Get activity statistics
  getActivityStats: async (params: {
    userId?: string;
    teamId?: string;
    days?: number;
  } = {}): Promise<ApiResponse<any>> => {
    const searchParams = new URLSearchParams();
    
    if (params.userId) searchParams.append('userId', params.userId);
    if (params.teamId) searchParams.append('teamId', params.teamId);
    if (params.days) searchParams.append('days', params.days.toString());

    return apiRequest<any>(`/activities/stats?${searchParams}`) as Promise<ApiResponse<any>>;
  },
};