import { createClient } from '@supabase/supabase-js';

// Default keys (Public/Anon)
const DEFAULT_URL = 'https://ndzjirmrfdeheuljjvxb.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kemppcm1yZmRlaGV1bGpqdnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Mjk4ODQsImV4cCI6MjA4MDEwNTg4NH0.KurTQrTjwUJM9aA5M0OVw7bZa7radpy0EDx1q9lKf1A';

// Helper to safely get environment variables
const getEnv = (key: string) => {
  try {
    // Check if running in a Vite environment where import.meta.env is defined
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
       // @ts-ignore
       return import.meta.env[key];
    }
  } catch (e) {
    console.warn('Error accessing environment variable:', key);
  }
  return undefined;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || DEFAULT_URL;
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || DEFAULT_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
