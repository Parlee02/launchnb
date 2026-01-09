import { supabase } from '@/supabaseClient';

export type WaterbodyRow = {
  id: number;
  search_name: string;
  region: string;
  latitude: number;
  longitude: number;
  name_count: number;
  search_name_norm?: string | null;
};

/* ---------------- HELPERS ---------------- */

function norm(s: string) {
  return s.trim().toLowerCase();
}

/**
 * Deduplicate ONLY identical names
 * - Keeps Long Lake (Charlotte), (Kings), (York), etc.
 * - Removes true duplicates that appear multiple times
 */
function dedupeWaterbodies(rows: WaterbodyRow[]): WaterbodyRow[] {
  const seen = new Set<string>();
  const out: WaterbodyRow[] = [];

  for (const r of rows) {
    const key = (
      r.search_name_norm ??
      r.search_name
    )
      .trim()
      .toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    out.push(r);
  }

  return out;
}

/* ---------------- SEARCH ---------------- */

export async function searchWaterbodies(
  query: string,
  province: string
): Promise<WaterbodyRow[]> {
  const q = norm(query);
  if (!q) return [];

  /* PRIMARY QUERY (uses search_name_norm) */
  const { data, error } = await supabase
    .from('waterbodies')
    .select(
      `
      id,
      search_name,
      search_name_norm,
      region,
      latitude,
      longitude,
      name_count
      `
    )
    .eq('region', province)
    .ilike('search_name_norm', `%${q}%`)
    .limit(25);

  if (!error && Array.isArray(data)) {
    return dedupeWaterbodies(data as WaterbodyRow[]);
  }

  /* FALLBACK QUERY (in case search_name_norm is null) */
  const { data: data2, error: error2 } = await supabase
    .from('waterbodies')
    .select(
      `
      id,
      search_name,
      region,
      latitude,
      longitude,
      name_count
      `
    )
    .eq('region', province)
    .ilike('search_name', `%${query.trim()}%`)
    .limit(25);

  if (error2) {
    console.log('searchWaterbodies error', error2);
    return [];
  }

  return dedupeWaterbodies((data2 ?? []) as WaterbodyRow[]);
}
