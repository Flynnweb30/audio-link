import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  browserLocalPersistence, 
  setPersistence, 
  User, 
  Auth 
} from 'firebase/auth';

const STORAGE_KEY_FIREBASE_CONFIG = 'medialink_custom_firebase_config';

export function getActiveFirebaseConfig(): Record<string, string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch {}

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

export function saveCustomFirebaseConfig(config: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
  window.location.reload();
}

const config = getActiveFirebaseConfig();
export const hasFirebaseCredentials = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (hasFirebaseCredentials) {
  try {
    app = !getApps().length ? initializeApp(config) : getApp();
    auth = getAuth(app);
    // Real OAuth user session persistence across browser reloads and restarts
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Firebase persistence warning:', err);
    });
  } catch (err) {
    console.error('Failed to initialize Firebase with current credentials:', err);
  }
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Executes REAL Google OAuth popup flow
export async function loginWithGoogle(): Promise<User> {
  if (!auth) {
    throw new Error('MISSING_CONFIG');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    console.error('Firebase Google Sign-In error:', err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export { auth };