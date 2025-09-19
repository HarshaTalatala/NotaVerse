import { auth } from '../services/firebase';

export async function checkFirebaseConnection(): Promise<boolean> {
  try {
    if (!auth) {
      console.error('Firebase auth not initialized');
      return false;
    }

    // Try to get current user or check auth state
    const user = auth.currentUser;
    if (!user) {
      console.warn('No authenticated user found');
      return false;
    }

    // Try to get a fresh token to test connection
    await user.getIdToken(true);
    console.log('✅ Firebase connection is working');
    return true;
  } catch (error: any) {
    console.error('❌ Firebase connection failed:', error.message);
    
    // Check for common error patterns
    if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
        error.message?.includes('network')) {
      console.error('🚫 Firebase connections appear to be blocked by browser extensions');
      console.error('💡 Try disabling ad blockers or add firestore.googleapis.com to whitelist');
    }
    
    return false;
  }
}

export function displayConnectionStatus() {
  checkFirebaseConnection().then(isConnected => {
    if (!isConnected) {
      // Could show a user-friendly notification here
      console.warn('🔄 Firebase connection issues detected. Some features may not work properly.');
    }
  });
}