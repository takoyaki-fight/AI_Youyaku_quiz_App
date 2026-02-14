"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider } from "./client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  getIdToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let initialized = false;

    const timeoutId = window.setTimeout(() => {
      if (initialized) return;
      initialized = true;
      setLoading(false);
      setAuthError("AUTH_INIT_TIMEOUT");
    }, 7000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        if (!initialized) {
          initialized = true;
          window.clearTimeout(timeoutId);
        }
        setUser(nextUser);
        setLoading(false);
        setAuthError(null);
      },
      (error) => {
        if (!initialized) {
          initialized = true;
          window.clearTimeout(timeoutId);
        }
        setLoading(false);
        setAuthError(
          error instanceof Error ? error.message : "AUTH_INIT_ERROR"
        );
      }
    );

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "GOOGLE_SIGNIN_ERROR");
      throw error;
    }
  };

  const signOut = async () => {
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "SIGNOUT_ERROR");
      throw error;
    }
  };

  const getIdToken = async () => {
    if (!user) return null;
    return user.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, authError, signInWithGoogle, signOut, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
