import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { projectId } from '../../../utils/supabase/info';
import { supabase } from '../../../utils/supabase/client';
import { toast } from 'sonner';

console.log('=== AuthContext.tsx 로드됨 ===');

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
    console.log('=== AuthContext useEffect 시작 ===');
    console.log('현재 URL:', window.location.href);

    if (window.location.hash) {
      console.log('URL Hash 발견:', window.location.hash);
    }

    // 세션 상태 변경 리스너 - 먼저 등록
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('=== Auth 상태 변경 ===');
        console.log('Event:', event);
        console.log('Session:', session);

        if (session?.user) {
          console.log('로그인 성공! User:', session.user.email);
          setUser(session.user);
          fetchBookmarks(session.access_token);
          toast.success(`Session restored for: ${session.user.email}`);
        } else {
          console.log('로그아웃 상태');
          setUser(null);
          setBookmarks(new Set());
        }
        setIsLoading(false);
      }
    );

    // 초기 세션 확인
    const checkSession = async () => {
      console.log('=== 초기 세션 확인 시작 ===');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('getSession 결과:', { session, error });

        if (session?.user) {
          console.log('기존 세션 발견:', session.user.email);
          setUser(session.user);
          fetchBookmarks(session.access_token);
        } else {
          console.log('기존 세션 없음');
        }
      } catch (error) {
        console.error("Session check error:", error);
      }
      setIsLoading(false);
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
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
    // Return a default mock context to prevent crashes in preview environments
    // or when components are rendered in isolation.
    console.error('CRITICAL: useAuth used outside of AuthProvider. Returning mock context. This explains why auth state is not updating.');
    return {
      user: null,
      isAuthenticated: false,
      login: async () => {},
      signup: async () => {},
      loginWithGoogle: async () => {},
      resetPassword: async () => {},
      logout: async () => {},
      bookmarks: new Set<string>(),
      toggleBookmark: async () => {},
      showLoginModal: false,
      setShowLoginModal: () => {},
      isLoading: false
    } as AuthContextType;
  }
  return context;
};
