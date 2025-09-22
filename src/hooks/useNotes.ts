import { useState, useEffect, useCallback } from 'react';
import { Note, PaginatedResponse, ApiResponse } from '../types';
import { notesApi } from '../services/collaborationApi';
import { firebaseCollaborationService } from '../services/firebaseCollaborationService';

export const useNotes = (params: {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  authorId?: string;
  teamId?: string;
  isPublic?: boolean;
  autoRefresh?: boolean;
} = {}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      try {
        // Try API first
        response = await notesApi.getNotes(params);
      } catch (apiError) {
        // Silently fall back to Firebase - API is expected to fail during development
        response = await firebaseCollaborationService.getNotes(params);
      }
      
      if (response.success) {
        setNotes(response.data);
        setPagination(response.pagination);
      } else {
        setError('Failed to fetch notes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.search,
    JSON.stringify(params.tags),
    params.authorId,
    params.teamId,
    params.isPublic,
  ]);

  const createNote = async (note: Omit<Note, 'id' | 'createdAt' | 'lastModified' | 'version'>) => {
    try {
      let response;
      try {
        // Try API first
        response = await notesApi.createNote(note);
      } catch (apiError) {
        // Silently fall back to Firebase - API is expected to fail during development
        response = await firebaseCollaborationService.createNote(note);
      }
      
      if (response.success) {
        await fetchNotes(); // Refresh the list
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create note');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
      throw err;
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    try {
      try {
        // Try API first
        const response = await notesApi.updateNote(id, updates);
        if (response.success) {
          await fetchNotes(); // Refresh the list
          return true;
        } else {
          throw new Error('Failed to update note');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable
        throw new Error('Note operations are currently unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
      throw err;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      try {
        // Try API first
        const response = await notesApi.deleteNote(id);
        if (response.success) {
          await fetchNotes(); // Refresh the list
          return true;
        } else {
          throw new Error('Failed to delete note');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable
        throw new Error('Note operations are currently unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      throw err;
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (params.autoRefresh) {
      const interval = setInterval(fetchNotes, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [params.autoRefresh, fetchNotes]);

  return {
    notes,
    loading,
    error,
    pagination,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
};

export const useNote = (id: string | null) => {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNote = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      try {
        // Try API first
        const response = await notesApi.getNote(id);
        
        if (response.success && response.data) {
          setNote(response.data);
        } else {
          setError('Failed to fetch note');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable - set null note
        setNote(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async (updates: Partial<Note>) => {
    if (!id) return false;
    
    try {
      try {
        // Try API first
        const response = await notesApi.updateNote(id, updates);
        if (response.success) {
          await fetchNote(); // Refresh the note
          return true;
        } else {
          throw new Error('Failed to update note');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable
        throw new Error('Note operations are currently unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
      throw err;
    }
  };

  useEffect(() => {
    fetchNote();
  }, [id]);

  return {
    note,
    loading,
    error,
    fetchNote,
    updateNote,
  };
};