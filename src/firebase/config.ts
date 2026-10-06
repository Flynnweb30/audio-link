import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBFF9m_6NidWN0HxpDG9TRjOLiytOgNbn4",
  authDomain: "url-shortener-61f15.firebaseapp.com",
  databaseURL: "https://url-shortener-61f15-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "url-shortener-61f15",
  storageBucket: "url-shortener-61f15.firebasestorage.app",
  messagingSenderId: "641845296081",
  appId: "1:641845296081:web:b8ac03bc766b5a10763ef0",
  measurementId: "G-Q7NRFE1MZ8"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
