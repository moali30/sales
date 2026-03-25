import { createClient } from '@supabase/supabase-js';

// Read values from .env (User will need to supply these for actual use)
// Use a syntactically valid dummy URL so the application doesn't crash on initial boot before configuration.
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = envUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isConfigured = !!envUrl && envUrl !== 'https://placeholder.supabase.co';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
