import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// In-memory storage fallback for environments where localStorage is blocked (e.g., Figma iframes)
const memoryStorage = new Map<string, string>();

const safeStorage = {
  getItem: (key: string) => {
    let value = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        value = window.localStorage.getItem(key);
      }
    } catch (e) {
      // Access denied or not available
      console.warn("localStorage getItem failed, falling back to memory:", e);
    }
    // Critical fix: Always check memoryStorage if localStorage returns null.
    // This handles cases where Write failed (silently or caught) but Read succeeds (returning null).
    return value || memoryStorage.get(key) || null;
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        // We also set memoryStorage as a backup/cache
        memoryStorage.set(key, value);
        return;
      }
    } catch (e) {
      // Access denied
      console.warn("localStorage setItem failed, falling back to memory:", e);
    }
    memoryStorage.set(key, value);
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      // Access denied
    }
    memoryStorage.delete(key);
  },
};

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});
