import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { createStudent } from '@/services/studentsService';
import { db } from '@/services/firebase';

function requireDb() {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}
import { useAuth } from '@/contexts/AuthContext';
import CustomDropdown from '@/components/CustomDropdown';

type Student = {
  id: string;
  name: string;
  email?: string;
  studentId?: string;
  year?: number;
  major?: string;
  gpa?: number;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  status?: 'active' | 'inactive' | 'graduated' | 'suspended';
  enrollmentDate?: any;
  expectedGraduation?: number;
  clubs?: string[];
  profileImage?: string;
  createdAt?: any;
};

export default function StudentsPage() {
  const { role } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'year' | 'major' | 'gpa'>('name');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterMajor, setFilterMajor] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    studentId: '',
    year: '',
    major: '',
    gpa: '',
    phone: '',
    address: '',
    emergencyContact: '',
    status: 'active',
    expectedGraduation: '',
    clubs: ''
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = () => {
      try {
  const d = requireDb();
  const q = query(collection(d, 'students'), orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const studentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Student[];
          
          setStudents(studentsData);
          setFilteredStudents(studentsData);
          setLoading(false);
        }, (err) => {
          console.error('Error fetching students:', err);
          setError('Failed to load students data');
          setLoading(false);
        });

        return unsubscribe;
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    const unsubscribe = fetchStudents();
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    let filtered = [...students];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.major?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Year filter
    if (filterYear) {
      filtered = filtered.filter(student => 
        student.year?.toString() === filterYear
      );
    }

    // Major filter
    if (filterMajor) {
      filtered = filtered.filter(student =>
        student.major?.toLowerCase().includes(filterMajor.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(student =>
        student.status === filterStatus
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'year':
          return (a.year || 0) - (b.year || 0);
        case 'major':
          return (a.major || '').localeCompare(b.major || '');
        case 'gpa':
          return (b.gpa || 0) - (a.gpa || 0);
        default:
          return 0;
      }
    });

    setFilteredStudents(filtered);
  }, [students, searchTerm, sortBy, filterYear, filterMajor, filterStatus]);

  const getUniqueYears = () => {
    const years = students
      .map(student => student.year)
      .filter(year => year)
      .sort((a, b) => (a || 0) - (b || 0));
    return [...new Set(years)];
  };

  const getUniqueMajors = (): string[] => {
    const majors = students
      .map(student => student.major)
      .filter((major): major is string => typeof major === 'string' && major.length > 0);
    return [...new Set(majors)];
  };

  const generateInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'graduated':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };



  const addNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStudent.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Clean data - remove undefined values for Firebase
      const studentData = {
        name: newStudent.name,
        studentId: newStudent.studentId || `STU${Date.now()}`,
        status: newStudent.status as 'active' | 'inactive' | 'graduated' | 'suspended',
        clubs: newStudent.clubs,
        ...(newStudent.email && { email: newStudent.email }),
        ...(newStudent.year && { year: parseInt(newStudent.year) }),
        ...(newStudent.major && { major: newStudent.major }),
        ...(newStudent.gpa && { gpa: parseFloat(newStudent.gpa) })
      };

      console.log('Student data being sent:', studentData);
      await createStudent(studentData);
      
      // Close modal immediately after success
      setShowNewStudentForm(false);
      
      // Reset form
      setNewStudent({
        name: '',
        email: '',
        studentId: '',
        year: '',
        major: '',
        gpa: '',
        phone: '',
        address: '',
        emergencyContact: '',
        status: 'active',
        expectedGraduation: '',
        clubs: ''
      });
    } catch (error: any) {
      console.error('Error adding student:', error);
      
      // Show detailed error message
      if (error.details) {
        console.log('Validation errors:', error.details);
        setError(`Validation failed: ${error.details.map((d: any) => d.message).join(', ')}`);
      } else {
        setError(`Failed to add student: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}'s record? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(id);
  const d = requireDb();
  await deleteDoc(doc(d, 'students', id));
    } catch (error) {
      console.error('Error deleting student:', error);
      setError('Failed to delete student');
    } finally {
      setDeletingId(null);
    }
  };

  const StudentCard = ({ student }: { student: Student }) => (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:shadow-green-500/10 hover:border-green-400 dark:hover:border-green-500 transition-all duration-500 transform hover:-translate-y-2 hover:scale-[1.02]">
      {/* Enhanced Gradient Header with Academic Pattern */}
      <div className="h-24 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/90 to-transparent"></div>
        {/* Academic Decorative Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="50,10 60,35 85,35 65,55 75,80 50,65 25,80 35,55 15,35 40,35" fill="white" fillOpacity="0.3"/>
            <circle cx="50" cy="50" r="35" fill="none" stroke="white" strokeWidth="0.5"/>
            <circle cx="50" cy="50" r="25" fill="none" stroke="white" strokeWidth="0.3"/>
          </svg>
        </div>
        
        {/* Enhanced Profile Image with Academic Badge - Positioned inside header */}
        <div className="absolute bottom-2 left-4">
          <div className="relative">
            {student.profileImage ? (
              <img
                src={student.profileImage}
                alt={student.name}
                className="w-16 h-16 rounded-xl object-cover border-3 border-white dark:border-gray-800 shadow-xl"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-white via-green-50 to-emerald-100 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 rounded-xl flex items-center justify-center border-3 border-white dark:border-gray-800 shadow-xl">
                <span className="text-gray-700 font-semibold text-lg">
                  {generateInitials(student.name)}
                </span>
              </div>
            )}
            {/* Academic Status Indicator */}
            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center ${
              student.status === 'active' ? 'bg-green-500' :
              student.status === 'graduated' ? 'bg-blue-500' :
              student.status === 'inactive' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Enhanced Header Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {student.year && (
            <span className="px-4 py-1.5 bg-white/25 backdrop-blur-md text-white text-xs font-semibold rounded-full border border-white/40 shadow-lg">
              Year {student.year}
            </span>
          )}
          {student.gpa && student.gpa >= 3.5 && (
            <span className="px-3 py-1 bg-gradient-to-r from-yellow-400/80 to-amber-500/80 backdrop-blur-sm text-white text-xs font-medium rounded-full border border-white/30">
              Dean's List
            </span>
          )}
        </div>

        {/* Floating Academic Elements */}
        <div className="absolute top-6 left-6 opacity-30">
          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
        </div>
        <div className="absolute bottom-4 right-8 opacity-20">
          <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
        </div>
      </div>

      <div className="pt-4 p-4">
        {/* Enhanced Student Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300 leading-tight">
                {student.name}
              </h3>
              {student.studentId && (
                <div className="text-gray-700 dark:text-gray-300 text-base font-semibold mb-1 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ID: {student.studentId}
                </div>
              )}
              {student.major && (
                <div className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-2">
                  <div className="w-5 h-5 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="font-medium">{student.major}</span>
                </div>
              )}
            </div>
            
            {/* GPA Performance Indicator */}
            {student.gpa && (
              <div className="flex flex-col items-center">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${(student.gpa / 4.0) * 100}, 100`}
                      className={`${
                        student.gpa >= 3.5 ? 'text-green-500' :
                        student.gpa >= 3.0 ? 'text-yellow-500' :
                        student.gpa >= 2.5 ? 'text-orange-500' : 'text-red-500'
                      }`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-bold ${
                      student.gpa >= 3.5 ? 'text-green-600 dark:text-green-400' :
                      student.gpa >= 3.0 ? 'text-yellow-600 dark:text-yellow-400' :
                      student.gpa >= 2.5 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {student.gpa.toFixed(1)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-1">GPA</span>
              </div>
            )}
          </div>
        </div>

        {/* Academic Performance Grid */}
        <div className="grid grid-cols-1 gap-2 mb-4">
          {student.expectedGraduation && (
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-800/50 dark:to-green-900/20 rounded-lg border border-gray-100 dark:border-gray-700/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expected Graduation</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{student.expectedGraduation}</p>
              </div>
            </div>
          )}
          
          {student.phone && (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800/50 dark:to-blue-900/20 rounded-xl border border-gray-100 dark:border-gray-700/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{student.phone}</p>
              </div>
            </div>
          )}
          
          {student.address && (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-800/50 dark:to-purple-900/20 rounded-xl border border-gray-100 dark:border-gray-700/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Address</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{student.address}</p>
              </div>
            </div>
          )}
        </div>

        {student.clubs && student.clubs.length > 0 && (
          <div className="mb-5">
            <div className="flex flex-wrap gap-1.5">
              {student.clubs.slice(0, 2).map((club, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 text-xs font-medium rounded-full border border-green-200 dark:border-green-700/30"
                >
                  {club}
                </span>
              ))}
              {student.clubs.length > 2 && (
                <span className="px-2.5 py-1 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-600">
                  +{student.clubs.length - 2}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Clubs & Activities */}
        {student.clubs && student.clubs.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Activities & Clubs</p>
            <div className="flex flex-wrap gap-1.5">
              {student.clubs.slice(0, 3).map((club, index) => (
                <span 
                  key={index} 
                  className="px-2.5 py-1 bg-gradient-to-r from-teal-100 to-green-100 dark:from-teal-900/30 dark:to-green-900/30 text-teal-700 dark:text-teal-300 text-xs font-medium rounded-full border border-teal-200 dark:border-teal-700/50"
                >
                  {club}
                </span>
              ))}
              {student.clubs.length > 3 && (
                <span className="px-2.5 py-1 bg-gradient-to-r from-gray-100 to-emerald-100 dark:from-gray-800/50 dark:to-emerald-900/30 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-600/50">
                  +{student.clubs.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Sophisticated Action Bar */}
        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/50">
          {student.email && (
            <button 
              onClick={() => window.open(`mailto:${student.email}`, '_blank')}
              className="group flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 dark:from-gray-800/50 dark:to-gray-700/50 dark:hover:from-gray-700/50 dark:hover:to-gray-600/50 border border-gray-200 dark:border-gray-600/50 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
            >
              <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-md flex items-center justify-center shadow-sm">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Message</span>
            </button>
          )}
          
          <Link
            to={`/students/${student.id}`}
            className="group flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
            <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-semibold relative z-10">View Profile</span>
          </Link>
          
          {role === 'admin' && (
            <button
              onClick={() => deleteStudent(student.id, student.name)}
              disabled={deletingId === student.id}
              className="group flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 dark:from-red-900/20 dark:to-red-800/30 dark:hover:from-red-800/30 dark:hover:to-red-700/40 border border-red-200 dark:border-red-700/50 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-[1.02] disabled:opacity-50"
              title="Delete Student"
            >
              <div className="w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 rounded-md flex items-center justify-center shadow-sm">
                {deletingId === student.id ? (
                  <div className="w-3 h-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium text-red-700 dark:text-red-300 group-hover:text-red-800 dark:group-hover:text-red-200">Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const StudentListItem = ({ student }: { student: Student }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-4">
        {student.profileImage ? (
          <img
            src={student.profileImage}
            alt={student.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 via-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {generateInitials(student.name)}
            </span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {student.name}
            </h3>
            {student.status && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(student.status)}`}>
                {student.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {student.studentId && <span>ID: {student.studentId}</span>}
            {student.major && <span>{student.major}</span>}
            {student.year && <span>Year {student.year}</span>}
            {student.gpa && <span>GPA: {student.gpa.toFixed(2)}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {student.email && (
            <a
              href={`mailto:${student.email}`}
              className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          )}
          <Link
            to={`/students/${student.id}`}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
          >
            View
          </Link>
          {role === 'admin' && (
            <button
              onClick={() => deleteStudent(student.id, student.name)}
              disabled={deletingId === student.id}
              className="px-3 py-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 disabled:opacity-50"
              title="Delete Student"
            >
              {deletingId === student.id ? (
                <div className="w-3 h-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Student Directory</h1>
            <p className="text-green-100">
              Manage {students.length} students in your institution
            </p>
          </div>
          {role === 'admin' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewStudentForm(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Add Student
              </button>

            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, student ID, major, or email..."
                className="input-primary block w-full pl-10 pr-3 py-2.5"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CustomDropdown
            label="Sort by"
            value={sortBy}
            onChange={(value) => setSortBy(value as 'name' | 'year' | 'major' | 'gpa')}
            options={[
              { value: 'name', label: 'Name (A-Z)', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg> },
              { value: 'year', label: 'Year', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { value: 'major', label: 'Major', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
              { value: 'gpa', label: 'GPA (High to Low)', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> }
            ]}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>}
          />

          <CustomDropdown
            label="Year"
            value={filterYear}
            onChange={setFilterYear}
            placeholder="All Years"
            options={[
              { value: '', label: 'All Years' },
              ...getUniqueYears().map(year => ({
                value: year?.toString() || '',
                label: `Year ${year}`,
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              }))
            ]}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />

          <CustomDropdown
            label="Major"
            value={filterMajor}
            onChange={setFilterMajor}
            placeholder="All Majors"
            searchable
            options={[
              { value: '', label: 'All Majors' },
              ...getUniqueMajors().map(major => ({
                value: major,
                label: major,
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              }))
            ]}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          />

          <CustomDropdown
            label="Status"
            value={filterStatus}
            onChange={setFilterStatus}
            placeholder="All Status"
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active', icon: <div className="w-2 h-2 rounded-full bg-green-500"></div> },
              { value: 'inactive', label: 'Inactive', icon: <div className="w-2 h-2 rounded-full bg-gray-500"></div> },
              { value: 'graduated', label: 'Graduated', icon: <div className="w-2 h-2 rounded-full bg-blue-500"></div> },
              { value: 'suspended', label: 'Suspended', icon: <div className="w-2 h-2 rounded-full bg-red-500"></div> }
            ]}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-400">
          Showing {filteredStudents.length} of {students.length} students
        </p>
        {(searchTerm || filterYear || filterMajor || filterStatus) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterYear('');
              setFilterMajor('');
              setFilterStatus('');
            }}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Students Grid/List */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No students found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm || filterYear || filterMajor || filterStatus
                ? 'Try adjusting your search criteria'
                : 'No students have been registered yet'}
            </p>
            {!searchTerm && !filterYear && !filterMajor && !filterStatus && role === 'admin' && (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowNewStudentForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Add Student
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredStudents.map(student => (
            viewMode === 'grid' ? (
              <StudentCard key={student.id} student={student} />
            ) : (
              <StudentListItem key={student.id} student={student} />
            )
          ))}
        </div>
      )}



      {/* Add New Student Form Modal */}
      {showNewStudentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={addNewStudent} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add New Student
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewStudentForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Name - Required */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="input-primary"
                    placeholder="Enter full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="input-primary"
                    placeholder="email@university.edu"
                  />
                </div>

                {/* Student ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={newStudent.studentId}
                    onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                    className="input-primary"
                    placeholder="ST2024001"
                  />
                </div>

                {/* Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Year
                  </label>
                  <CustomDropdown
                    options={[
                      { value: '', label: 'Select Year' },
                      { value: '1', label: '1st Year' },
                      { value: '2', label: '2nd Year' },
                      { value: '3', label: '3rd Year' },
                      { value: '4', label: '4th Year' }
                    ]}
                    value={newStudent.year}
                    onChange={(value) => setNewStudent({ ...newStudent, year: value })}
                    placeholder="Select Year"
                    className="w-full"
                  />
                </div>

                {/* Major */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Major
                  </label>
                  <input
                    type="text"
                    value={newStudent.major}
                    onChange={(e) => setNewStudent({ ...newStudent, major: e.target.value })}
                    className="input-primary"
                    placeholder="Computer Science"
                  />
                </div>

                {/* GPA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    GPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={newStudent.gpa}
                    onChange={(e) => setNewStudent({ ...newStudent, gpa: e.target.value })}
                    className="input-primary"
                    placeholder="3.75"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="input-primary"
                    placeholder="+1-555-0123"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <CustomDropdown
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'graduated', label: 'Graduated' },
                      { value: 'suspended', label: 'Suspended' }
                    ]}
                    value={newStudent.status}
                    onChange={(value) => setNewStudent({ ...newStudent, status: value })}
                    placeholder="Select Status"
                    className="w-full"
                  />
                </div>

                {/* Expected Graduation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expected Graduation
                  </label>
                  <input
                    type="number"
                    min="2024"
                    max="2030"
                    value={newStudent.expectedGraduation}
                    onChange={(e) => setNewStudent({ ...newStudent, expectedGraduation: e.target.value })}
                    className="input-primary"
                    placeholder="2027"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newStudent.address}
                    onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                    className="input-primary"
                    placeholder="123 University Ave, City, State 12345"
                  />
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={newStudent.emergencyContact}
                    onChange={(e) => setNewStudent({ ...newStudent, emergencyContact: e.target.value })}
                    className="input-primary"
                    placeholder="Parent Name - +1-555-0123"
                  />
                </div>

                {/* Clubs */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Clubs & Activities
                  </label>
                  <input
                    type="text"
                    value={newStudent.clubs}
                    onChange={(e) => setNewStudent({ ...newStudent, clubs: e.target.value })}
                    className="input-primary"
                    placeholder="Separate clubs with commas (e.g., Programming Club, Student Government)"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewStudentForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newStudent.name.trim()}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Add Student
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
