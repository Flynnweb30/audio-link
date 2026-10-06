import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User, 
  Auth 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoPlaceholderKeyForMediaLink123',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'medialink-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'medialink-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'medialink-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
};

let app: FirebaseApp;
let auth: Auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
);

export async function loginWithGoogle(): Promise<User | null> {
  if (!isFirebaseConfigured) {
    const demoUser = {
      uid: 'google_user_' + Date.now().toString(36),
      displayName: 'Google Demo User',
      email: 'demo.user@gmail.com',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    } as unknown as User;
    localStorage.setItem('medialink_demo_user', JSON.stringify(demoUser));
    window.dispatchEvent(new Event('auth-state-changed'));
    return demoUser;
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
  localStorage.removeItem('medialink_demo_user');
  if (isFirebaseConfigured) {
    await signOut(auth);
  } else {
    window.dispatchEvent(new Event('auth-state-changed'));
  }
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured) {
    const checkDemoUser = () => {
      const stored = localStorage.getItem('medialink_demo_user');
      callback(stored ? (JSON.parse(stored) as User) : null);
    };
    checkDemoUser();
    window.addEventListener('auth-state-changed', checkDemoUser);
    return () => window.removeEventListener('auth-state-changed', checkDemoUser);
  }

  return onAuthStateChanged(auth, callback);
}

export { auth };