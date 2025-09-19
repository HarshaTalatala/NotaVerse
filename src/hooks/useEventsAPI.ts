// Events hook using Azure Functions API with Firebase backend

import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';

export interface EventRecord {
  id: string;
  title: string;
  date?: string;
  location?: string;
  description?: string;
  type?: string;
  capacity?: number;
  organizer?: string;
  imageUrl?: string;
  tags?: string[];
  rsvps?: string[];
  createdAt?: string;
  createdBy?: string;
  status?: string;
}

export interface UseEventsOptions {
  type?: string;
  status?: 'all' | 'upcoming' | 'past';
  search?: string;
  pageSize?: number;
  page?: number;
}

export function useEventsAPI(initial: Partial<UseEventsOptions> = {}) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initial.page || 1);
  const [pageSize] = useState(initial.pageSize || 9);
  const [search, setSearch] = useState(initial.search || '');
  const [type, setType] = useState(initial.type || '');
  const [status, setStatus] = useState<UseEventsOptions['status']>(initial.status || 'all');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit: pageSize,
        search,
        type: type === 'all' ? '' : type
      };

      console.log('Fetching events with params:', params);
      
      const response = await api.get('/getEvents', { params });
      
      if (response.data.success) {
        setEvents(response.data.data);
        console.log(`Loaded ${response.data.data.length} events`);
      } else {
        setError(response.data.error || 'Failed to fetch events');
      }
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.response?.data?.error || err.message || 'Error fetching events');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: Omit<EventRecord, 'id' | 'createdAt' | 'rsvps'>) => {
    try {
      const response = await api.post('/createEvent', eventData);
      if (response.data.success) {
        // Refresh the list
        await fetchEvents();
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create event');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Error creating event';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getEventById = async (id: string) => {
    try {
      const response = await api.get('/getEventById', { params: { id } });
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Event not found');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Error fetching event';
      throw new Error(errorMessage);
    }
  };

  // Frontend filtering for status (past/upcoming)
  const filtered = useMemo(() => {
    let data = [...events];
    
    if (status && status !== 'all') {
      const now = new Date();
      data = data.filter(e => {
        if (!e.date) return false;
        const eventDate = new Date(e.date);
        return status === 'upcoming' ? eventDate > now : eventDate <= now;
      });
    }
    
    return data;
  }, [events, status]);

  const uniqueTypes = useMemo(
    () => Array.from(new Set(events.map(e => e.type).filter(Boolean))),
    [events]
  );

  useEffect(() => {
    fetchEvents();
  }, [page, pageSize, search, type]);

  return {
    events: filtered,
    all: events,
    total: filtered.length,
    page,
    pageSize,
    setPage,
    loading,
    error,
    search,
    setSearch,
    type,
    setType,
    status,
    setStatus,
    uniqueTypes,
    fetchEvents,
    createEvent,
    getEventById,
    refetch: fetchEvents
  };
}

export default useEventsAPI;