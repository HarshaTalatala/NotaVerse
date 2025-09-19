import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Extract env (Vite inlines these at build-time)
const {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID,
  VITE_USE_MOCK_FIREBASE
} = import.meta.env;

const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

// Build a snapshot of the raw env entries we care about
const raw: Record<string, string | undefined> = {};
for (const k of REQUIRED_KEYS) {
  raw[k] = (import.meta.env as any)[k];
}

// Check if we're using placeholder/mock values
const isPlaceholderValue = (value: string | undefined): boolean => {
  if (!value) return true;
  return value.includes('placeholder') || value === 'your-' || value.startsWith('your-');
};

const useMockFirebase = VITE_USE_MOCK_FIREBASE === 'true' || 
  (VITE_USE_MOCK_FIREBASE === undefined && import.meta.env.DEV && (
    isPlaceholderValue(VITE_FIREBASE_API_KEY) ||
    isPlaceholderValue(VITE_FIREBASE_PROJECT_ID)
  ));

const missing: string[] = [];
if (!useMockFirebase) {
  for (const k of REQUIRED_KEYS) {
    // Only treat as missing if value is undefined (not just empty string)
    if (raw[k] === undefined) missing.push(k);
  }
}

// Helpful diagnostics (only once per module evaluation)
if (import.meta.env.DEV) {
  // Single consolidated debug object for easier inspection in console
  // eslint-disable-next-line no-console
  console.debug('[firebase] Env snapshot:', raw);
  
  if (useMockFirebase) {
    console.log('🔧 [firebase] Mock mode enabled - Firebase calls will be simulated');
  }
}

if (missing.length && !useMockFirebase) {
  const present = REQUIRED_KEYS.filter(k => !missing.includes(k));
  console.warn('[firebase] Diagnostic: present keys =>', present);
  console.warn('[firebase] Diagnostic: missing keys  =>', missing);
  if (import.meta.env.DEV) {
    console.warn('[firebase] Running in DEV with missing Firebase env vars. Firebase features will be disabled until keys are supplied.');
    console.warn('[firebase] Ensure a file named .env (or .env.development) exists in the frontend/ folder with lines like:');
    console.warn('  VITE_FIREBASE_API_KEY=...');
  }
}

// In production we still hard-fail to avoid deploying a broken build
if (missing.length && import.meta.env.PROD) {
  throw new Error('[firebase] Firebase configuration incomplete in production. Missing: ' + missing.join(', '));
}

let auth: ReturnType<typeof getAuth> | undefined;
let db: ReturnType<typeof getFirestore> | undefined;

if (useMockFirebase && import.meta.env.DEV) {
  console.log('🔧 [firebase] Using mock Firebase for development');
  // Create mock Firebase objects that won't make network calls
  const createMockAuth = () => ({
    currentUser: null,
    app: { options: {} }, // Add app property to avoid Firebase internals errors
    config: {}, // Add config property
    name: 'mock-app', // Add name property
    settings: { appVerificationDisabledForTesting: false }, // Add settings to prevent the error
    onAuthStateChanged: (callback: (user: any) => void) => {
      // Simulate no user logged in
      setTimeout(() => callback(null), 100);
      return () => {}; // unsubscribe function
    },
    signInWithPopup: () => Promise.reject(new Error('Mock Firebase: Authentication disabled in development')),
    signInWithRedirect: () => Promise.reject(new Error('Mock Firebase: Authentication disabled in development')),
    signInWithEmailAndPassword: () => Promise.reject(new Error('Mock Firebase: Authentication disabled in development')),
    signOut: () => Promise.resolve(),
    // Mock for getRedirectResult used in AuthContext
    _getRedirectResult: () => Promise.resolve(null),
  });

  const createMockDb = () => ({
    collection: () => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: false, data: () => null }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      }),
      add: () => Promise.resolve({ id: 'mock-id' }),
      get: () => Promise.resolve({ docs: [] }),
    }),
  });

  auth = createMockAuth() as any;
  db = createMockDb() as any;
} else if (!missing.length) {
  const firebaseConfig = {
    apiKey: VITE_FIREBASE_API_KEY,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
    projectId: VITE_FIREBASE_PROJECT_ID,
    storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: VITE_FIREBASE_APP_ID,
    measurementId: VITE_FIREBASE_MEASUREMENT_ID
  };
  // Avoid re-initialization in Vite HMR
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else if (import.meta.env.DEV) {
  // Soft placeholders to avoid crashing initial render; any usage will throw guiding message.
  const makeProxy = (name: string) => new Proxy({}, {
    get() {
      throw new Error(`[firebase] Attempted to use ${name} but Firebase env vars are missing: ${missing.join(', ')}`);
    }
  });
  auth = makeProxy('auth') as any;
  db = makeProxy('firestore') as any;
}

export { auth, db, useMockFirebase };
