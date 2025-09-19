import axios from 'axios';
import { getIdToken } from 'firebase/auth';
import { auth } from './firebase';

// Use relative URL to leverage Vite's proxy in development
const apiBaseUrl = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || 'https://notaverse-oi7vtkp6x-harshas-projects-3f6f4b88.vercel.app/api');
const silent = import.meta.env.VITE_API_SILENT === '1';

if (!silent) {
  console.debug('🔧 API Base URL:', apiBaseUrl);
  console.debug('🔧 Environment:', {
    DEV: import.meta.env.DEV,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL
  });
}

const api = axios.create({ baseURL: apiBaseUrl });

// Debug log the axios base URL
if (import.meta.env.DEV && !silent) {
  try {
    console.debug('[api] Axios baseURL:', apiBaseUrl);
  } catch {}
}

api.interceptors.request.use(async (config) => {
  if (!auth) {
    throw new Error('Firebase authentication not initialized. Cannot make authenticated requests.');
  }
  
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await getIdToken(user, true);
      config.headers = config.headers || {};
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.error('[api] Failed to acquire authentication token:', (e as Error).message);
      console.error('[api] This might be caused by browser extensions blocking Firebase connections');
      console.error('[api] Try disabling ad blockers or add firestore.googleapis.com to whitelist');
      throw new Error('Authentication failed. This might be caused by browser extensions blocking Firebase. Try disabling ad blockers or refreshing the page.');
    }
  } else {
    console.error('[api] No authenticated user found');
    throw new Error('User must be logged in to make API requests.');
  }
  
  return config;
});

export default api;