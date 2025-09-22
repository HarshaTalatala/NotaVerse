import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, addDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, useMockFirebase } from '../services/firebase';

// Global singleton to prevent double sign-ins caused by React.StrictMode
class SignInManager {
  private static instance: SignInManager;
  private activeSignIns: Map<string, Promise<any>> = new Map();
  private lastAttempts: Map<string, number> = new Map();
  private globalLock: boolean = false;
  
  static getInstance(): SignInManager {
    if (!SignInManager.instance) {
      SignInManager.instance = new SignInManager();
    }
    return SignInManager.instance;
  }
  
  async executeSignIn(email: string, signInFunction: () => Promise<any>): Promise<any> {
    const now = Date.now();
    const cacheKey = `signin_${email}`;
    
    // Global lock check - prevents ANY sign-in if one is in progress
    if (this.globalLock) {
      console.log('🔒 SignInManager: Global lock active, blocking all sign-in attempts');
      throw new Error('Another sign-in is in progress. Please wait.');
    }
    
    // Check for recent attempt (within 10 seconds - more aggressive)
    const lastAttempt = this.lastAttempts.get(email);
    if (lastAttempt && (now - lastAttempt) < 10000) {
      console.log('🔄 SignInManager: Blocking duplicate sign-in attempt for', email, 'within', (now - lastAttempt), 'ms');
      throw new Error('Sign-in attempt too recent. Please wait a moment.');
    }
    
    // Check for active sign-in promise
    const activePromise = this.activeSignIns.get(cacheKey);
    if (activePromise) {
      console.log('🔄 SignInManager: Reusing active sign-in promise for', email);
      return activePromise;
    }
    
    console.log('🚀 SignInManager: Starting new sign-in for', email);
    this.globalLock = true; // Set global lock
    this.lastAttempts.set(email, now);
    
    // Create and cache the promise
    const signInPromise = signInFunction()
      .finally(() => {
        // Clean up after completion (success or failure)
        this.globalLock = false; // Release global lock
        this.activeSignIns.delete(cacheKey);
        // Keep the timestamp longer to prevent rapid re-submissions
        setTimeout(() => {
          this.lastAttempts.delete(email);
        }, 5000); // 5 seconds instead of 2
      });
    
    this.activeSignIns.set(cacheKey, signInPromise);
    return signInPromise;
  }
}

const signInManager = SignInManager.getInstance();


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
  const [signingIn, setSigningIn] = useState(false);
  const signInAttemptRef = useRef<{ email: string; timestamp: number } | null>(null);

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
        console.log('🔍 onAuthStateChanged triggered:', {
          user: u ? { uid: u.uid, email: u.email } : null,
          timestamp: new Date().toISOString()
        });
        
        if (u) {
          console.log('🔍 onAuthStateChanged: User authenticated:', u.email, 'UID:', u.uid);
          const userRef = doc(d, 'users', u.uid);
          console.log('🔍 Checking for user document at path: users/' + u.uid);
          
          try {
            const snap = await getDoc(userRef);
            console.log('🔍 User document exists:', snap.exists());
            
            if (snap.exists()) {
              const userData = snap.data();
              console.log('🔍 User document data:', { 
                email: userData.email, 
                role: userData.role, 
                isApproved: userData.isApproved,
                createdAt: userData.createdAt,
                displayName: userData.displayName
              });
              
              // Check if user is approved
              if (userData.isApproved === false) {
                console.log('❌ User not approved, showing warning but NOT signing out. User data:', { 
                  email: userData.email, 
                  isApproved: userData.isApproved,
                  role: userData.role 
                });
                // TEMPORARY: Don't sign out, just show warning
                setAuthError('Your account is pending approval. Some features may be limited.');
                setUser(u);
                setRole((userData.role as Role) || null);
                // User exists but not approved - sign them out
                // const a = requireAuth();
                // await signOut(a);
                // setAuthError('Your account is pending approval. Please contact an administrator.');
                // setUser(null);
                // setRole(null);
              } else {
                console.log('✅ User approved, setting user state');
                setUser(u);
                setRole((userData.role as Role) || null);
                // Clear any previous auth errors on successful login
                setAuthError(null);
                console.log('🔍 AUTH STATE SET:', {
                  userSet: true,
                  role: userData.role,
                  timestamp: new Date().toISOString()
                });
              }
            } else {
              console.log('❌ No user document found for UID:', u.uid);
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
                // Check if there's an approved registration for this email that we can use to create the user document
                console.log('🔍 Checking for approved registration to create missing user document for:', u.email);
                try {
                  const pendingQuery = query(
                    collection(d, 'pendingRegistrations'),
                    where('email', '==', u.email || ''),
                    where('status', '==', 'approved')
                  );
                  const pendingSnapshot = await getDocs(pendingQuery);
                  
                  if (!pendingSnapshot.empty) {
                    // Found approved registration, create the user document
                    const approvedData = pendingSnapshot.docs[0].data();
                    console.log('🔍 Found approved registration, creating user document for:', u.email);
                    
                    const userDocData = {
                      email: u.email,
                      displayName: approvedData.name,
                      role: approvedData.role,
                      isApproved: true,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      approvedAt: new Date(),
                      approvedBy: approvedData.reviewedBy || 'admin',
                      preApproved: true,
                      accountRecovered: true // Mark this as a recovered account
                    };
                    
                    await setDoc(userRef, userDocData);
                    console.log('✅ User document created from approved registration');
                    
                    // Migrate existing profile document from tempId to user UID
                    const tempId = u.email?.replace(/[.@]/g, '_');
                    
                    if (approvedData.role === 'student' && tempId) {
                      try {
                        const tempStudentDoc = await getDoc(doc(d, 'students', tempId));
                        if (tempStudentDoc.exists()) {
                          const tempData = tempStudentDoc.data();
                          const updatedData = {
                            ...tempData,
                            userId: u.uid,
                            activatedAt: new Date(),
                            tempId: undefined // Remove temp ID
                          };
                          await setDoc(doc(d, 'students', u.uid), updatedData);
                          await deleteDoc(doc(d, 'students', tempId));
                          console.log('✅ Migrated student profile from tempId to UID');
                        }
                      } catch (migrationError) {
                        console.warn('⚠️ Failed to migrate student profile:', migrationError);
                      }
                    } else if (approvedData.role === 'alumni' && tempId) {
                      try {
                        const tempAlumniDoc = await getDoc(doc(d, 'alumni', tempId));
                        if (tempAlumniDoc.exists()) {
                          const tempData = tempAlumniDoc.data();
                          const updatedData = {
                            ...tempData,
                            userId: u.uid,
                            activatedAt: new Date(),
                            tempId: undefined // Remove temp ID
                          };
                          await setDoc(doc(d, 'alumni', u.uid), updatedData);
                          await deleteDoc(doc(d, 'alumni', tempId));
                          console.log('✅ Migrated alumni profile from tempId to UID');
                        }
                      } catch (migrationError) {
                        console.warn('⚠️ Failed to migrate alumni profile:', migrationError);
                      }
                    }
                    
                    // Mark registration as completed
                    await updateDoc(doc(d, 'pendingRegistrations', pendingSnapshot.docs[0].id), {
                      status: 'completed',
                      completedAt: new Date(),
                      userCreatedAt: new Date(),
                      userId: u.uid,
                      accountRecovered: true
                    });
                    
                    setUser(u);
                    setRole((approvedData.role as Role) || null);
                    console.log('✅ User authenticated with recovered account:', u.email);
                    return; // Exit here, don't sign out
                  }
                } catch (recoveryError: any) {
                  console.error('❌ Error during account recovery check:', recoveryError);
                  // If network error, allow the user to proceed
                  if (recoveryError.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
                      recoveryError.message?.includes('blocked') ||
                      recoveryError.code === 'unavailable') {
                    console.log('⚠️ Network blocking detected during recovery, allowing user to proceed');
                    setAuthError('Network connectivity issues detected. Some features may be limited.');
                    setUser(u);
                    setRole(null);
                    return;
                  }
                }
                
                console.log('❌ Not an admin email and no approved registration found, showing warning but NOT signing out');
                console.log('❌ WOULD FORCE LOGOUT - User email:', u.email, 'Admin emails:', adminEmails);
                // TEMPORARY: Don't sign out, just show warning
                setAuthError('Account setup may be incomplete. Some features may be limited.');
                setUser(u);
                setRole(null);
                // User authenticated but no user document and not admin - sign them out
                // const a = requireAuth();
                // await signOut(a);
                // setAuthError('Account setup incomplete. Please contact an administrator.');
                // setUser(null);
                // setRole(null);
              }
            }
          } catch (docError: any) {
            console.error('❌ Error checking user document:', docError);
            console.error('❌ Error details:', { 
              code: docError.code, 
              message: docError.message,
              userEmail: u.email,
              userUID: u.uid 
            });
            
            // Handle specific error cases
            if (docError.code === 'permission-denied') {
              console.log('❌ Permission denied when checking user document');
              setAuthError('Unable to verify account status. Please try again.');
              setUser(null);
              setRole(null);
            } else if (docError.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
                       docError.message?.includes('blocked') ||
                       docError.code === 'unavailable') {
              console.log('⚠️ Network blocking detected, allowing user to proceed with basic authentication');
              // In case of network blocking, allow the user to stay signed in
              // but show a warning message
              setAuthError('Network connectivity issues detected. Some features may be limited. Please try refreshing the page or disabling ad blockers.');
              setUser(u);
              setRole(null); // We can't verify role, so set to null
            } else {
              console.log('❌ Unknown error checking user document');
              setAuthError('Failed to verify account. Please try again.');
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

  // Disable the onSnapshot listener that's causing permission errors
  // The role is already set correctly during initial authentication
  // useEffect(() => {
  //   if (!user) return;
  // const d = requireDb();
  // const unsub = onSnapshot(
  //   doc(d, 'users', user.uid), 
  //   (snap) => {
  //     if (snap.exists()) {
  //       setRole((snap.data().role as Role) || null);
  //     }
  //   },
  //   (error) => {
  //     console.warn('⚠️ Error in user document listener:', error);
  //     // Don't set authError here as it would interfere with successful login
  //     // The role is already set during initial authentication
  //     if (error.code === 'permission-denied') {
  //       console.log('⚠️ Permission denied for user document listener, but user is already authenticated');
  //     }
  //   }
  // );
  //   return () => unsub();
  // }, [user]);

  // Clear network-related errors after successful authentication
  useEffect(() => {
    if (user && authError && (authError.includes('Network connectivity') || authError.includes('ERR_BLOCKED_BY_CLIENT'))) {
      console.log('🔧 Clearing network error after successful authentication');
      const timer = setTimeout(() => setAuthError(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, authError]);

  const signInEmail = async (email: string, password: string) => {
    if (useMockFirebase) {
      console.log('🔧 [auth] Mock mode: signInEmail disabled');
      setAuthError('Authentication is disabled in development mode.');
      return;
    }
    
    return signInManager.executeSignIn(email, async () => {
      const a = requireAuth();
      const d = requireDb();
      
      setSigningIn(true);
      setAuthError(null);
      
      try {
        console.log('🔍 Attempting Firebase sign-in for:', email);
        await signInWithEmailAndPassword(a, email, password);
        console.log('✅ Firebase sign-in successful for:', email);
      } catch (error: any) {
      console.log('🔍 Sign-in failed:', { email, errorCode: error.code, message: error.message });
      
      // Check if this might be a pending registration
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        try {
          // Check if there's a pending registration for this email
          console.log('🔍 Checking registration status for:', email);
          const pendingQuery = query(
            collection(d, 'pendingRegistrations'),
            where('email', '==', email)
          );
          const pendingSnapshot = await getDocs(pendingQuery);
          
          if (!pendingSnapshot.empty) {
            const allRegistrations = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const pendingRegistrations = allRegistrations.filter((reg: any) => reg.status === 'pending');
            const approvedRegistrations = allRegistrations.filter((reg: any) => reg.status === 'approved');
            const rejectedRegistrations = allRegistrations.filter((reg: any) => reg.status === 'rejected');
            
            console.log('🔍 Registration status:', {
              pending: pendingRegistrations.length,
              approved: approvedRegistrations.length,
              rejected: rejectedRegistrations.length,
              completed: allRegistrations.filter((reg: any) => reg.status === 'completed').length
            });
            
            if (pendingRegistrations.length > 0) {
              throw new Error('Your registration is pending admin approval. Please wait for approval before signing in.');
            }
            
            if (approvedRegistrations.length > 0) {
              // Found approved registration, create Firebase account now
              const pendingData: any = approvedRegistrations[0];
              console.log('✅ Found approved registration, creating Firebase account for:', email);
              
              // Verify the password matches the registration
              if (pendingData.password !== password) {
                console.log('❌ Password mismatch for approved registration');
                throw new Error('Invalid password. Please use the password you provided during registration.');
              }
              
              console.log('✅ Password verified, creating Firebase account...');
              
              // Create Firebase user account
              const userCredential = await createUserWithEmailAndPassword(a, email, password);
              const user = userCredential.user;
              
              console.log('✅ Firebase user created:', user.uid);
              
              // Create user document in Firestore
              const userDocData = {
                email: user.email,
                displayName: pendingData.name,
                role: pendingData.role,
                isApproved: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                approvedAt: new Date(),
                approvedBy: pendingData.reviewedBy || 'admin',
                preApproved: true
              };
              
              await setDoc(doc(d, 'users', user.uid), userDocData);
              console.log('✅ User document created in Firestore');
              
              // Migrate existing profile document from tempId to user UID
              const tempId = email.replace(/[.@]/g, '_');
              
              if (pendingData.role === 'student') {
                try {
                  const tempStudentDoc = await getDoc(doc(d, 'students', tempId));
                  if (tempStudentDoc.exists()) {
                    const tempData = tempStudentDoc.data();
                    const updatedData = {
                      ...tempData,
                      userId: user.uid,
                      activatedAt: new Date(),
                      tempId: undefined // Remove temp ID
                    };
                    await setDoc(doc(d, 'students', user.uid), updatedData);
                    await deleteDoc(doc(d, 'students', tempId));
                    console.log('✅ Migrated student profile from tempId to UID');
                  }
                } catch (migrationError) {
                  console.warn('⚠️ Failed to migrate student profile:', migrationError);
                }
              } else if (pendingData.role === 'alumni') {
                try {
                  const tempAlumniDoc = await getDoc(doc(d, 'alumni', tempId));
                  if (tempAlumniDoc.exists()) {
                    const tempData = tempAlumniDoc.data();
                    const updatedData = {
                      ...tempData,
                      userId: user.uid,
                      activatedAt: new Date(),
                      tempId: undefined // Remove temp ID
                    };
                    await setDoc(doc(d, 'alumni', user.uid), updatedData);
                    await deleteDoc(doc(d, 'alumni', tempId));
                    console.log('✅ Migrated alumni profile from tempId to UID');
                  }
                } catch (migrationError) {
                  console.warn('⚠️ Failed to migrate alumni profile:', migrationError);
                }
              }
              
              // Mark registration as completed
              await updateDoc(doc(d, 'pendingRegistrations', pendingData.id), {
                status: 'completed',
                completedAt: new Date(),
                userCreatedAt: new Date(),
                userId: user.uid
              });
              
              console.log('✅ Firebase account created successfully for approved registration:', email);
              
              // The onAuthStateChanged listener will handle setting user/role state automatically
              return; // Success - user authentication will be handled by onAuthStateChanged
            }
            
            if (rejectedRegistrations.length > 0) {
              throw new Error('Your registration was not approved. Please contact an administrator for more information.');
            }
          } else {
            console.log('🔍 No registration found for email:', email);
          }
        } catch (checkError: any) {
          console.error('🔍 Error checking registration status:', checkError);
          
          // If the check error has a more specific message, use it
          if (checkError.message.includes('pending') || checkError.message.includes('approved') || checkError.message.includes('rejected')) {
            throw checkError;
          }
          
          // Handle network blocking specifically
          if (checkError.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
              checkError.message?.includes('blocked') ||
              checkError.code === 'unavailable') {
            throw new Error('Network connectivity issues. Please disable ad blockers, try incognito mode, or use a different browser.');
          }
          
          if (checkError.code === 'permission-denied') {
            throw new Error('Unable to verify registration status. Please try again in a moment.');
          }
        }
        
        // If no registration found, it's genuinely invalid credentials
        throw new Error('Invalid email or password. Please check your credentials or register for an account.');
      }
      
      throw error; // Re-throw other errors as-is
      } finally {
        setSigningIn(false);
      }
    });
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



