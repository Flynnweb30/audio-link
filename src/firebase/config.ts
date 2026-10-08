import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously,
  signOut as firebaseSignOut,
  User 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  Firestore
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

function cleanEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  return val.trim().replace(/^["']|["']$/g, '');
}

export const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY, "AIzaSyBFF9m_6NidWN0HxpDG9TRjOLiytOgNbn4"),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "url-shortener-61f15.firebaseapp.com"),
  databaseURL: cleanEnv(import.meta.env.VITE_FIREBASE_DATABASE_URL, "https://url-shortener-61f15-default-rtdb.asia-southeast1.firebasedatabase.app"),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, "url-shortener-61f15"),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "url-shortener-61f15.firebasestorage.app"),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "641845296081"),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID, "1:641845296081:web:b8ac03bc766b5a10763ef0"),
  measurementId: cleanEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, "G-Q7NRFE1MZ8")
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use long-polling mode to prevent ad-blocker (uBlock/Brave) ERR_BLOCKED_BY_CLIENT on WebChannel
let firestoreInstance: Firestore | null = null;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch {
  try {
    firestoreInstance = initializeFirestore(app, {});
  } catch {
    firestoreInstance = null;
  }
}
export const db = firestoreInstance;

let storageInstance: FirebaseStorage | null = null;
try {
  // Pass explicit bucket to guarantee exact matching
  storageInstance = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
} catch {
  try {
    storageInstance = getStorage(app);
  } catch {
    storageInstance = null;
  }
}
export const storage = storageInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function ensureFirebaseAuth(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}