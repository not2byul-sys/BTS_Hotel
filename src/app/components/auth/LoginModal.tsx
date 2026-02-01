import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Loader2, User, Eye, EyeOff, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';

type AuthMode = 'login' | 'signup' | 'forgot';

export const LoginModal = () => {
  const { showLoginModal, setShowLoginModal, login, signup, loginWithGoogle, resetPassword, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showLoginModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Normalize email/ID - append @armystay.com if no domain provided
    let submitEmail = email;
    if (submitEmail && !submitEmail.includes('@')) {
      submitEmail = `${submitEmail}@armystay.com`;
    }

    if (mode === 'forgot') {
      if (!submitEmail) {
        setError('Please enter your ID/Email');
        return;
      }
      setIsLoading(true);
      try {
        await resetPassword(submitEmail);
        setMode('login');
      } catch (err: any) {
        setError(err.message || 'Failed to send reset email');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!submitEmail || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && !name) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    
    try {
      if (mode === 'login') {
        await login(submitEmail, password);
      } else {
        await signup(submitEmail, password, name);
      }
      // Modal closed by context on success
    } catch (err: any) {
      if (mode === 'login' && (err.message === 'Invalid login credentials' || err.message.includes('Invalid login'))) {
        setMode('signup');
        setError('Registration is required. Please create an account.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      let msg = err.message || 'Google login failed';
      if (msg.includes('provider is not enabled')) {
        msg = 'Google Login is not enabled. Please enable it in the Supabase Dashboard under Authentication > Providers > Google.';
      }
      setError(msg);
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Sign in to access your bookmarks';
      case 'signup': return 'Join to save your favorite stays';
      case 'forgot': return 'Enter your email to receive a reset link';
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4">
      <div 
        onClick={() => setShowLoginModal(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <div 
        className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative z-10"
      >
        <div className="p-6 pt-8 text-center">
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {mode === 'login' ? <Lock size={32} /> : mode === 'signup' ? <User size={32} /> : <KeyRound size={32} />}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {getTitle()}
          </h2>
          <p className="text-gray-500 text-sm">
            {getSubtitle()}
          </p>
        </div>

        <div className="p-6 pt-0 space-y-4">
          {(mode === 'login' || mode === 'signup') && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || authLoading}
              className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 ml-1">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    placeholder="Your Name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 ml-1">ID</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  placeholder="Enter your ID"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                  }}
                  className="text-xs font-medium text-purple-600 hover:text-purple-800"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <p className="text-red-500 text-xs font-medium text-center break-words px-2">{error}</p>
            )}

            <button 
              type="submit" 
              disabled={isLoading || authLoading}
              className="w-full bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 
                (mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link')}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  if (mode === 'forgot') setMode('login');
                  else setMode(mode === 'login' ? 'signup' : 'login');
                  setError('');
                  setPassword('');
                }}
                className="text-sm text-gray-500 hover:text-purple-700 font-medium"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 
                 mode === 'signup' ? "Already have an account? Sign in" :
                 "Back to Sign in"}
              </button>
            </div>
          </form>
        </div>

        <button 
          onClick={() => setShowLoginModal(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
