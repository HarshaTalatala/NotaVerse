import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';
import Navbar from './Navbar';

export default function Layout() {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const navigationLinks = [
    { 
      href: '/dashboard', 
      label: 'Dashboard',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>,
      isActive: location.pathname === '/dashboard'
    },
    ...(role === 'admin' ? [{
      href: '/registrations', 
      label: 'Registrations',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>,
      isActive: location.pathname === '/registrations'
    }] : []),
    { 
      href: '/alumni', 
      label: 'Alumni',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>,
      isActive: location.pathname === '/alumni'
    },
    { 
      href: '/students', 
      label: 'Students',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>,
      isActive: location.pathname === '/students'
    },
    { 
      href: '/events', 
      label: 'Events',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>,
      isActive: location.pathname === '/events'
    }
    // Collaboration Hub temporarily disabled - will be rebuilt later
    // { 
    //   href: '/collaboration-hub', 
    //   label: 'Collaboration Hub',
    //   icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    //   </svg>,
    //   isActive: location.pathname.startsWith('/collaboration-hub')
    // }
  ];

  // No admin-only links needed anymore since pending registrations is removed

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <Navbar
        variant="authenticated"
        user={user}
        role={role || undefined}
        onLogout={logout}
        theme={theme}
        onToggleTheme={toggleTheme}
        navigationLinks={navigationLinks}
        showAuthButtons={false}
      />

      <main className="flex-1">
        <div className="w-full px-2 sm:px-3 lg:px-4 xl:px-6 2xl:px-8 py-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}



