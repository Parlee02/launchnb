import { createClient } from '@supabase/supabase-js';

console.log('🔥 SUPABASE CLIENT FILE LOADED');

const supabaseUrl = 'https://stghveoagifbdhyrhxcl.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0Z2h2ZW9hZ2lmYmRoeXJoeGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NzM0MjUsImV4cCI6MjA4MTE0OTQyNX0.ikhve3ZebLn-suAsE0hamPi3gh_LewvtcE5oK4yjER0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---- DEBUG BLOCK ----
(async () => {
  try {
    console.log('SUPABASE_URL:', supabaseUrl);

    const { data, error } = await supabase.rpc('app_debug_whoami');
    console.log('✅ app_debug_whoami:', { data, error });
  } catch (e) {
    console.log('❌ debug failed', e);
  }
})();
