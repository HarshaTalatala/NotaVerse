import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Navbar from '@/components/Navbar';

export default function LoginPage() {
  const { signInEmail, signInGoogle, authError, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLockRef = useRef<boolean>(false);
  const hasSubmittedRef = useRef<boolean>(false); // Permanent lock
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/dashboard';

  // Check for success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    console.log('🎯 handleSubmit called - hasSubmitted:', hasSubmittedRef.current, 'loading:', loading, 'isSubmitting:', isSubmitting);
    
    // Permanent submission check - once submitted, never allow again
    if (hasSubmittedRef.current) {
      console.log('🚫 PERMANENT BLOCK: Form has already been submitted successfully');
      return;
    }
    
    // Component-level submission lock using ref (persists across re-renders)
    if (submissionLockRef.current) {
      console.log('🔒 Submission blocked by component lock');
      return;
    }
    
    // Prevent double submission with multiple checks
    if (loading || isSubmitting) {
      console.log('🔄 Form submission blocked - already processing');
      return;
    }
    
    // Set ALL locks immediately
    hasSubmittedRef.current = true; // Permanent lock
    submissionLockRef.current = true;
    setLoading(true);
    setIsSubmitting(true);
    setError(null);
    
    // Add a micro-delay to handle rapid double clicks/submissions
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      console.log('🚀 LoginPage: Starting sign-in process for:', email);
      await signInEmail(email, password);
      console.log('✅ LoginPage: Sign-in completed successfully, navigating...');
      
      // Add a small delay to ensure auth state is settled
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 100);
      
    } catch (err: any) {
      console.error('Sign-in error:', err);
      
      // Provide user-friendly error messages
      let errorMessage = err.message;
      
      if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please check your email or register for a new account.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later or reset your password.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (!errorMessage || errorMessage.includes('Firebase:')) {
        // Fallback for generic Firebase errors
        errorMessage = 'Sign-in failed. Please check your credentials and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
      // Only release temporary lock on error, keep permanent lock on success
      if (error) {
        hasSubmittedRef.current = false; // Allow retry on error
      }
      submissionLockRef.current = false;
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInGoogle();
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      
      // The Google sign-in method in AuthContext already provides user-friendly messages
      let errorMessage = err.message;
      
      if (!errorMessage || errorMessage.includes('Firebase:')) {
        errorMessage = 'Google sign-in failed. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">Welcome Back</h1>
            <p className="text-neutral-600 dark:text-neutral-400">Sign in to your account to continue</p>
          </div>

        {/* Login Form */}
        <div className="card-elevated p-8 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="input-primary"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="input-primary"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>

            {(successMessage) && (
              <div className="rounded-xl bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-green-600 dark:text-green-400">{successMessage}</span>
                </div>
              </div>
            )}

            {(error || authError) && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-600 dark:text-red-400">{error || authError}</span>
                </div>
              </div>
            )}

            {/* Help message for users with approved registrations */}
            {(error || authError) && (error || authError)?.includes('approved') && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 p-4 mt-2">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    <p className="font-medium mb-1">Account Activation</p>
                    <p>Your registration has been approved! Sign in with your original registration credentials (email and password) to activate your account.</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isSubmitting || hasSubmittedRef.current}
              className="w-full btn btn-primary text-base py-3"
              onClick={(e) => {
                // Additional protection against double clicks
                if (loading || isSubmitting || hasSubmittedRef.current) {
                  e.preventDefault();
                  console.log('🔄 Button click blocked - form already submitted or processing');
                  return;
                }
              }}
            >
              {(loading || isSubmitting) ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300 dark:border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full mt-4 btn btn-outline flex items-center justify-center gap-3"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Don't have an account?{' '}
              <Link to="/register" className="link font-medium">
                Sign up for free
              </Link>
            </p>
          </div>

          </div>
        </div>
      </div>
    </div>
  );
}



