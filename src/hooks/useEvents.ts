import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/services/firebase';

export interface EventRecord {
  id: string;
  title: string;
  date?: any;
  location?: string;
  description?: string;
  type?: string;
  capacity?: number;
  organizer?: string;
  imageUrl?: string;
  tags?: string[];
  rsvps?: string[];
  createdAt?: any;
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

export function useEvents(initial: Partial<UseEventsOptions> = {}) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initial.page || 1);
  const [pageSize] = useState(initial.pageSize || 9);
  const [search, setSearch] = useState(initial.search || '');
  const [type, setType] = useState(initial.type || '');
  const [status, setStatus] = useState<UseEventsOptions['status']>(initial.status || 'all');

  useEffect(() => {
    if (!db) {
      // Firebase not initialized; stay empty but not error
      setLoading(false);
      return;
    }
    setLoading(true);
  // TODO Phase F: apply server-side pagination & filtering (status/date range) instead of fetching all.
  // Potential index: events(date ASC) + composite for (type, date) if filtered frequently.
  const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as EventRecord[];
      setEvents(list);
      setLoading(false);
    }, (err) => {
      console.error('[useEvents] snapshot error', err);
      setError('Failed to load events');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let data = [...events];
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(e =>
        e.title?.toLowerCase().includes(s) ||
        e.description?.toLowerCase().includes(s) ||
        e.location?.toLowerCase().includes(s) ||
        e.organizer?.toLowerCase().includes(s)
      );
    }
    if (type) data = data.filter(e => e.type === type);
    if (status && status !== 'all') {
      const now = new Date();
      data = data.filter(e => {
        if (!e.date) return false;
        const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return status === 'upcoming' ? d > now : d <= now;
      });
    }
    return data;
  }, [events, search, type, status]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return {
    events: paged,
    total,
    page: currentPage,
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
    all: events
  };
}

export default useEvents;
