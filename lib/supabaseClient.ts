import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ndzjirmrfdeheuljjvxb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kemppcm1yZmRlaGV1bGpqdnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Mjk4ODQsImV4cCI6MjA4MDEwNTg4NH0.KurTQrTjwUJM9aA5M0OVw7bZa7radpy0EDx1q9lKf1A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);