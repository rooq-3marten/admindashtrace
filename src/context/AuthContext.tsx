import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthSession {
  token: string;
  expiresAtMs: number;
  rememberMe: boolean;
  role: UserRole;
  email: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
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

const DEFAULT_SUPER_ADMIN: UserProfile = {
  uid: 'usr-admin-001',
  email: 'shekonifarooq@gmail.com',
  displayName: 'Shekoni Farooq (Super Admin)',
  role: 'super_admin',
  agency: 'TraceHarvest HQ / NAFDAC Export Oversight',
  updatedAt: new Date().toISOString(),
};

const DEFAULT_COMPLIANCE_OFFICER: UserProfile = {
  uid: 'usr-comp-002',
  email: 'fatima.bello@nafdac.gov.ng',
  displayName: 'Dr. Fatima Bello (Lead Compliance Officer)',
  role: 'compliance_officer',
  agency: 'NAFDAC Agrochemical & PHI Regulatory Division',
  updatedAt: new Date().toISOString(),
};

const DEFAULT_FLEET_MANAGER: UserProfile = {
  uid: 'usr-fleet-003',
  email: 'kabir.garba@traceharvest.com',
  displayName: 'Kabir Garba (Field Fleet Manager)',
  role: 'fleet_manager',
  agency: 'TraceHarvest Northern Corridor Fleet Operations',
  updatedAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
      const rawSession = localStorage.getItem('th_auth_session') || sessionStorage.getItem('th_auth_session');
      if (rawSession) {
        const session: AuthSession = JSON.parse(rawSession);
        if (session.expiresAtMs && session.expiresAtMs > Date.now()) {
          const savedProfile = localStorage.getItem('th_user_profile');
          if (savedProfile) {
            return JSON.parse(savedProfile);
          }
          return DEFAULT_SUPER_ADMIN;
        }
      }
    } catch (_) {}
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        const isTargetEmail = firebaseUser.email === 'shekonifarooq@gmail.com';
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || 'user@traceharvest.com',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Admin Operator',
          photoURL: firebaseUser.photoURL || undefined,
          role: isTargetEmail ? 'super_admin' : 'compliance_officer',
          agency: 'TraceHarvest Control Center',
          updatedAt: new Date().toISOString(),
        };

        setUserProfile(profile);
        setIsAuthenticated(true);
        saveSession(profile.role, profile.email, true);
        localStorage.setItem('th_user_profile', JSON.stringify(profile));
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveSession = (role: UserRole, email: string, rememberMe = true) => {
    // 8-hour workday session, or 30 days if rememberMe
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
      // Also write cookie for middleware / proxy compatibility
      document.cookie = `traceharvest_session=${session.token}; path=/; max-age=${Math.round(durationMs / 1000)}; SameSite=Strict; Secure`;
    } catch (_) {}
  };

  const clearSession = () => {
    try {
      localStorage.removeItem('th_auth_session');
      sessionStorage.removeItem('th_auth_session');
      document.cookie = 'traceharvest_session=; path=/; max-age=0; SameSite=Strict';
    } catch (_) {}
  };

  const loginWithCredentials = async (email: string, pass: string, rememberMe = true): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 350));

    // Basic password validation rule: minimum 4 characters
    if (pass.length < 4) {
      setIsLoading(false);
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let profile: UserProfile;

    if (normalizedEmail.includes('compliance') || normalizedEmail.includes('nafdac')) {
      profile = { ...DEFAULT_COMPLIANCE_OFFICER, email: normalizedEmail };
    } else if (normalizedEmail.includes('fleet') || normalizedEmail.includes('agent')) {
      profile = { ...DEFAULT_FLEET_MANAGER, email: normalizedEmail };
    } else {
      profile = { ...DEFAULT_SUPER_ADMIN, email: normalizedEmail };
    }

    setUserProfile(profile);
    setIsAuthenticated(true);
    saveSession(profile.role, profile.email, rememberMe);
    localStorage.setItem('th_user_profile', JSON.stringify(profile));
    setIsLoading(false);
    return true;
  };

  const loginDemo = async (requestedRole: UserRole = 'super_admin') => {
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 250));

    let profile = DEFAULT_SUPER_ADMIN;
    if (requestedRole === 'compliance_officer') profile = DEFAULT_COMPLIANCE_OFFICER;
    if (requestedRole === 'fleet_manager') profile = DEFAULT_FLEET_MANAGER;

    setUserProfile(profile);
    setIsAuthenticated(true);
    saveSession(profile.role, profile.email, true);
    localStorage.setItem('th_user_profile', JSON.stringify(profile));
    setIsLoading(false);
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.warn('Google sign-in popup closed or error:', err);
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (_) {}
    clearSession();
    setCurrentUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
    }
  };

  const switchRole = (newRole: UserRole) => {
    if (!userProfile) return;
    const agencyMap: Record<UserRole, string> = {
      super_admin: 'TraceHarvest HQ / NAFDAC Export Oversight',
      compliance_officer: 'NAFDAC Agrochemical & PHI Regulatory Division',
      fleet_manager: 'TraceHarvest Northern Corridor Fleet Operations',
      inspector: 'Nigeria Customs & EU Border Control Port Authority',
    };
    const titleMap: Record<UserRole, string> = {
      super_admin: 'Shekoni Farooq (Super Admin)',
      compliance_officer: 'Dr. Fatima Bello (Lead Compliance Officer)',
      fleet_manager: 'Kabir Garba (Field Fleet Manager)',
      inspector: 'Inspector J. Nnamdi (Export Port Auditor)',
    };
    const updated: UserProfile = {
      ...userProfile,
      role: newRole,
      displayName: titleMap[newRole] || userProfile.displayName,
      agency: agencyMap[newRole],
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(updated);
    saveSession(newRole, updated.email, true);
    localStorage.setItem('th_user_profile', JSON.stringify(updated));
  };

  const effectiveRole = userProfile?.role || 'super_admin';
  const canCertifyBatches = effectiveRole === 'super_admin' || effectiveRole === 'compliance_officer';
  const canFlagPractices = effectiveRole === 'super_admin' || effectiveRole === 'compliance_officer';
  const canDeleteRecords = effectiveRole === 'super_admin';
  const canManageRoles = effectiveRole === 'super_admin';
  const canTriggerSync = true;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role: effectiveRole,
        isAuthenticated,
        isLoading,
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
