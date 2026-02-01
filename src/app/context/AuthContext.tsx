import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from '/utils/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  bookmarks: Set<string>;
  toggleBookmark: (id: string) => Promise<void>;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-796c8de3`;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch bookmarks from server
  const fetchBookmarks = async (token: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/bookmarks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const ids = new Set(data.map((item: any) => item.hotelId as string));
        setBookmarks(ids);
      }
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
    }
  };

  // Check session on mount
  useEffect(() => {
    let authListener: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      // Safety timeout: If auth takes too long (e.g. redirect fail), stop loading
      const safetyTimer = setTimeout(() => {
        setIsLoading(false);
      }, 4000);

      // 0.5s Delay: Give Supabase time to process the hash after redirect
      // 구글 로그인 후 돌아왔을 때 슈파베이스가 정보 저장할 시간 주기
      await new Promise(resolve => setTimeout(resolve, 500));

      const isHandlingRedirect = 
        typeof window !== 'undefined' && 
        (window.location.hash.includes('access_token') || 
         window.location.hash.includes('type=recovery') ||
         window.location.search.includes('code='));

      if (isHandlingRedirect) {
        console.log("AuthContext: Detecting OAuth redirect, waiting for session...");
      }

      // Initial Check
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          fetchBookmarks(session.access_token);
        }
      } catch (error) {
        console.error("Session check error:", error);
      }

      // Listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log(`AuthContext: Auth event ${_event}`, session?.user?.email);
        console.log("상태 업데이트 직전:", session);
        
        if (session?.user) {
          setUser(session.user);
          fetchBookmarks(session.access_token);
        } else if (_event === 'SIGNED_OUT') {
          setUser(null);
          setBookmarks(new Set());
        }
        setIsLoading(false);
      });
      authListener = subscription;

      if (!isHandlingRedirect) {
        setIsLoading(false);
      }
      clearTimeout(safetyTimer);
    };

    initAuth();

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data.session) {
      setUser(data.session.user);
      fetchBookmarks(data.session.access_token);
      setShowLoginModal(false);
      toast.success("Logged in successfully");
    } else {
      toast.info("Please check your email to confirm your account.");
    }
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
    toast.success("Password reset email sent");
  };

  const signup = async (email: string, password: string, name: string) => {
    // Call server to create user with auto-confirm
    const res = await fetch(`${SERVER_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Signup failed');
    }

    // Auto login after signup
    await login(email, password);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
  };

  const toggleBookmark = async (id: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const token = session.access_token;
    const isBookmarked = bookmarks.has(id);

    // Optimistic update
    setBookmarks(prev => {
      const newSet = new Set(prev);
      if (isBookmarked) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });

    try {
      const method = isBookmarked ? 'DELETE' : 'POST';
      const res = await fetch(`${SERVER_URL}/bookmarks`, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hotelId: id })
      });

      if (!res.ok) {
        throw new Error('Failed to update bookmark');
      }
    } catch (error) {
      // Revert on error
      console.error(error);
      setBookmarks(prev => {
        const newSet = new Set(prev);
        if (isBookmarked) newSet.add(id);
        else newSet.delete(id);
        return newSet;
      });
      toast.error("Failed to update bookmark");
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      signup,
      loginWithGoogle,
      resetPassword,
      logout,
      bookmarks,
      toggleBookmark,
      showLoginModal,
      setShowLoginModal,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
