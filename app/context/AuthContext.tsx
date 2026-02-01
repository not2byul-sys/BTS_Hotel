import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mjzuelvnowutvarghfbm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jAssSpSYZI02lBTKczkrZw_jvGAB48d';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // URL에서 토큰 확인 (구글에서 돌아왔을 때)
    const handleOAuthCallback = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken) {
          console.log('✅ OAuth 토큰 발견! 세션 생성 중...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });

          if (error) {
            console.error('❌ 세션 생성 실패:', error);
          } else {
            console.log('✅ 로그인 성공!', data.user?.email);
            setUser(data.user);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user ?? null);
          console.log('현재 세션:', session?.user?.email || '로그인 안 됨');
        }
      } catch (error) {
        console.error('인증 확인 중 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    handleOAuthCallback();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('인증 이벤트:', event);
        
        if (event === 'SIGNED_IN') {
          setUser(session?.user ?? null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('구글 로그인 오류:', error);
        throw error;
      }
    } catch (error) {
      console.error('로그인 실패:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용 가능합니다');
  }
  return context;
}
