import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'admin' | 'alumni' | 'student';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: Role[]; // optional list; if omitted any authenticated user allowed
  fallback?: ReactNode;   // custom forbidden element
}

export function ProtectedRoute({ children, requiredRoles, fallback }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  
  // Add debugging for teams page access
  console.log('🔍 ProtectedRoute CHECK:', {
    pathname: location.pathname,
    user: user ? { uid: user.uid, email: user.email } : null,
    role,
    loading,
    requiredRoles,
    timestamp: new Date().toISOString()
  });
  
  if (loading) {
    console.log('🔍 ProtectedRoute: Still loading, showing auth loading');
    return <AuthLoading />;
  }
  
  if (!user) {
    console.log('🔍 ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (requiredRoles && requiredRoles.length && (!role || !requiredRoles.includes(role))) {
    console.log('🔍 ProtectedRoute: Role check failed, showing forbidden');
    return (
      fallback || <ForbiddenPage required={requiredRoles} current={role} />
    );
  }
  
  console.log('🔍 ProtectedRoute: Access granted, rendering children');
  return <>{children}</>;
}

function AuthLoading() {
  // A simple component that could later implement a timeout fallback
  return (
    <div className="flex flex-col items-center justify-center min-h-60 py-12 text-center text-gray-600 dark:text-gray-300 gap-4">
      <div className="w-10 h-10 border-3 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
      <p className="text-sm font-medium tracking-wide">Authenticating your session...</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">If this takes more than a few seconds, refresh or log in again.</p>
    </div>
  );
}

export function ForbiddenPage({ required, current }: { required: Role[]; current: Role | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Access Restricted</h1>
      <p className="text-gray-600 dark:text-gray-400 max-w-md">
        Your account role {current ? <strong>{current}</strong> : '—'} does not grant access to this area. Required role{required.length>1?'s':''}: {required.join(', ')}.
      </p>
      <div className="flex gap-3">
        <a href="/dashboard" className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm font-medium">Go to Dashboard</a>
        <a href="/" className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 dark:text-gray-100 text-gray-800 hover:bg-gray-300 text-sm font-medium">Home</a>
      </div>
    </div>
  );
}



