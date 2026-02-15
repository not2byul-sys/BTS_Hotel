import React, { useState, useEffect } from 'react';
import { Globe, Check, List, Map, Heart, User, LogIn } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Language } from '@/translations';
import { useAuth } from '@/app/context/AuthContext';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onHome?: () => void;
  onSearch?: () => void;
  onBookmarks?: () => void;
  viewMode?: 'list' | 'map';
  setViewMode?: (mode: 'list' | 'map') => void;
}

const languages: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
];

export const Header = ({ currentLang, onLanguageChange, onHome, onSearch, onBookmarks, viewMode, setViewMode }: HeaderProps) => {
  const currentLabel = languages.find(l => l.code === currentLang)?.label || 'English';
  const { isAuthenticated, user, setShowLoginModal, logout } = useAuth();
  const [pendingBookmarks, setPendingBookmarks] = useState(false);

  useEffect(() => {
    if (isAuthenticated && pendingBookmarks) {
      onBookmarks?.();
      setPendingBookmarks(false);
    }
  }, [isAuthenticated, pendingBookmarks, onBookmarks]);

  const handleBookmarksClick = () => {
    if (isAuthenticated) {
      onBookmarks?.();
    } else {
      setPendingBookmarks(true);
      setShowLoginModal(true);
    }
  };

  const handleUserClick = () => {
    if (isAuthenticated) {
      const confirmMessage = currentLang === 'ko' ? '로그아웃 하시겠습니까?' : 'Do you want to logout?';
      if (window.confirm(confirmMessage)) {
        logout();
      }
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full max-w-md left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className={`${viewMode === 'map' ? 'fixed top-0 left-0 right-0 w-full' : 'fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md'} z-[60] px-5 bg-white border-b border-gray-100 h-14 flex items-center justify-between transition-all duration-300`}>
        <button 
          onClick={onHome}
          className="p-2 -ml-2 text-[#333] hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>

        {viewMode && setViewMode && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-100 p-1 rounded-full flex items-center px-[4px] py-[3.6px]">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              LIST
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              MAP
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-1">
            <button 
            onClick={handleUserClick}
            className={`px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
              isAuthenticated 
                ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isAuthenticated ? (
              <>
                <User className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-xs font-bold max-w-[80px] truncate">
                  {user?.email ? user.email.split('@')[0] : 'User'}
                </span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-xs font-bold">
                  {currentLang === 'ko' ? '로그인' : 'Login'}
                </span>
              </>
            )}
          </button>
          {onBookmarks && (
            <button 
              onClick={handleBookmarksClick}
              className="p-2 text-[#333] hover:bg-gray-100 rounded-full transition-colors"
            >
              <Heart className="w-[22px] h-[22px]" strokeWidth={2} />
            </button>
          )}

          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="p-2 text-[#333] hover:bg-gray-100 rounded-full transition-colors">
                <Globe className="w-[22px] h-[22px]" strokeWidth={2} />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content 
                className="z-[60] w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-1 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200" 
                sideOffset={5}
                align="end"
              >
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => onLanguageChange(lang.code)}
                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors text-left"
                  >
                    <span>{lang.label}</span>
                    {currentLang === lang.code && <Check className="w-[14px] h-[14px]" strokeWidth={2} />}
                  </button>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
    </header>
  );
};
