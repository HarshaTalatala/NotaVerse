import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, addDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, useMockFirebase } from '../services/firebase';


// Helper to assert firebase instances exist (in case env missing in dev)
function requireAuth() {
  if (!auth) throw new Error('Firebase auth not initialized');
  return auth;
}
function requireDb() {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

type Role = 'admin' | 'alumni' | 'student'; // Keep admin for internal use, but not exposed in registration

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, userData: { name: string; role: Role; roleData?: any }) => Promise<void>;
  submitRegistration: (email: string, password: string, userData: { name: string; role: Role; roleData?: any }) => Promise<void>;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Handle redirect result from Google sign-in
    const handleRedirectResult = async () => {
      // Skip Firebase calls in mock mode
      if (useMockFirebase) {
        console.log('🔧 [auth] Skipping redirect result check in mock mode');
        return;
      }
      
      try {
        const a = requireAuth();
        const result = await getRedirectResult(a);
        if (result) {
          console.log('✅ Google sign-in redirect successful:', result.user.email);
          
          // Check if user exists and is approved
          const d = requireDb();
          const userRef = doc(d, 'users', result.user.uid);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            // Check if it's an admin email
            const adminEmails = ['harsha.talatala@gmail.com'];
            if (adminEmails.includes(result.user.email || '')) {
              // Create admin user document automatically
              const adminUserData = {
                email: result.user.email,
                displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Admin',
                role: 'admin' as Role,
                isApproved: true,
                createdAt: new Date(),
                approvedAt: new Date(),
                approvedBy: 'system'
              };

              try {
                await setDoc(userRef, adminUserData);
                console.log('✅ Admin user document created automatically from redirect');
              } catch (error) {
                console.error('❌ Failed to create admin user document from redirect:', error);
                setAuthError('Failed to initialize admin account. Please contact support.');
              }
            } else {
              // User authenticated but no user document and not admin - sign them out
              await signOut(a);
              setAuthError('Account not found. Please register and wait for admin approval.');
            }
          } else {
            const userData = snap.data();
            // Check if user is approved
            if (userData.isApproved === false) {
              // User exists but not approved - sign them out
              await signOut(a);
              setAuthError('Your account is pending approval. Please contact an administrator.');
            }
          }
          // The onAuthStateChanged will handle the final user setup
        }
      } catch (error: any) {
        console.error('❌ Google sign-in redirect error:', error);
        if (error.code !== 'auth/redirect-cancelled-by-user') {
          setAuthError('Google sign-in failed. Please try again.');
        }
      }
    };

    handleRedirectResult();
  }, []);

  useEffect(() => {
    // Failsafe: if auth doesn't resolve in 8s, surface a message
    timeoutRef.current = window.setTimeout(() => {
      if (loading) {
        setAuthError('Authentication is taking longer than expected. You may need to refresh or log in again.');
        setLoading(false); // Allow UI to continue with no user
      }
    }, 8000);

  // Skip Firebase auth state changes in mock mode
  if (useMockFirebase) {
    console.log('🔧 [auth] Mock mode: setting loading to false, no user');
    setLoading(false);
    setUser(null);
    setRole(null);
    return () => {}; // Return empty cleanup function
  }

  const a = requireAuth();
  const d = requireDb();
  const unsub = onAuthStateChanged(a, async (u) => {
      try {
        if (u) {
          const userRef = doc(d, 'users', u.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const userData = snap.data();
            // Check if user is approved
            if (userData.isApproved === false) {
              // User exists but not approved - sign them out
              const a = requireAuth();
              await signOut(a);
              setAuthError('Your account is pending approval. Please contact an administrator.');
              setUser(null);
              setRole(null);
            } else {
              setUser(u);
              setRole((userData.role as Role) || null);
            }
          } else {
            // User authenticated but no user document - check if it's an admin email
            const adminEmails = ['harsha.talatala@gmail.com']; // Add admin emails here
            if (adminEmails.includes(u.email || '')) {
              // Create admin user document automatically
              const adminUserData = {
                email: u.email,
                displayName: u.displayName || u.email?.split('@')[0] || 'Admin',
                role: 'admin' as Role,
                isApproved: true,
                createdAt: new Date(),
                approvedAt: new Date(),
                approvedBy: 'system'
              };

              try {
                await setDoc(userRef, adminUserData);
                console.log('✅ Admin user document created automatically');
                setUser(u);
                setRole('admin');
              } catch (error) {
                console.error('❌ Failed to create admin user document:', error);
                setAuthError('Failed to initialize admin account. Please contact support.');
                setUser(null);
                setRole(null);
              }
            } else {
              // User authenticated but no user document and not admin - sign them out
              const a = requireAuth();
              await signOut(a);
              setAuthError('Account not found. Please register and wait for admin approval.');
              setUser(null);
              setRole(null);
            }
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (e: any) {
        setAuthError(e.message || 'Failed to complete authentication.');
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    });
    return () => {
      unsub();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
  const d = requireDb();
  const unsub = onSnapshot(doc(d, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setRole((snap.data().role as Role) || null);
      }
    });
    return () => unsub();
  }, [user]);

  const signInEmail = async (email: string, password: string) => {
    if (useMockFirebase) {
      console.log('🔧 [auth] Mock mode: signInEmail disabled');
      setAuthError('Authentication is disabled in development mode.');
      return;
    }
    const a = requireAuth();
    await signInWithEmailAndPassword(a, email, password);
  };

  const signUpEmail = async (email: string, password: string, userData: { name: string; role: Role; roleData?: any }) => {
    if (useMockFirebase) {
      console.log('🔧 [auth] Mock mode: signUpEmail disabled');
      setAuthError('Registration is disabled in development mode.');
      return;
    }
    
    const a = requireAuth();
    const d = requireDb();
    
    try {
      // Check if there's an approved registration for this email
      const approvedRegistrationQuery = query(
        collection(d, 'pendingRegistrations'), 
        where('email', '==', email),
        where('status', '==', 'approved')
      );
      const approvedRegistrationSnapshot = await getDocs(approvedRegistrationQuery);
      
      let isPreApproved = false;
      let approvedRegistrationData = null;
      
      if (!approvedRegistrationSnapshot.empty) {
        // Found an approved registration
        isPreApproved = true;
        approvedRegistrationData = approvedRegistrationSnapshot.docs[0].data();
        
        // Verify the role matches
        if (approvedRegistrationData.role !== userData.role) {
          throw new Error(`Role mismatch. Your approved registration is for ${approvedRegistrationData.role}, but you're trying to register as ${userData.role}.`);
        }
        
        console.log('✅ Found approved registration for:', email);
      }
      
      // Create the user account
      const userCredential = await createUserWithEmailAndPassword(a, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      const userDocData = {
        email: user.email,
        displayName: userData.name,
        role: userData.role,
        isApproved: isPreApproved, // Approved if there was a pre-approved registration
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(isPreApproved && {
          approvedAt: new Date(),
          approvedBy: approvedRegistrationData?.reviewedBy || 'admin',
          preApproved: true
        })
      };
      
      await setDoc(doc(d, 'users', user.uid), userDocData);
      
      // Use data from approved registration if available, otherwise use provided data
      const roleData = (isPreApproved && approvedRegistrationData) ? approvedRegistrationData.roleData : userData.roleData;
      
      // Check for existing profile documents (created during admin approval) and migrate them
      const tempId = user.email?.replace(/[.@]/g, '_');
      
      // Create role-specific profile
      if (userData.role === 'student' && roleData) {
        let studentData: any = {
          name: userData.name,
          email: user.email,
          userId: user.uid,
          createdAt: new Date(),
          status: 'active'
        };
        
        // Check if there's an existing student document with tempId
        if (tempId) {
          try {
            const existingStudentDoc = await getDoc(doc(d, 'students', tempId));
            if (existingStudentDoc.exists()) {
              // Use existing data from admin approval
              const existingData = existingStudentDoc.data();
              studentData = {
                ...existingData,
                userId: user.uid,
                activatedAt: new Date(),
                tempId: undefined // Remove temp ID
              };
              // Delete the temporary document
              await deleteDoc(doc(d, 'students', tempId));
              console.log('✅ Migrated existing student profile for:', user.email);
            }
          } catch (error) {
            console.log('No existing student profile to migrate for:', user.email);
          }
        }
        
        // If no existing data, use roleData from registration
        if (!studentData.studentId && roleData) {
          if (roleData.studentId) studentData.studentId = roleData.studentId;
          if (roleData.year) studentData.year = parseInt(roleData.year);
          if (roleData.major) studentData.major = roleData.major;
          if (roleData.gpa) studentData.gpa = parseFloat(roleData.gpa);
          if (roleData.phone) studentData.phone = roleData.phone;
          if (roleData.address) studentData.address = roleData.address;
          if (roleData.emergencyContact) studentData.emergencyContact = roleData.emergencyContact;
          if (roleData.expectedGraduation) studentData.expectedGraduation = parseInt(roleData.expectedGraduation);
          if (roleData.clubs) {
            studentData.clubs = typeof roleData.clubs === 'string' 
              ? roleData.clubs.split(',').map((c: string) => c.trim()).filter(Boolean)
              : roleData.clubs;
          }
        }
        
        await setDoc(doc(d, 'students', user.uid), studentData);
      } else if (userData.role === 'alumni' && roleData) {
        let alumniData: any = {
          name: userData.name,
          email: user.email,
          userId: user.uid,
          createdAt: new Date()
        };
        
        // Check if there's an existing alumni document with tempId
        if (tempId) {
          try {
            const existingAlumniDoc = await getDoc(doc(d, 'alumni', tempId));
            if (existingAlumniDoc.exists()) {
              // Use existing data from admin approval
              const existingData = existingAlumniDoc.data();
              alumniData = {
                ...existingData,
                userId: user.uid,
                activatedAt: new Date(),
                tempId: undefined // Remove temp ID
              };
              // Delete the temporary document
              await deleteDoc(doc(d, 'alumni', tempId));
              console.log('✅ Migrated existing alumni profile for:', user.email);
            }
          } catch (error) {
            console.log('No existing alumni profile to migrate for:', user.email);
          }
        }
        
        // If no existing data, use roleData from registration
        if (!alumniData.graduationYear && roleData) {
          if (roleData.graduationYear) alumniData.graduationYear = parseInt(roleData.graduationYear);
          if (roleData.company) alumniData.company = roleData.company;
          if (roleData.title) alumniData.title = roleData.title;
          if (roleData.location) alumniData.location = roleData.location;
          if (roleData.linkedIn) alumniData.linkedIn = roleData.linkedIn;
          if (roleData.bio) alumniData.bio = roleData.bio;
          if (roleData.industry) alumniData.industry = roleData.industry;
          if (roleData.experience) alumniData.experience = parseInt(roleData.experience);
          if (roleData.skills) {
            alumniData.skills = typeof roleData.skills === 'string'
              ? roleData.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
              : roleData.skills;
          }
        }
        
        await setDoc(doc(d, 'alumni', user.uid), alumniData);
      }
      
      // If this was a pre-approved registration, mark it as completed
      if (isPreApproved) {
        await updateDoc(doc(d, 'pendingRegistrations', approvedRegistrationSnapshot.docs[0].id), {
          status: 'completed',
          completedAt: new Date(),
          userCreatedAt: new Date(),
          userId: user.uid
        });
      }
      
      console.log('✅ User registration successful:', user.email, isPreApproved ? '(pre-approved)' : '(pending approval)');
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  };

  const submitRegistration = async (email: string, password: string, userData: { name: string; role: Role; roleData?: any }) => {
    if (useMockFirebase) {
      console.log('🔧 [auth] Mock mode: submitRegistration disabled');
      setAuthError('Registration is disabled in development mode.');
      return;
    }
    
    const d = requireDb();
    
    try {
      // Save pending registration
      const registrationData = {
        name: userData.name,
        email: email,
        password: password, // In production, this should be hashed
        role: userData.role,
        roleData: userData.roleData || {},
        status: 'pending',
        submittedAt: new Date()
      };
      
      await addDoc(collection(d, 'pendingRegistrations'), registrationData);
      
      console.log('✅ Registration submitted for approval:', email);
    } catch (error: any) {
      console.error('❌ Registration submission failed:', error);
      throw error;
    }
  };

  const signInGoogle = async () => {
    if (useMockFirebase) {
      console.log('🔧 [auth] Mock mode: Google sign-in disabled');
      setAuthError('Google sign-in is disabled in development mode.');
      return;
    }
    
    const a = requireAuth();
    const provider = new GoogleAuthProvider();
    
    // Add custom parameters to improve user experience
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    console.log('🔄 Starting Google sign-in...');
    setAuthError(null); // Clear any previous errors

    try {
      // Use popup method as primary (it actually works despite COOP warnings)
      console.log('🔄 Attempting popup sign-in...');
      const res = await signInWithPopup(a, provider);
      console.log('✅ Popup sign-in successful:', res.user.email);

      // Check if user exists and is approved
      const d = requireDb();
      const userRef = doc(d, 'users', res.user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        // Check if it's an admin email
        const adminEmails = ['harsha.talatala@gmail.com'];
        if (adminEmails.includes(res.user.email || '')) {
          // Create admin user document automatically
          const adminUserData = {
            email: res.user.email,
            displayName: res.user.displayName || res.user.email?.split('@')[0] || 'Admin',
            role: 'admin' as Role,
            isApproved: true,
            createdAt: new Date(),
            approvedAt: new Date(),
            approvedBy: 'system'
          };

          try {
            await setDoc(userRef, adminUserData);
            console.log('✅ Admin user document created automatically');
            setUser(res.user);
            setRole('admin');
            setAuthError(null);
          } catch (error) {
            console.error('❌ Failed to create admin user document:', error);
            setAuthError('Failed to initialize admin account. Please contact support.');
            setUser(null);
            setRole(null);
          }
        } else {
          // User authenticated but no user document and not admin - sign them out
          await signOut(a);
          setAuthError('Account not found. Please register and wait for admin approval.');
          setUser(null);
          setRole(null);
        }
      } else {
        const userData = snap.data();
        // Check if user is approved
        if (userData.isApproved === false) {
          // User exists but not approved - sign them out
          await signOut(a);
          setAuthError('Your account is pending approval. Please contact an administrator.');
          setUser(null);
          setRole(null);
        } else {
          setUser(res.user);
          setRole((userData.role as Role) || null);
          setAuthError(null);
        }
      }
    } catch (popupError: any) {
      // Handle specific popup errors gracefully
      if (popupError.code === 'auth/popup-closed-by-user') {
        console.log('🔄 User closed popup, no error shown');
        return; // Don't show error for user-cancelled popup
      }
      
      if (popupError.code === 'auth/popup-blocked') {
        setAuthError('Popup was blocked. Please allow popups for this site and try again.');
        return;
      }

      // For other errors, try redirect method as fallback
      console.warn('❌ Popup failed, trying redirect method:', popupError.message);

      try {
        console.log('� Attempting redirect sign-in as fallback...');
        await signInWithRedirect(a, provider);
        // Note: This will redirect the page, so execution stops here
      } catch (redirectError: any) {
        console.error('❌ Both popup and redirect failed:', redirectError);
        setAuthError('Google sign-in failed. Please try again or contact support.');
      }
    }
  };

  const logout = async () => {
    if (useMockFirebase) {
      console.log('🔧 [auth] Mock mode: logout (clearing local state only)');
      setUser(null);
      setRole(null);
      setAuthError(null);
      return;
    }
    
    const a = requireAuth();
    await signOut(a);
    setUser(null);
    setRole(null);
    setAuthError(null);
  };

  // Removed insecure dev mode admin login bypass

  const value = useMemo(() => ({ 
    user, 
    role, 
    loading, 
    signInEmail, 
    signUpEmail,
    submitRegistration,
    signInGoogle, 
    logout, 
    authError
  }), [user, role, loading, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}



