import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';

function requireDb() {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

type Alumni = {
  id: string;
  userId: string;
  name: string;
  email?: string;
  bio?: string;
  company?: string;
  title?: string;
  graduationYear?: number;
  location?: string;
  linkedIn?: string;
  industry?: string;
  skills?: string[];
  profileImage?: string;
  createdAt?: any;
  updatedAt?: any;
};

export default function AlumniProfilePage() {
  const { id } = useParams();
  const { role, user } = useAuth();
  const [alumni, setAlumni] = useState<Alumni | null>(null);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = role === 'admin' || (role === 'alumni' && alumni?.userId === user?.uid);

  useEffect(() => {
    const fetchAlumni = async () => {
      if (!id) return;
      try {
        const d = requireDb();
        const docRef = doc(d, 'alumni', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setAlumni({ id: docSnap.id, ...docSnap.data() } as Alumni);
        } else {
          setError('Alumni not found');
        }
      } catch (err: any) {
        console.error('Error fetching alumni:', err);
        setError(err.message || 'Failed to load alumni');
      } finally {
        setLoading(false);
      }
    };
    fetchAlumni();
  }, [id]);

  const save = async () => {
    if (!alumni || !id) return;
    try {
      const d = requireDb();
      const docRef = doc(d, 'alumni', id);
      await updateDoc(docRef, {
        ...alumni,
        updatedAt: new Date()
      });
      setEdit(false);
    } catch (err: any) {
      console.error('Error updating alumni:', err);
      setError(err.message || 'Failed to update alumni');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">😔</div>
        <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Oops!</h2>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    </div>
  );
  
  if (!alumni) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">👤</div>
        <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Alumni Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400">The profile you're looking for doesn't exist.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-8 text-white relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16"></div>
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center overflow-hidden shadow-lg">
                {alumni.profileImage ? (
                  <img
                    src={alumni.profileImage}
                    alt={alumni.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-medium text-white">
                    {alumni.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-semibold mb-1">{alumni.name}</h1>
                  {alumni.title && (
                    <p className="text-base text-blue-100 mb-1">{alumni.title}</p>
                  )}
                  {alumni.company && (
                    <p className="text-sm text-blue-200 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-4a1 1 0 011-1h2a1 1 0 011 1v4M7 7h10M7 11h10M7 15h6" />
                      </svg>
                      {alumni.company}
                    </p>
                  )}
                  {alumni.location && (
                    <p className="text-blue-200 flex items-center gap-2 mt-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {alumni.location}
                    </p>
                  )}
                </div>
                
                {canEdit && (
                  <div className="flex gap-3 mt-4 md:mt-0">
                    {!edit ? (
                      <button 
                        onClick={() => setEdit(true)}
                        className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-200 flex items-center gap-2 text-white border border-white/30"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Profile
                      </button>
                    ) : (
                      <div className="flex gap-3">
                        <button 
                          onClick={save}
                          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </button>
                        <button 
                          onClick={() => setEdit(false)}
                          className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-all duration-200 border border-white/30"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {alumni.graduationYear && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/30">
                    <div className="text-xs text-blue-100">Graduated</div>
                    <div className="text-base font-medium">{alumni.graduationYear}</div>
                  </div>
                )}
                {alumni.industry && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/30">
                    <div className="text-xs text-blue-100">Industry</div>
                    <div className="text-xs font-medium">{alumni.industry}</div>
                  </div>
                )}
                {alumni.skills && alumni.skills.length > 0 && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/30">
                    <div className="text-xs text-blue-100">Skills</div>
                    <div className="text-xs font-medium">{alumni.skills.length} skills</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Bio & Contact */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">About</h2>
            </div>
            
            {edit ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea 
                    value={alumni.bio || ''} 
                    onChange={(e) => setAlumni({...alumni, bio: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                    rows={6}
                    placeholder="Tell us about yourself, your journey, and your experiences..."
                  />
                </div>
              </div>
            ) : (
              <div className="prose prose-lg dark:prose-invert max-w-none">
                {alumni.bio ? (
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {alumni.bio}
                  </p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    No bio available yet.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Skills Section */}
          {((alumni.skills && alumni.skills.length > 0) || edit) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Skills & Expertise</h2>
              </div>
              
              {edit ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Skills (separate with commas)
                  </label>
                  <input 
                    type="text"
                    value={alumni.skills?.join(', ') || ''} 
                    onChange={(e) => setAlumni({...alumni, skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="React, Node.js, Python, Machine Learning..."
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {alumni.skills?.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Professional Info */}
        <div className="space-y-8">
          {/* Professional Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Professional</h2>
            </div>

            <div className="space-y-6">
              {edit ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Title</label>
                    <input 
                      type="text"
                      value={alumni.title || ''} 
                      onChange={(e) => setAlumni({...alumni, title: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Senior Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company</label>
                    <input 
                      type="text"
                      value={alumni.company || ''} 
                      onChange={(e) => setAlumni({...alumni, company: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Tech Company Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Industry</label>
                    <input 
                      type="text"
                      value={alumni.industry || ''} 
                      onChange={(e) => setAlumni({...alumni, industry: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Technology"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                    <input 
                      type="text"
                      value={alumni.location || ''} 
                      onChange={(e) => setAlumni({...alumni, location: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="San Francisco, CA"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {alumni.title && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Position</div>
                        <div className="font-medium text-gray-900 dark:text-white">{alumni.title}</div>
                      </div>
                    </div>
                  )}
                  
                  {alumni.company && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-4a1 1 0 011-1h2a1 1 0 011 1v4M7 7h10M7 11h10M7 15h6" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Company</div>
                        <div className="font-semibold text-gray-900 dark:text-white">{alumni.company}</div>
                      </div>
                    </div>
                  )}
                  
                  {alumni.industry && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Industry</div>
                        <div className="font-semibold text-gray-900 dark:text-white">{alumni.industry}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact & Social Links */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Connect</h2>
            </div>

            <div className="space-y-4">
              {edit ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input 
                      type="email"
                      value={alumni.email || ''} 
                      onChange={(e) => setAlumni({...alumni, email: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">LinkedIn</label>
                    <input 
                      type="url"
                      value={alumni.linkedIn || ''} 
                      onChange={(e) => setAlumni({...alumni, linkedIn: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Graduation Year</label>
                    <input 
                      type="number"
                      value={alumni.graduationYear || ''} 
                      onChange={(e) => setAlumni({...alumni, graduationYear: Number(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="2024"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {alumni.email && (
                    <a 
                      href={`mailto:${alumni.email}`}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors duration-200"
                    >
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{alumni.email}</span>
                    </a>
                  )}
                  
                  {alumni.linkedIn && (
                    <a 
                      href={alumni.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors duration-200"
                    >
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">LinkedIn Profile</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


