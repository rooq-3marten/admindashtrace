import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { apiFetch, registerAuthErrorHandler } from '../lib/apiFetch';
import { UserProfile, UserRole } from '../types';

interface AuthSession {
  token: string;
  expiresAtMs: number;
  rememberMe: boolean;
  role: string;
  email: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNotAnAdmin: boolean;
  authErrorMessage: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  canCertifyBatches: boolean;
  canFlagPractices: boolean;
  canDeleteRecords: boolean;
  canManageRoles: boolean;
  canTriggerSync: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isNotAnAdmin, setIsNotAnAdmin] = useState<boolean>(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Signed-in state comes only from Firebase plus the server's /admin/me answer, never from browser storage.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const clearSession = () => {
    try {
      // Remove leftovers written by earlier versions
      localStorage.removeItem('th_auth_session');
      localStorage.removeItem('th_user_profile');
      sessionStorage.removeItem('th_auth_session');
      document.cookie = 'traceharvest_session=; path=/; max-age=0; SameSite=Strict';
    } catch (_) {}
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (_) {}
    clearSession();
    setCurrentUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setIsNotAnAdmin(false);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
    }
  };

  // Register centralized auth error handler from apiFetch
  useEffect(() => {
    const unregister = registerAuthErrorHandler((type, message) => {
      if (type === 'session_expired') {
        signOut();
        setAuthErrorMessage('Session expired, please sign in again.');
      } else if (type === 'not_an_admin') {
        setIsNotAnAdmin(true);
        setIsAuthenticated(false);
        setUserProfile(null);
        clearSession();
      }
    });

    return () => unregister();
  }, []);

  // End a sign-in we cannot verify: sign out of Firebase and tell the person why.
  const failClosed = async (message: string) => {
    try {
      await fbSignOut(auth);
    } catch (_) {}
    clearSession();
    setCurrentUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setIsNotAnAdmin(false);
    setAuthErrorMessage(message);
  };

  // Monitor Firebase Auth State & establish admin profile from /admin/me
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        setAuthErrorMessage(null);

        // Fetch authoritative admin profile from backend GET /admin/me
        try {
          const res = await apiFetch('/api/v1/admin/me');
          if (res.status === 200) {
            const adminData = await res.json();
            const profile: UserProfile = {
              uid: firebaseUser.uid,
              email: adminData.email || firebaseUser.email || '',
              displayName: adminData.name || firebaseUser.displayName || adminData.email || 'Administrator',
              photoURL: firebaseUser.photoURL || undefined,
              role: (adminData.role as UserRole) || 'admin',
              agency: 'TraceHarvest Control Center',
              updatedAt: new Date().toISOString(),
            };
            setUserProfile(profile);
            setIsAuthenticated(true);
            setIsNotAnAdmin(false);
          } else if (res.status === 403) {
            const errData = await res.json().catch(() => null);
            if (errData?.error === 'NOT_AN_ADMIN') {
              setIsNotAnAdmin(true);
              setIsAuthenticated(false);
              setUserProfile(null);
              clearSession();
            } else {
              setAuthErrorMessage(errData?.message || 'Access denied.');
              setIsAuthenticated(false);
            }
          } else if (res.status === 401) {
            await signOut();
            setAuthErrorMessage('Session expired, please sign in again.');
          } else {
            // The server could not confirm this account (outage, misconfiguration). Fail closed.
            console.warn(`[Auth] /admin/me returned HTTP ${res.status}. Signing out.`);
            await failClosed('We could not verify your administrator account right now. Please try again in a moment.');
          }
        } catch (netErr) {
          console.warn('[Auth] Network error reaching /admin/me:', netErr);
          await failClosed('We could not reach the server to verify your account. Check your connection and try again.');
        }
      } else {
        // Not signed in to Firebase: nobody is authenticated, whatever the browser has stored
        setCurrentUser(null);
        setIsAuthenticated(false);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setAuthErrorMessage(null);
    setIsNotAnAdmin(false);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.warn('Google sign-in error:', err);
      setIsLoading(false);
    }
  };

  // Browser-based role switcher disabled: roles are established strictly server-side
  const switchRole = (_newRole: UserRole) => {
    console.warn('[Security] Client-side role switching is disabled. Administrator identity is verified by the backend.');
  };

  const effectiveRole = userProfile?.role || 'admin';
  const canCertifyBatches = true;
  const canFlagPractices = true;
  const canDeleteRecords = true;
  const canManageRoles = true;
  const canTriggerSync = true;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role: effectiveRole,
        isAuthenticated,
        isLoading,
        isNotAnAdmin,
        authErrorMessage,
        signInWithGoogle,
        signOut,
        switchRole,
        canCertifyBatches,
        canFlagPractices,
        canDeleteRecords,
        canManageRoles,
        canTriggerSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
