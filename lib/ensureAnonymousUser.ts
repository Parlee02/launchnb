import { supabase } from '@/supabaseClient';

export async function ensureAnonymousUser() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session?.user) {
    return sessionData.session.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data.user) {
    console.error('Anonymous auth error:', error);
    throw new Error('Failed to create anonymous user');
  }

  return data.user;
}
