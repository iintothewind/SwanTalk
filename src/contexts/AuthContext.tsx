import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { APP_CONFIG } from '../config';
import { requestNotificationPermission } from '../lib/notifications';
import type { User } from '../types';

const SESSION_KEY = 'swan-talk-login-time';
const SESSION_DURATION_MS = APP_CONFIG.sessionDurationDays * 86400_000;

function recordLoginTime() {
  localStorage.setItem(SESSION_KEY, Date.now().toString());
}

function isSessionExpired(): boolean {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    // No timestamp — could be a redirect result that lost its state due to
    // an ad blocker or browser privacy setting. Treat as a fresh session.
    recordLoginTime();
    return false;
  }
  return Date.now() - Number(raw) > SESSION_DURATION_MS;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function writeUserProfile(uid: string, displayName: string, photoURL: string, email?: string) {
  await setDoc(
    doc(db, 'users', uid),
    { displayName, photoURL, email: email ?? null, lastSeen: serverTimestamp() },
    { merge: true }
  ).catch(console.error);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Enforce session expiry
        if (isSessionExpired()) {
          await firebaseSignOut(auth);
          clearSession();
          setUser(null);
          setLoading(false);
          return;
        }

        const displayName =
          firebaseUser.displayName ??
          firebaseUser.email?.split('@')[0] ??
          'User';
        const photoURL = firebaseUser.photoURL ?? '';
        const email = firebaseUser.email ?? undefined;

        // Always refresh displayName, photoURL, email + lastSeen in Firestore on every login/reload
        await writeUserProfile(firebaseUser.uid, displayName, photoURL, email);

        setUser({ uid: firebaseUser.uid, displayName, photoURL, email });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    recordLoginTime();
    requestNotificationPermission();
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    recordLoginTime();
    requestNotificationPermission();
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    await writeUserProfile(credential.user.uid, displayName, '', email);
    setUser({ uid: credential.user.uid, displayName, photoURL: '', email });
    recordLoginTime();
    requestNotificationPermission();
  };

  const signOut = async () => {
    clearSession();
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
