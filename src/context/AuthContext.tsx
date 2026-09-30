import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile;
  role: UserRole;
  isLoading: boolean;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('th_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_SUPER_ADMIN;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        const isTargetEmail = firebaseUser.email === 'shekonifarooq@gmail.com';
        setUserProfile((prev) => {
          const updated: UserProfile = {
            ...prev,
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'user@traceharvest.org',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Admin Operator',
            photoURL: firebaseUser.photoURL || undefined,
            role: isTargetEmail ? 'super_admin' : (prev.role || 'compliance_officer'),
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem('th_user_profile', JSON.stringify(updated));
          return updated;
        });
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const switchRole = (newRole: UserRole) => {
    setUserProfile((prev) => {
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
        ...prev,
        role: newRole,
        displayName: prev.email === 'shekonifarooq@gmail.com' && newRole === 'super_admin' ? 'Shekoni Farooq (Super Admin)' : titleMap[newRole],
        agency: agencyMap[newRole],
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('th_user_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.warn('Google sign-in popup closed or error:', err);
      // Keep demo profile functional
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setCurrentUser(null);
      // Reset to default super admin profile for interactive continuity
      setUserProfile(DEFAULT_SUPER_ADMIN);
      localStorage.setItem('th_user_profile', JSON.stringify(DEFAULT_SUPER_ADMIN));
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const role = userProfile.role;
  const canCertifyBatches = role === 'super_admin' || role === 'compliance_officer';
  const canFlagPractices = role === 'super_admin' || role === 'compliance_officer';
  const canDeleteRecords = role === 'super_admin';
  const canManageRoles = role === 'super_admin';
  const canTriggerSync = true;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role,
        isLoading,
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
