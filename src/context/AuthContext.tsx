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
  loginWithCredentials: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  loginDemo: (role?: UserRole) => Promise<void>;
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

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const rawSession = localStorage.getItem('th_auth_session') || sessionStorage.getItem('th_auth_session');
      if (rawSession) {
        const session: AuthSession = JSON.parse(rawSession);
        if (session.expiresAtMs && session.expiresAtMs > Date.now()) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const savedProfile = localStorage.getItem('th_user_profile');
      if (savedProfile) {
        return JSON.parse(savedProfile);
      }
    } catch (_) {}
    return null;
  });

  const saveSession = (role: string, email: string, rememberMe = true) => {
    const durationMs = rememberMe ? 30 * 24 * 3600 * 1000 : 8 * 3600 * 1000;
    const session: AuthSession = {
      token: `th_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      expiresAtMs: Date.now() + durationMs,
      rememberMe,
      role,
      email,
    };

    try {
      if (rememberMe) {
        localStorage.setItem('th_auth_session', JSON.stringify(session));
      } else {
        sessionStorage.setItem('th_auth_session', JSON.stringify(session));
      }
      document.cookie = `traceharvest_session=${session.token}; path=/; max-age=${Math.round(durationMs / 1000)}; SameSite=Strict; Secure`;
    } catch (_) {}
  };

  const clearSession = () => {
    try {
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
              role: (adminData.role as UserRole) || 'super_admin',
              agency: 'TraceHarvest Control Center',
              updatedAt: new Date().toISOString(),
            };
            setUserProfile(profile);
            setIsAuthenticated(true);
            setIsNotAnAdmin(false);
            saveSession(profile.role, profile.email, true);
            localStorage.setItem('th_user_profile', JSON.stringify(profile));
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
            // Fail closed: a server error is not proof of administrator authorization.
            setUserProfile(null);
            setIsAuthenticated(false);
            setAuthErrorMessage(
              `Unable to verify administrator access (HTTP ${res.status}). Please try again shortly.`
            );
          }
        } catch (netErr) {
          // Fail closed when the backend cannot verify the Firebase identity.
          console.warn('[Auth] Unable to verify administrator access:', netErr);
          setUserProfile(null);
          setIsAuthenticated(false);
          setAuthErrorMessage('Unable to verify administrator access. Check your connection and try again.');

        }
      } else {
        setCurrentUser(null);
        // Firebase is the source of truth. A cached browser session is not authentication.
        clearSession();
        setIsAuthenticated(false);
        setUserProfile(null);
        setIsNotAnAdmin(false);
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
      setAuthErrorMessage(
        err instanceof Error ? err.message : 'Google sign-in could not be completed.'
      );
      setIsLoading(false);
      throw err;
    }
  };

  // Demo sign-in and local credential flow (triggers Google or sets loading state)
  const loginWithCredentials = async (email: string, pass: string, rememberMe = true): Promise<boolean> => {
    setIsLoading(true);
    setAuthErrorMessage(null);
    setIsNotAnAdmin(false);
    await new Promise((res) => setTimeout(res, 200));

    if (pass.length < 4) {
      setIsLoading(false);
      return false;
    }

    // Try Google sign-in if email matches Google account or authenticate
    try {
      await signInWithGoogle();
      return true;
    } catch {
      setIsLoading(false);
      return false;
    }
  };

  const loginDemo = async () => {
    await signInWithGoogle();
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
        loginWithCredentials,
        loginDemo,
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
