import { useState, useEffect, useCallback } from 'react';
import { Team } from '../types';
import { teamsApi } from '../services/collaborationApi';
import { firebaseCollaborationService } from '../services/firebaseCollaborationService';

export const useTeams = (params: {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  isPrivate?: boolean;
  tags?: string[];
} = {}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      try {
        // Try API first
        response = await teamsApi.getTeams(params);
      } catch (apiError) {
        // Silently fall back to Firebase - API is expected to fail during development
        response = await firebaseCollaborationService.getTeams(params);
      }
      
      if (response.success) {
        setTeams(response.data);
        setPagination(response.pagination);
      } else {
        setError('Failed to fetch teams');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.userId, params.isPrivate, JSON.stringify(params.tags)]);

  const createTeam = async (team: Omit<Team, 'id' | 'members' | 'createdAt'>) => {
    try {
      let response;
      try {
        // Try API first
        response = await teamsApi.createTeam(team);
      } catch (apiError) {
        // Silently fall back to Firebase - API is expected to fail during development
        response = await firebaseCollaborationService.createTeam(team);
      }
      
      if (response.success) {
        await fetchTeams(); // Refresh the list
        return response.data;
      } else {
        throw new Error('Failed to create team');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
      throw err;
    }
  };

  const joinTeam = async (teamId: string, userInfo: {
    userId: string;
    userName: string;
    userRole: 'student' | 'alumni' | 'admin';
  }) => {
    try {
      try {
        // Try API first
        const response = await teamsApi.joinTeam(teamId, userInfo);
        if (response.success) {
          await fetchTeams(); // Refresh the list
          return true;
        } else {
          throw new Error('Failed to join team');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable
        throw new Error('Team operations are currently unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
      throw err;
    }
  };

  const updateMemberRole = async (teamId: string, userId: string, data: {
    teamRole: 'owner' | 'admin' | 'editor' | 'viewer';
    updatedBy: string;
  }) => {
    try {
      try {
        // Try API first
        const response = await teamsApi.updateMemberRole(teamId, userId, data);
        if (response.success) {
          await fetchTeams(); // Refresh the list
          return true;
        } else {
          throw new Error('Failed to update member role');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable
        throw new Error('Team operations are currently unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role');
      throw err;
    }
  };

  const removeMember = async (teamId: string, userId: string) => {
    try {
      try {
        // Try API first
        const response = await teamsApi.removeMember(teamId, userId);
        if (response.success) {
          await fetchTeams(); // Refresh the list
          return true;
        } else {
          throw new Error('Failed to remove member');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable
        throw new Error('Team operations are currently unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      throw err;
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      try {
        // Try API first
        const response = await teamsApi.deleteTeam(id);
        if (response.success) {
          await fetchTeams(); // Refresh the list
          return true;
        } else {
          throw new Error('Failed to delete team');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable
        throw new Error('Team operations are currently unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team');
      throw err;
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
    teams,
    loading,
    error,
    pagination,
    fetchTeams,
    createTeam,
    joinTeam,
    updateMemberRole,
    removeMember,
    deleteTeam,
  };
};

export const useTeam = (id: string | null) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      try {
        // Try API first
        const response = await teamsApi.getTeam(id);
        
        if (response.success && response.data) {
          setTeam(response.data);
        } else {
          setError('Failed to fetch team');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable - set null team
        setTeam(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [id]);

  return {
    team,
    loading,
    error,
    fetchTeam,
  };
};