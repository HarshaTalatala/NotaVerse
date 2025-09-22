import { useState, useEffect, useCallback } from 'react';
import { Activity } from '../types';
import { activitiesApi } from '../services/collaborationApi';
import { firebaseCollaborationService } from '../services/firebaseCollaborationService';

export const useActivities = (params: {
  page?: number;
  limit?: number;
  userId?: string;
  teamId?: string;
  type?: string;
  entityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  autoRefresh?: boolean;
  role?: string; // added for backend filtering
} = {}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      try {
        // Try API first
        response = await activitiesApi.getActivities(params);
      } catch (apiError) {
        // Silently fall back to Firebase - API is expected to fail during development
        response = await firebaseCollaborationService.getActivities(params);
      }
      
      if (response.success) {
        setActivities(response.data);
        setPagination(response.pagination);
      } else {
        setError('Failed to fetch activities');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.userId,
    params.teamId,
    params.type,
    params.entityType,
    params.dateFrom?.toISOString(),
    params.dateTo?.toISOString(),
    params.role,
  ]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (params.autoRefresh) {
      const interval = setInterval(fetchActivities, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [params.autoRefresh, fetchActivities]);

  return {
    activities,
    loading,
    error,
    pagination,
    fetchActivities,
  };
};

export const useDashboardActivities = (userId: string | null, limit = 10) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardActivities = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      try {
        // Try API first
        const response = await activitiesApi.getDashboardActivities(userId, limit);
        
        if (response.success && response.data) {
          setActivities(response.data.activities);
          setStats(response.data.stats);
        } else {
          setError('Failed to fetch dashboard activities');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable - set empty data
        setActivities([]);
        setStats(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardActivities();
  }, [userId, limit]);

  // Auto-refresh dashboard activities
  useEffect(() => {
    if (userId) {
      const interval = setInterval(fetchDashboardActivities, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [userId]);

  return {
    activities,
    stats,
    loading,
    error,
    fetchDashboardActivities,
  };
};

export const useActivityStats = (params: {
  userId?: string;
  teamId?: string;
  days?: number;
} = {}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      try {
        // Try API first
        const response = await activitiesApi.getActivityStats(params);
        
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError('Failed to fetch activity stats');
        }
      } catch (apiError) {
        // Silently fail when API is unavailable - set empty stats
        setStats(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [params.userId, params.teamId, params.days]);

  return {
    stats,
    loading,
    error,
    fetchStats,
  };
};