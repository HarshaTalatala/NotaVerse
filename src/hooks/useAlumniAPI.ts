// Alumni hook using Azure Functions API with Firebase backend

import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';

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
  createdAt?: string;
}

export interface UseAlumniOptions {
  search?: string;
  year?: string;
  industry?: string;
  sortBy?: 'name' | 'year' | 'company';
  pageSize?: number;
  page?: number;
}

export function useAlumniAPI(initial: Partial<UseAlumniOptions> = {}) {
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initial.page || 1);
  const [pageSize] = useState(initial.pageSize || 9);
  const [search, setSearch] = useState(initial.search || '');
  const [year, setYear] = useState(initial.year || '');
  const [industry, setIndustry] = useState(initial.industry || '');
  const [sortBy, setSortBy] = useState<UseAlumniOptions['sortBy']>(initial.sortBy || 'name');

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit: pageSize,
        search,
        year,
        industry
      };

      console.log('Fetching alumni with params:', params);
      
      const response = await api.get('/getAlumni', { params });
      
      if (response.data.success) {
        setAlumni(response.data.data);
        console.log(`Loaded ${response.data.data.length} alumni`);
      } else {
        setError(response.data.error || 'Failed to fetch alumni');
      }
    } catch (err: any) {
      console.error('Error fetching alumni:', err);
      setError(err.response?.data?.error || err.message || 'Error fetching alumni');
    } finally {
      setLoading(false);
    }
  };

  const createAlumni = async (alumniData: Omit<AlumniRecord, 'id' | 'createdAt'>) => {
    try {
      const response = await api.post('/createAlumni', alumniData);
      if (response.data.success) {
        // Refresh the list
        await fetchAlumni();
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create alumni');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Error creating alumni';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getAlumniById = async (id: string) => {
    try {
      const response = await api.get('/getAlumniById', { params: { id } });
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Alumni not found');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Error fetching alumni';
      throw new Error(errorMessage);
    }
  };

  // Frontend sorting since API returns all data
  const sorted = useMemo(() => {
    const data = [...alumni];
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
  }, [alumni, sortBy]);

  const uniqueYears = useMemo(
    () => Array.from(new Set(alumni.map(a => a.graduationYear).filter(Boolean))).sort((a, b) => (b || 0) - (a || 0)),
    [alumni]
  );
  
  const uniqueIndustries = useMemo(
    () => Array.from(new Set(alumni.map(a => a.industry).filter((i): i is string => !!i))),
    [alumni]
  );

  useEffect(() => {
    fetchAlumni();
  }, [page, pageSize, search, year, industry]);

  return {
    alumni: sorted,
    all: alumni,
    total: sorted.length,
    page,
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
    uniqueIndustries,
    fetchAlumni,
    createAlumni,
    getAlumniById,
    refetch: fetchAlumni
  };
}

export default useAlumniAPI;