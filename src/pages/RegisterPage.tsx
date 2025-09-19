import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';

export default function RegisterPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar
        variant="landing"
        theme={theme}
        onToggleTheme={toggleTheme}
        showAuthButtons={false}
        hideNavigation
      />
      <div className="flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">Registration Unavailable</h1>
            <p className="text-neutral-600 dark:text-neutral-400">New registrations are currently disabled</p>
          </div>

          {/* Notice */}
          <div className="card-elevated p-8 animate-fade-in-up">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                Registration Currently Disabled
              </h2>
              
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                New user registrations are temporarily unavailable. If you need access to the platform, 
                please contact the administrator directly.
              </p>

              <div className="space-y-4">
                <Link 
                  to="/login" 
                  className="block w-full btn btn-primary text-base py-3"
                >
                  Go to Sign In
                </Link>
                
                <Link 
                  to="/" 
                  className="block w-full btn btn-secondary text-base py-3"
                >
                  Return to Home
                </Link>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                For assistance, please contact the system administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



