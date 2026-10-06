import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth: Auth = getAuth(app);

// Guarantee persistent user session across browser tabs, reloads, and reopens
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase persistence warning:', err);
});

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
);

// Real Google OAuth Flow using Firebase Authentication
export async function loginWithGoogle(): Promise<User> {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase is not configured yet. Please add your VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID to your environment variables on Render (or .env locally).'
    );
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    console.error('Firebase Google OAuth error:', err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export { auth };