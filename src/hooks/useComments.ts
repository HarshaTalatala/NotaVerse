import { useState, useEffect } from 'react';
import { Comment } from '../types';
import { commentsApi } from '../services/collaborationApi';
import { firebaseCollaborationService } from '../services/firebaseCollaborationService';

export const useComments = (noteId: string | null, autoRefresh = true) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchComments = async () => {
    if (!noteId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let response;
      try {
        // Try API first
        response = await commentsApi.getComments(noteId, {
          page: pagination.page,
          limit: pagination.limit,
        });
      } catch (apiError) {
        // Silently fall back to Firebase - API is expected to fail during development
        response = await firebaseCollaborationService.getComments(noteId);
      }
      
      if (response.success) {
        setComments(response.data);
        // Firebase service doesn't have pagination, so use defaults if not present
        if ('pagination' in response && response.pagination) {
          setPagination(response.pagination as any);
        } else {
          setPagination({
            page: 1,
            limit: 50,
            total: response.data.length,
            totalPages: 1,
          });
        }
      } else {
        setError('Failed to fetch comments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createComment = async (comment: Omit<Comment, 'id' | 'createdAt' | 'replies'>) => {
    try {
      let response;
      try {
        // Try API first
        response = await commentsApi.createComment(comment);
      } catch (apiError) {
        // Silently fall back to Firebase - API is expected to fail during development
        response = await firebaseCollaborationService.createComment(comment);
      }
      
      if (response.success) {
        await fetchComments(); // Refresh the list
        return response.data;
      } else {
        throw new Error('Failed to create comment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create comment');
      throw err;
    }
  };

  const updateComment = async (id: string, content: string) => {
    try {
      try {
        // Try API first
        const response = await commentsApi.updateComment(id, content);
        if (response.success) {
          await fetchComments(); // Refresh the list
          return true;
        } else {
          throw new Error('Failed to update comment');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable
        throw new Error('Comment operations are currently unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
      throw err;
    }
  };

  const deleteComment = async (id: string) => {
    try {
      try {
        // Try API first
        const response = await commentsApi.deleteComment(id);
        if (response.success) {
          await fetchComments(); // Refresh the list
          return true;
        } else {
          throw new Error('Failed to delete comment');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable
        throw new Error('Comment operations are currently unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
      throw err;
    }
  };

  useEffect(() => {
    fetchComments();
  }, [noteId, pagination.page, pagination.limit]);

  // Auto-refresh comments
  useEffect(() => {
    if (autoRefresh && noteId) {
      const interval = setInterval(fetchComments, 10000); // Refresh every 10 seconds for real-time feel
      return () => clearInterval(interval);
    }
  }, [autoRefresh, noteId]);

  return {
    comments,
    loading,
    error,
    pagination,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
  };
};