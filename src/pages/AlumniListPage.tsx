import { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAlumni } from '@/hooks/useAlumni';
import Pagination from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import CustomDropdown from '@/components/CustomDropdown';

type Alumni = {
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
  createdAt?: any; // Firestore timestamp
};

export default function AlumniListPage() {
  const { role } = useAuth();
  const {
    alumni, all: allAlumni, loading, error: loadError,
    search, setSearch, sortBy, setSortBy, year, setYear,
    industry, setIndustry, page, pageSize, setPage,
    uniqueYears, uniqueIndustries
  } = useAlumni({ pageSize: 9 });
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewAlumniForm, setShowNewAlumniForm] = useState(false);
  const [newAlumni, setNewAlumni] = useState({
    name: '',
    email: '',
    graduationYear: '',
    company: '',
    title: '',
    location: '',
    linkedIn: '',
    bio: '',
    industry: '',
    skills: ''
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Derived helpers now from hook values

  const getUniqueYears = () => uniqueYears;
  const getUniqueIndustries = () => uniqueIndustries;

  const generateInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };



  const addNewAlumni = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAlumni.name.trim()) { 
      setActionError('Name is required'); 
      return; 
    }

    try {
      setActionError(null);

      // Clean data - only include fields that have values (no undefined)
      const alumniData: any = {
        name: newAlumni.name.trim(),
        createdAt: serverTimestamp()
      };

      // Only add fields that have actual values
      if (newAlumni.email.trim()) alumniData.email = newAlumni.email.trim();
      if (newAlumni.graduationYear) alumniData.graduationYear = parseInt(newAlumni.graduationYear);
      if (newAlumni.company.trim()) alumniData.company = newAlumni.company.trim();
      if (newAlumni.title.trim()) alumniData.title = newAlumni.title.trim();
      if (newAlumni.location.trim()) alumniData.location = newAlumni.location.trim();
      if (newAlumni.linkedIn.trim()) alumniData.linkedIn = newAlumni.linkedIn.trim();
      if (newAlumni.bio.trim()) alumniData.bio = newAlumni.bio.trim();
      if (newAlumni.industry.trim()) alumniData.industry = newAlumni.industry.trim();
      if (newAlumni.skills.trim()) {
        alumniData.skills = newAlumni.skills.split(',').map(s => s.trim()).filter(Boolean);
      }

      if (!db) throw new Error('Database not ready');
      await addDoc(collection(db, 'alumni'), alumniData);
      
      // Close modal immediately after success
      setShowNewAlumniForm(false);
      
      // Reset form
      setNewAlumni({
        name: '',
        email: '',
        graduationYear: '',
        company: '',
        title: '',
        location: '',
        linkedIn: '',
        bio: '',
        industry: '',
        skills: ''
      });
      
    } catch (error) {
      console.error('Error adding alumni:', error);
      setActionError('Failed to add alumni');
    }
  };

  const deleteAlumni = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}'s profile? This action cannot be undone.`)) {
      return;
    }

    try {
  setDeletingId(id);
  if (!db) throw new Error('Database not ready');
  await deleteDoc(doc(db, 'alumni', id));
    } catch (error) {
      console.error('Error deleting alumni:', error);
  setActionError('Failed to delete alumni');
    } finally {
      setDeletingId(null);
    }
  };

  const AlumniCard = ({ person }: { person: Alumni }) => (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-500 transform hover:-translate-y-2 hover:scale-[1.02]">
      {/* Enhanced Gradient Header with Pattern */}
      <div className="h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-transparent"></div>
        {/* Decorative Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="0.5"/>
            <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="0.3"/>
            <circle cx="50" cy="50" r="20" fill="none" stroke="white" strokeWidth="0.2"/>
          </svg>
        </div>
        
        {/* Profile Image with Status Indicator - Positioned inside header */}
        <div className="absolute bottom-2 left-4">
          <div className="relative">
            {person.profileImage ? (
              <img
                src={person.profileImage}
                alt={person.name}
                className="w-16 h-16 rounded-xl object-cover border-3 border-white dark:border-gray-800 shadow-xl"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-white via-blue-50 to-indigo-100 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 rounded-xl flex items-center justify-center border-3 border-white dark:border-gray-800 shadow-xl">
                <span className="text-gray-700 font-semibold text-lg">
                  {generateInitials(person.name)}
                </span>
              </div>
            )}
            {/* Online Status Indicator */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Enhanced Header Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {person.graduationYear && (
            <span className="px-3 py-1 bg-white/25 backdrop-blur-md text-white text-xs font-medium rounded-full border border-white/40 shadow-lg">
              Class of '{person.graduationYear.toString().slice(-2)}
            </span>
          )}
          {person.experience && person.experience > 0 && (
            <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-400/80 to-orange-500/80 backdrop-blur-sm text-white text-xs font-normal rounded-full border border-white/30">
              {person.experience}+ years
            </span>
          )}
        </div>

        {/* Floating Elements */}
        <div className="absolute top-6 left-6 opacity-30">
          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
        </div>
        <div className="absolute bottom-4 right-8 opacity-20">
          <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
        </div>
      </div>

      <div className="pt-4 p-4">
        {/* Enhanced Header Section */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 leading-tight">
                {person.name}
              </h3>
              {person.title && (
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  {person.title}
                </p>
              )}
              {person.company && (
                <p className="text-gray-600 dark:text-gray-400 text-xs flex items-center gap-2">
                  <span className="inline-flex w-4 h-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                  <span className="font-normal">{person.company}</span>
                </p>
              )}
            </div>
            
            {/* Professional Rating/Score */}
            {person.experience && (
              <div className="flex flex-col items-center">
                <div className="relative w-10 h-10">
                  <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${Math.min(person.experience * 10, 100)}, 100`}
                      className="text-blue-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {person.experience}Y
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-1">Experience</span>
              </div>
            )}
          </div>
        </div>

        {/* Professional Info Grid */}
        <div className="grid grid-cols-1 gap-2 mb-4">
          {person.location && (
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800/50 dark:to-blue-900/20 rounded-lg border border-gray-100 dark:border-gray-700/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Location</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{person.location}</p>
              </div>
            </div>
          )}
          
          {person.industry && (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-800/50 dark:to-purple-900/20 rounded-xl border border-gray-100 dark:border-gray-700/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v6.5M8 6v6.5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Industry</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{person.industry}</p>
              </div>
            </div>
          )}
        </div>

        {person.bio && (
          <div className="mb-4 p-3 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-800/50 dark:via-blue-900/10 dark:to-indigo-900/10 rounded-lg border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">About</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 leading-relaxed font-normal">
              {person.bio}
            </p>
          </div>
        )}

        {person.skills && person.skills.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Skills</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {person.skills.slice(0, 4).map((skill, index) => (
                <span
                  key={index}
                  className="group px-2.5 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-medium rounded-lg shadow-md hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
                >
                  {skill}
                </span>
              ))}
              {person.skills.length > 4 && (
                <span className="px-2.5 py-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-500">
                  +{person.skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Action Bar */}
        <div className="flex items-center justify-between pt-5 border-t-2 border-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20">
          <Link
            to={`/alumni/${person.id}`}
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="relative z-10">View Profile</span>
          </Link>
          
          <div className="flex items-center gap-2">
            {person.email && (
              <a
                href={`mailto:${person.email}`}
                className="group p-2.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 hover:shadow-md"
                title="Send Email"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            )}
            {person.linkedIn && (
              <a
                href={person.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-2.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 hover:shadow-md"
                title="LinkedIn Profile"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            )}
            {role === 'admin' && (
              <button
                onClick={() => deleteAlumni(person.id, person.name)}
                disabled={deletingId === person.id}
                className="group p-2.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 disabled:opacity-50 hover:shadow-md"
                title="Delete Alumni"
              >
                {deletingId === person.id ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                ) : (
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const AlumniListItem = ({ person }: { person: Alumni }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-4">
        {person.profileImage ? (
          <img
            src={person.profileImage}
            alt={person.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {generateInitials(person.name)}
            </span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {person.name}
            </h3>
            {person.graduationYear && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                '{person.graduationYear.toString().slice(-2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {person.title && <span>{person.title}</span>}
            {person.company && <span>@ {person.company}</span>}
            {person.location && <span>📍 {person.location}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {person.linkedIn && (
            <a
              href={person.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          )}
          <Link
            to={`/alumni/${person.id}`}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
          >
            View
          </Link>
          {role === 'admin' && (
            <button
              onClick={() => deleteAlumni(person.id, person.name)}
              disabled={deletingId === person.id}
              className="px-3 py-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 disabled:opacity-50"
              title="Delete Alumni"
            >
              {deletingId === person.id ? (
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
      <div className="space-y-6">
        <div className="h-40 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-5/6 mb-4" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-600 dark:text-red-400">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Alumni Directory</h1>
            <p className="text-blue-100">
              Connect with {allAlumni.length} alumni from our community
            </p>
          </div>
          {role === 'admin' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewAlumniForm(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg font-normal transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Add Alumni
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
              <div className="relative">
                <input
                  type="text"
                  placeholder=""
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); setActionError(null); }}
                />
                {!search && (
                  <div className="absolute left-10 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                    Search by name, company, title, or location...
                  </div>
                )}
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CustomDropdown
            label="Sort by"
            value={sortBy || 'name'}
            onChange={(value) => { setSortBy(value as any); setPage(1); }}
            options={[
              { value: 'name', label: 'Name (A-Z)', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg> },
              { value: 'year', label: 'Graduation Year', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { value: 'company', label: 'Company', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> }
            ]}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>}
          />

          <CustomDropdown
            label="Graduation Year"
            value={year}
            onChange={(v) => { setYear(v); setPage(1); }}
            placeholder="All Years"
            options={[
              { value: '', label: 'All Years' },
              ...getUniqueYears().map(y => ({
                value: y?.toString() || '',
                label: y?.toString() || '',
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              }))
            ]}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />

          <CustomDropdown
            label="Industry"
            value={industry}
            onChange={(v) => { setIndustry(v); setPage(1); }}
            placeholder="All Industries"
            searchable
            options={[
              { value: '', label: 'All Industries' },
              ...getUniqueIndustries().map(ind => ({
                value: ind,
                label: ind,
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v6.5M8 6v6.5" /></svg>
              }))
            ]}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v6.5M8 6v6.5" /></svg>}
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-400">
          Showing {alumni.length} of {allAlumni.length} alumni
        </p>
  {(search || year || industry) && (
          <button
            onClick={() => {
              setSearch('');
              setYear('');
              setIndustry('');
              setPage(1);
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Alumni Grid/List */}
  {alumni.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No alumni found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {search || year || industry
                ? 'Try adjusting your search criteria'
                : 'No alumni have been registered yet'}
            </p>
            {!search && !year && !industry && role === 'admin' && (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowNewAlumniForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Add Alumni
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
          {alumni.map(person => (
            viewMode === 'grid' ? (
              <AlumniCard key={person.id} person={person} />
            ) : (
              <AlumniListItem key={person.id} person={person} />
            )
          ))}
        </div>
      )}



      {/* Add New Alumni Form Modal */}
      {showNewAlumniForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={addNewAlumni} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Add New Alumni
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewAlumniForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {(actionError || loadError) && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{actionError || loadError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Name - Required */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAlumni.name}
                    onChange={(e) => setNewAlumni({ ...newAlumni, name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
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
                    value={newAlumni.email}
                    onChange={(e) => setNewAlumni({ ...newAlumni, email: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="email@example.com"
                  />
                </div>

                {/* Graduation Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Graduation Year
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2030"
                    value={newAlumni.graduationYear}
                    onChange={(e) => setNewAlumni({ ...newAlumni, graduationYear: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="2020"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={newAlumni.company}
                    onChange={(e) => setNewAlumni({ ...newAlumni, company: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="Company name"
                  />
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={newAlumni.title}
                    onChange={(e) => setNewAlumni({ ...newAlumni, title: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="Job title"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newAlumni.location}
                    onChange={(e) => setNewAlumni({ ...newAlumni, location: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="City, State/Country"
                  />
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={newAlumni.industry}
                    onChange={(e) => setNewAlumni({ ...newAlumni, industry: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="Technology, Finance, Healthcare, etc."
                  />
                </div>

                {/* LinkedIn */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    LinkedIn Profile
                  </label>
                  <input
                    type="url"
                    value={newAlumni.linkedIn}
                    onChange={(e) => setNewAlumni({ ...newAlumni, linkedIn: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                {/* Skills */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Skills
                  </label>
                  <input
                    type="text"
                    value={newAlumni.skills}
                    onChange={(e) => setNewAlumni({ ...newAlumni, skills: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="Separate skills with commas (e.g., JavaScript, React, Python)"
                  />
                </div>

                {/* Bio */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    value={newAlumni.bio}
                    onChange={(e) => setNewAlumni({ ...newAlumni, bio: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="Brief description about the alumni..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewAlumniForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newAlumni.name.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
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
                      Add Alumni
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


