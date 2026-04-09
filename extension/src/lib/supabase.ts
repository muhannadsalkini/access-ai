import { createClient } from "@supabase/supabase-js";
import type { SupportedStorage } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Chrome Storage adapter for Supabase session persistence.
 * Stores session tokens in chrome.storage.local so they survive popup close/reopen.
 */
const chromeStorageAdapter: SupportedStorage = {
  getItem: (key: string): Promise<string | null> =>
    new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve((result[key] as string) ?? null);
      });
    }),

  setItem: (key: string, value: string): Promise<void> =>
    new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    }),

  removeItem: (key: string): Promise<void> =>
    new Promise((resolve) => {
      chrome.storage.local.remove([key], resolve);
    }),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
