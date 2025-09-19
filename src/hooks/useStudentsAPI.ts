// Updated hooks to use Azure Functions API with Firebase backend

import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  year: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UseStudentsOptions {
  search?: string;
  department?: string;
  year?: number;
  sortBy?: 'firstName' | 'lastName' | 'year' | 'department';
  pageSize?: number;
  page?: number;
}

export function useStudentsAPI(initial: Partial<UseStudentsOptions> = {}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initial.page || 1);
  const [pageSize] = useState(initial.pageSize || 10);
  const [search, setSearch] = useState(initial.search || '');
  const [department, setDepartment] = useState(initial.department || '');
  const [year, setYear] = useState(initial.year);
  const [sortBy, setSortBy] = useState<UseStudentsOptions['sortBy']>(initial.sortBy || 'firstName');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit: pageSize,
        search,
        sortBy
      };

      console.log('Fetching students with params:', params);
      
      const response = await api.get('/getStudents', { params });
      
      if (response.data.success) {
        setStudents(response.data.data);
        console.log(`Loaded ${response.data.data.length} students`);
      } else {
        setError(response.data.error || 'Failed to fetch students');
      }
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError(err.response?.data?.error || err.message || 'Error fetching students');
    } finally {
      setLoading(false);
    }
  };

  const createStudent = async (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await api.post('/createStudent', studentData);
      if (response.data.success) {
        // Refresh the list
        await fetchStudents();
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create student');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Error creating student';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getStudentById = async (id: string) => {
    try {
      const response = await api.get('/getStudentById', { params: { id } });
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Student not found');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Error fetching student';
      throw new Error(errorMessage);
    }
  };

  // Filter students on the frontend (since we get all data from API)
  const filtered = useMemo(() => {
    let data = [...students];
    
    if (department) {
      data = data.filter(student => 
        student.department.toLowerCase().includes(department.toLowerCase())
      );
    }
    
    if (year) {
      data = data.filter(student => student.year === year);
    }

    return data;
  }, [students, department, year]);

  const uniqueDepartments = useMemo(
    () => Array.from(new Set(students.map(s => s.department).filter(Boolean))),
    [students]
  );

  const uniqueYears = useMemo(
    () => Array.from(new Set(students.map(s => s.year).filter(Boolean))).sort((a, b) => b - a),
    [students]
  );

  useEffect(() => {
    fetchStudents();
  }, [page, pageSize, search, sortBy]);

  return {
    students: filtered,
    all: students,
    total: filtered.length,
    page,
    pageSize,
    setPage,
    loading,
    error,
    search,
    setSearch,
    department,
    setDepartment,
    year,
    setYear,
    sortBy,
    setSortBy,
    uniqueDepartments,
    uniqueYears,
    fetchStudents,
    createStudent,
    getStudentById,
    refetch: fetchStudents
  };
}

export default useStudentsAPI;