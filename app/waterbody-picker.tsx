import { supabase } from '@/supabaseClient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { emitWaterbodySelected } from '../lib/waterbodySelection';

/* ---------------- TYPES ---------------- */

type Waterbody = {
  id: number;
  search_name: string;
  region: string;
  latitude: number;
  longitude: number;
  name_count: number;
  search_name_norm?: string | null;
};

/* ---------------- SCREEN ---------------- */

export default function WaterbodyPickerScreen() {
  const params = useLocalSearchParams();

  const target = (params.target as 'prev' | 'next') ?? 'prev';
  const province = (params.province as string) ?? '';
  const key = (params.key as string) ?? '';
  const label = (params.label as string) ?? '';

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Waterbody[]>([]);

  const mapRef = useRef<MapView>(null);

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('waterbodies')
        .select(
          'id, search_name, region, latitude, longitude, name_count, search_name_norm'
        )
        .eq('region', province)
        .eq('search_name_norm', key);

      if (!mounted) return;

      if (!error && Array.isArray(data)) {
        setItems(data as Waterbody[]);
      }

      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [province, key]);

  /* ---------------- MAP REGION ---------------- */

  const initialRegion = useMemo(() => {
    if (!items.length) return null;
    return {
      latitude: items[0].latitude,
      longitude: items[0].longitude,
      latitudeDelta: 1.2,
      longitudeDelta: 1.2,
    };
  }, [items]);

  useEffect(() => {
    if (items.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(
        items.map(i => ({
          latitude: i.latitude,
          longitude: i.longitude,
        })),
        {
          edgePadding: { top: 80, bottom: 80, left: 80, right: 80 },
          animated: true,
        }
      );
    }
  }, [items]);

  /* ---------------- STATES ---------------- */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading locations…</Text>
      </View>
    );
  }

  if (!initialRegion) {
    return (
      <View style={styles.center}>
        <Text>No locations found</Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={{ flex: 1 }}>
      {/* 🔝 SAFE HEADER */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.subtitle}>Select the correct location</Text>
        </View>
      </SafeAreaView>

      {/* 🗺️ MAP */}
      <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={initialRegion}>
        {items.map(w => (
          <Marker
            key={String(w.id)}
            coordinate={{
              latitude: w.latitude,
              longitude: w.longitude,
            }}
            title={w.search_name}
            pinColor="#007AFF"
            onPress={() => {
              emitWaterbodySelected({ target, waterbody: w });
              router.back();
            }}
          />
        ))}
      </MapView>

      {/* 🔻 SAFE FOOTER */}
      <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  /* Header */
  headerSafe: {
    backgroundColor: 'white',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontWeight: '600',
  },

  /* Footer */
  footerSafe: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  cancelBtn: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },

  /* Generic button */
  btn: {
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: '800',
  },
});
