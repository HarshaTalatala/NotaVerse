import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { formatShort } from '../utils/date';
// Collaboration service imports removed - features will be rebuilt later
// import { vaultService, noteService } from '@/services/collaborationService';

function requireDb() {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState({
    alumniCount: 0,
    studentsCount: 0,
    eventsCount: 0,
    activeEvents: 0,
    newAlumniThisMonth: 0,
    activeStudents: 0,
    vaultsCount: 0,
    notesCount: 0,
  });
  const [recentAlumni, setRecentAlumni] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
  const unsubscribers: (() => void)[] = [];
  const d = requireDb();

    // Alumni count
  const alumniUnsub = onSnapshot(collection(d, 'alumni'), (snap) => {
      setStats(prev => ({ ...prev, alumniCount: snap.size }));
    });
    unsubscribers.push(alumniUnsub);

    // Students count
  const studentsUnsub = onSnapshot(collection(d, 'students'), (snap) => {
      let studentsCount = 0;
      let activeStudents = 0;

      snap.forEach(doc => {
        const studentData = doc.data();
        studentsCount++;
        if (studentData.status === 'active') {
          activeStudents++;
        }
      });

      setStats(prev => ({ ...prev, studentsCount, activeStudents }));
    });
    unsubscribers.push(studentsUnsub);

    // Events count
  const eventsUnsub = onSnapshot(collection(d, 'events'), (snap) => {
      const now = new Date();
      let eventsCount = 0;
      let activeEvents = 0;

      snap.forEach(doc => {
        const eventData = doc.data();
        eventsCount++;
        
        if (eventData.date) {
          try {
            // Use same pattern as date utility
            const eventDate = eventData.date?.toDate ? eventData.date.toDate() : new Date(eventData.date);
            
            if (!isNaN(eventDate.getTime()) && eventDate > now) {
              activeEvents++;
            }
          } catch (error) {
            console.error('Error parsing event date:', error, eventData.date);
          }
        }
      });

      setStats(prev => ({ ...prev, eventsCount, activeEvents }));
    });
    unsubscribers.push(eventsUnsub);

    // Recent alumni (last 5)
    const recentAlumniUnsub = onSnapshot(
  query(collection(d, 'alumni'), orderBy('createdAt', 'desc'), limit(5)),
      (snap) => {
        setRecentAlumni(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    unsubscribers.push(recentAlumniUnsub);

    // Upcoming events (next 3)
    const upcomingEventsUnsub = onSnapshot(
      query(
  collection(d, 'events'),
        where('date', '>', new Date()),
        orderBy('date', 'asc'),
        limit(3)
      ),
      (snap) => {
        setUpcomingEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    unsubscribers.push(upcomingEventsUnsub);

    // Collaboration features temporarily removed - will be rebuilt later
    // const loadCollaborationStats = async () => {
    //   // TODO: Implement collaboration features from scratch
    // };
    
    // Set default collaboration stats to 0
    setStats(prev => ({
      ...prev,
      vaultsCount: 0,
      notesCount: 0
    }));

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };



  const StatCard = ({ title, value, icon, trend, color = 'blue' }: {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    trend?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange';
  }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600 text-blue-600',
      green: 'from-green-500 to-green-600 text-green-600',
      purple: 'from-purple-500 to-purple-600 text-purple-600',
      orange: 'from-orange-500 to-orange-600 text-orange-600'
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
            {trend && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{trend}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-gradient-to-r ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}>
            <div className="text-white">
              {icon}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const QuickActionCard = ({ title, description, icon, to, color = 'blue' }: {
    title: string;
    description: string;
    icon: React.ReactNode;
    to: string;
    color?: 'blue' | 'green' | 'purple' | 'orange';
  }) => {
    const colorClasses = {
      blue: 'hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/50',
      green: 'hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-950/50',
      purple: 'hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/50',
      orange: 'hover:border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/50'
    };

    return (
      <Link to={to} className={`block p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${colorClasses[color]} transition-all duration-200 group`}>
        <div className="flex items-center gap-3">
          <div className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {user?.displayName || user?.email?.split('@')[0]}!
        </h1>
        <p className="text-blue-100 mt-2">
          Welcome to your NotaVerse dashboard. Here's what's happening today.
        </p>
        <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-sm font-medium">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          Role: {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'}
        </div>
      </div>

      {/* Stats Grid - Role-based */}
      <div className={`grid gap-4 ${
        role === 'admin' 
          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7' 
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      }`}>
        {/* Admin sees all stats */}
        {role === 'admin' && (
          <>
            <StatCard
              title="Total Alumni"
              value={stats.alumniCount}
              color="blue"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              }
            />
            <StatCard
              title="Total Students"
              value={stats.studentsCount}
              color="green"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <StatCard
              title="Active Students"
              value={stats.activeStudents}
              color="purple"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Total Events"
              value={stats.eventsCount}
              color="orange"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              title="Active Events"
              value={stats.activeEvents}
              color="blue"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <StatCard
              title="Active Vaults"
              value={stats.vaultsCount}
              color="purple"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
            <StatCard
              title="Shared Notes"
              value={stats.notesCount}
              color="green"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
          </>
        )}

        {/* Students see collaboration-focused stats */}
        {role === 'student' && (
          <>
            <StatCard
              title="My Vaults"
              value={stats.vaultsCount}
              color="purple"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
            <StatCard
              title="My Notes"
              value={stats.notesCount}
              color="green"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <StatCard
              title="Upcoming Events"
              value={stats.activeEvents}
              color="blue"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              title="Alumni Network"
              value={stats.alumniCount}
              color="orange"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              }
            />
          </>
        )}

        {/* Alumni see network and event stats */}
        {role === 'alumni' && (
          <>
            <StatCard
              title="Alumni Network"
              value={stats.alumniCount}
              color="blue"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              }
            />
            <StatCard
              title="Current Students"
              value={stats.studentsCount}
              color="green"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <StatCard
              title="Upcoming Events"
              value={stats.activeEvents}
              color="orange"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              title="Shared Resources"
              value={stats.vaultsCount}
              color="purple"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Quick Actions */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {/* Admin Quick Actions */}
              {role === 'admin' && (
                <>
                  <QuickActionCard
                    title="Alumni Directory"
                    description="Browse all registered alumni"
                    to="/alumni"
                    color="blue"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    }
                  />
                  <QuickActionCard
                    title="Student Directory"
                    description="Manage current students"
                    to="/students"
                    color="green"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    }
                  />
                  <QuickActionCard
                    title="Manage Events"
                    description="View and organize events"
                    to="/events"
                    color="purple"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                  {/* Collaboration Hub temporarily disabled
                  <QuickActionCard
                    title="Collaboration Hub"
                    description="Manage collaboration tools"
                    to="/collaboration-hub"
                    color="orange"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    }
                  />
                  */}
                </>
              )}

              {/* Student Quick Actions */}
              {role === 'student' && (
                <>
                  {/* Collaboration features temporarily disabled - will be rebuilt later
                  <QuickActionCard
                    title="Collaboration Hub"
                    description="Share notes and collaborate"
                    to="/collaboration-hub"
                    color="purple"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    }
                  />
                  <QuickActionCard
                    title="Upload Note"
                    description="Share your study materials"
                    to="/collaboration-hub/upload"
                    color="green"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    }
                  />
                  */}
                  <QuickActionCard
                    title="Alumni Directory"
                    description="Connect with alumni"
                    to="/alumni"
                    color="blue"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    }
                  />
                  <QuickActionCard
                    title="Events"
                    description="View upcoming events"
                    to="/events"
                    color="orange"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                </>
              )}

              {/* Alumni Quick Actions */}
              {role === 'alumni' && (
                <>
                  <QuickActionCard
                    title="Alumni Directory"
                    description="Connect with fellow alumni"
                    to="/alumni"
                    color="blue"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    }
                  />
                  <QuickActionCard
                    title="Students Directory"
                    description="Mentor current students"
                    to="/students"
                    color="green"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    }
                  />
                  <QuickActionCard
                    title="Events"
                    description="Attend and organize events"
                    to="/events"
                    color="purple"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                  <QuickActionCard
                    title="Resources"
                    description="Access shared resources"
                    to="/collaboration-hub"
                    color="orange"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    }
                  />
                </>
              )}

              {role === 'admin' && (
                <QuickActionCard
                  title="Create Event"
                  description="Schedule a new event"
                  to="/events/new"
                  color="orange"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* Recent Alumni & Upcoming Events */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Recent Alumni */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Alumni</h2>
              <Link to="/alumni" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {recentAlumni.length > 0 ? (
                recentAlumni.map((alumni) => (
                  <div key={alumni.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {(alumni.name || 'A').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{alumni.name || 'Anonymous'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{alumni.email || 'No email'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatShort(alumni.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">No alumni registered yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Collaboration Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Collaboration Activity</h2>
              <Link to="/collaboration-hub" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {stats.vaultsCount > 0 || stats.notesCount > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Active Vaults</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {stats.vaultsCount} vault{stats.vaultsCount !== 1 ? 's' : ''} created
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                      {stats.vaultsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Shared Notes</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {stats.notesCount} note{stats.notesCount !== 1 ? 's' : ''} uploaded
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {stats.notesCount}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Start Collaborating!</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create a vault or upload notes to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



