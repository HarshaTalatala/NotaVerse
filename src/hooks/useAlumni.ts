import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/services/firebase';

export interface AlumniRecord {
  id: string;
  name: string;
  email?: string;
  graduationYear?: number;
  company?: string;
  title?: string;
  location?: string;
  linkedIn?: string;
  bio?: string;
  skills?: string[];
  industry?: string;
  experience?: number;
  profileImage?: string;
  createdAt?: any;
}

export interface UseAlumniOptions {
  search?: string;
  year?: string;
  industry?: string;
  sortBy?: 'name' | 'year' | 'company';
  pageSize?: number;
  page?: number;
}

export function useAlumni(initial: Partial<UseAlumniOptions> = {}) {
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initial.page || 1);
  const [pageSize] = useState(initial.pageSize || 9);
  const [search, setSearch] = useState(initial.search || '');
  const [year, setYear] = useState(initial.year || '');
  const [industry, setIndustry] = useState(initial.industry || '');
  const [sortBy, setSortBy] = useState<UseAlumniOptions['sortBy']>(initial.sortBy || 'name');

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
  // TODO Phase F: Move sorting & filtering (industry/year) into Firestore queries with composite indexes.
  // Potential indexes: alumni(name ASC), alumni(graduationYear DESC), alumni(industry ASC, name ASC)
  const q = query(collection(db, 'alumni'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AlumniRecord[];
      setAlumni(list);
      setLoading(false);
    }, (err) => {
      console.error('[useAlumni] snapshot error', err);
      setError('Failed to load alumni');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let data = [...alumni];
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(a =>
        a.name.toLowerCase().includes(s) ||
        a.company?.toLowerCase().includes(s) ||
        a.title?.toLowerCase().includes(s) ||
        a.location?.toLowerCase().includes(s)
      );
    }
    if (year) data = data.filter(a => a.graduationYear?.toString() === year);
    if (industry) data = data.filter(a => a.industry?.toLowerCase().includes(industry.toLowerCase()));

    data.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'year':
          return (b.graduationYear || 0) - (a.graduationYear || 0);
        case 'company':
          return (a.company || '').localeCompare(b.company || '');
        default:
          return 0;
      }
    });
    return data;
  }, [alumni, search, year, industry, sortBy]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const uniqueYears = useMemo(
    () => Array.from(new Set(alumni.map(a => a.graduationYear).filter(Boolean))).sort((a, b) => (b || 0) - (a || 0)),
    [alumni]
  );
  const uniqueIndustries = useMemo(
    () => Array.from(new Set(alumni.map(a => a.industry).filter((i): i is string => !!i))),
    [alumni]
  );

  return {
    alumni: paged,
    all: alumni,
    total,
    page: currentPage,
    pageSize,
    setPage,
    loading,
    error,
    search,
    setSearch,
    year,
    setYear,
    industry,
    setIndustry,
    sortBy,
    setSortBy,
    uniqueYears,
    uniqueIndustries
  };
}

export default useAlumni;
