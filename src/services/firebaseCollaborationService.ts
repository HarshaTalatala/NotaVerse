import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  where, 
  Timestamp,
  Firestore
} from 'firebase/firestore';
import { db } from './firebase';
import { Note, Team, Activity, Comment, FileAttachment, PaginatedResponse, ApiResponse } from '../types';

// Firebase fallback service for when Azure Functions backend is not available
export class FirebaseCollaborationService {
  private getDb(): Firestore {
    if (!db) {
      throw new Error('Firebase is not properly configured. Please check your environment variables.');
    }
    return db;
  }
  
  // Notes operations
  async getNotes(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
    authorId?: string;
    teamId?: string;
    isPublic?: boolean;
  }) {
    try {
      let notesQuery = query(
        collection(this.getDb(), 'notes'), 
        orderBy('createdAt', 'desc')
      );

      if (filters?.authorId) {
        notesQuery = query(notesQuery, where('authorId', '==', filters.authorId));
      }
      
      if (filters?.teamId) {
        notesQuery = query(notesQuery, where('teamId', '==', filters.teamId));
      }
      
      if (filters?.isPublic !== undefined) {
        notesQuery = query(notesQuery, where('isPublic', '==', filters.isPublic));
      }
      
      if (filters?.tags && filters.tags.length > 0) {
        notesQuery = query(notesQuery, where('tags', 'array-contains-any', filters.tags));
      }

      if (filters?.limit) {
        notesQuery = query(notesQuery, limit(filters.limit));
      }

      const snapshot = await getDocs(notesQuery);
      let notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastModified: doc.data().lastModified?.toDate(),
      })) as Note[];

      // Apply text search filter (Firestore doesn't support full-text search)
      if (filters?.search) {
        notes = notes.filter(note =>
          note.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
          note.content.toLowerCase().includes(filters.search!.toLowerCase())
        );
      }

      return {
        success: true,
        data: notes,
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 10,
          total: notes.length,
          totalPages: Math.ceil(notes.length / (filters?.limit || 10))
        }
      } as PaginatedResponse<Note>;
    } catch (error) {
      console.error('Error getting notes:', error);
      throw error;
    }
  }

  async createNote(noteData: Omit<Note, 'id' | 'createdAt' | 'lastModified' | 'version'>) {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(this.getDb(), 'notes'), {
        ...noteData,
        createdAt: now,
        lastModified: now,
        version: 1
      });

      return {
        success: true,
        data: {
          id: docRef.id,
          ...noteData,
          createdAt: now.toDate(),
          lastModified: now.toDate(),
          version: 1
        } as Note
      } as ApiResponse<Note>;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  async updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) {
    try {
      const noteRef = doc(this.getDb(), 'notes', id);
      await updateDoc(noteRef, {
        ...updates,
        lastModified: Timestamp.now()
      });

      return {
        success: true,
        data: { id, ...updates } as Note
      };
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  async deleteNote(id: string) {
    try {
      await deleteDoc(doc(this.getDb(), 'notes', id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  // Teams operations
  async getTeams(filters?: { page?: number; limit?: number; userId?: string }) {
    try {
      let teamsQuery = query(
        collection(this.getDb(), 'teams'), 
        orderBy('createdAt', 'desc')
      );

      if (filters?.limit) {
        teamsQuery = query(teamsQuery, limit(filters.limit));
      }

      const snapshot = await getDocs(teamsQuery);
      let teams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Team[];

      // Filter by user membership if userId provided
      if (filters?.userId) {
        teams = teams.filter(team => 
          team.members.some(member => member.userId === filters.userId)
        );
      }

      return {
        success: true,
        data: teams,
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 10,
          total: teams.length,
          totalPages: Math.ceil(teams.length / (filters?.limit || 10))
        }
      } as PaginatedResponse<Team>;
    } catch (error) {
      console.error('Error getting teams:', error);
      throw error;
    }
  }

  async createTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'members'>) {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(this.getDb(), 'teams'), {
        ...teamData,
        createdAt: now,
        members: [] // Initialize with empty members array
      });

      return {
        success: true,
        data: {
          id: docRef.id,
          ...teamData,
          createdAt: now.toDate(),
          members: []
        } as Team
      } as ApiResponse<Team>;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  // Activities operations
  async getActivities(filters?: { page?: number; limit?: number; userId?: string; teamId?: string }) {
    try {
      let activitiesQuery = query(
        collection(this.getDb(), 'activities'), 
        orderBy('createdAt', 'desc')
      );

      if (filters?.userId) {
        activitiesQuery = query(activitiesQuery, where('userId', '==', filters.userId));
      }

      if (filters?.limit) {
        activitiesQuery = query(activitiesQuery, limit(filters.limit));
      }

      const snapshot = await getDocs(activitiesQuery);
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Activity[];

      return {
        success: true,
        data: activities,
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 10,
          total: activities.length,
          totalPages: Math.ceil(activities.length / (filters?.limit || 10))
        }
      } as PaginatedResponse<Activity>;
    } catch (error) {
      console.error('Error getting activities:', error);
      throw error;
    }
  }

  // Comments operations
  async getComments(noteId: string) {
    try {
      const commentsQuery = query(
        collection(this.getDb(), 'comments'), 
        where('noteId', '==', noteId),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(commentsQuery);
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Comment[];

      return {
        success: true,
        data: comments
      };
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  async createComment(commentData: Omit<Comment, 'id' | 'createdAt'>) {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(this.getDb(), 'comments'), {
        ...commentData,
        createdAt: now
      });

      return {
        success: true,
        data: {
          id: docRef.id,
          ...commentData,
          createdAt: now.toDate()
        } as Comment
      };
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }
}

export const firebaseCollaborationService = new FirebaseCollaborationService();