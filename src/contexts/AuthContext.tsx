// ─── Auth Context ─────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getDocById, setDocById } from '@/lib/firestore';
import type { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  roles: UserRole[];
  isAdmin: boolean;
  isRouteSetter: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  roles: [],
  isAdmin: false,
  isRouteSetter: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const p = await getDocById<UserProfile>('users', uid);
    setProfile(p);
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase auth no disponible');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;

    // Crear perfil si es primera vez
    const existing = await getDocById<UserProfile>('users', firebaseUser.uid);
    if (!existing) {
      const newProfile: Partial<UserProfile> = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName ?? 'Escalador',
        email: firebaseUser.email ?? '',
        roles: ['climber'],
        emoji: null,
        photoURL: firebaseUser.photoURL,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await setDocById<UserProfile>('users', firebaseUser.uid, newProfile);
      setProfile(newProfile as UserProfile);
    } else {
      await fetchProfile(firebaseUser.uid);
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        roles: profile?.roles ?? [],
        isAdmin: profile?.roles?.includes('admin') ?? false,
        isRouteSetter: profile?.roles?.includes('routesetter') ?? false,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
