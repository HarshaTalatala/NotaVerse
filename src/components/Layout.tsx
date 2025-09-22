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
    { 
      href: '/collaboration', 
      label: 'Collaboration Hub',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>,
      isActive: location.pathname.startsWith('/collaboration')
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
  ];

  // No admin-only links needed anymore since pending registrations is removed

  return (
    <div className={`min-h-screen flex flex-col ${location.pathname.includes('/teams/') ? '' : 'gradient-bg'}`}>
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
        <div className={`w-full ${location.pathname.includes('/collaboration') || location.pathname.includes('/teams/') ? '' : 'px-2 sm:px-3 lg:px-4 xl:px-6 2xl:px-8 py-4'}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}



