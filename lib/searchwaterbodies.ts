import { supabase } from '@/supabaseClient';

/**
 * Province-scoped, accent-insensitive waterbody search
 */
export async function searchWaterbodies(
  query: string,
  province: string,
  limit = 10
) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  // Normalize query (lowercase + remove accents)
  const normalizedQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const { data, error } = await supabase
    .from('waterbody_search')
    .select('search_name')
    .eq('region', province)              // 🔒 PROVINCE FILTER
    .ilike('search_name_norm', `%${normalizedQuery}%`)
    .limit(limit);

  if (error) {
    console.error('searchWaterbodies error:', error.message);
    return [];
  }

  return data ?? [];
}
