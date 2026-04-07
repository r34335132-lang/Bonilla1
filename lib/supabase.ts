import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gisyiiljfplywcfhxxem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpc3lpaWxqZnBseXdjZmh4eGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTc2NTgsImV4cCI6MjA5MDczMzY1OH0.aEcymRCas-tjM5Cnts4pfkFmBQALjwOxcUKpp5Qtr5s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});