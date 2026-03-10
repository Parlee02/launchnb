import { supabase } from '@/supabaseClient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

type Launch = {
  id: string;
  Name: string;
  Latitude: number;
  Longitude: number;
};

export default function MapScreen() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🗺️ map type toggle
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchLaunches();
  }, []);

  const fetchLaunches = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.from('launches').select('*');

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLaunches(data ?? []);
    setLoading(false);
  };

  const filteredLaunches = useMemo(() => {
    if (!search) return launches;
    return launches.filter(l =>
      l.Name.toLowerCase().includes(search.toLowerCase())
    );
  }, [launches, search]);

  // 🌐 Web fallback
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.title}>Launch Map</Text>
        <Text style={styles.subtitle}>
          Map is available on mobile. Showing list instead.
        </Text>

        <TextInput
          placeholder="Search launches"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        {filteredLaunches.map(l => (
          <Text key={l.id} style={styles.listItem}>
            {l.Name}
          </Text>
        ))}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Loading launches…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error loading launches</Text>
        <Text style={styles.muted}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔍 Search */}
      <TextInput
        placeholder="Search launches"
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {/* 🗺️ Map */}
      <MapView
        style={styles.map}
        mapType={mapType}
       initialRegion={{
  latitude: 45.4,
  longitude: -63.5,
  latitudeDelta: 5,
  longitudeDelta: 5,
}}
      >
        {filteredLaunches.map(launch => (
          <Marker
            key={launch.id}
            coordinate={{
              latitude: launch.Latitude,
              longitude: launch.Longitude,
            }}
            title={launch.Name}
          />
        ))}
      </MapView>

      {/* 🛰️ Toggle */}
      <View style={styles.mapToggle}>
        <Pressable
          onPress={() =>
            setMapType(prev =>
              prev === 'standard' ? 'satellite' : 'standard'
            )
          }
          style={styles.mapToggleButton}
        >
          <Text style={styles.mapToggleText}>
            {mapType === 'standard' ? '🛰️' : '🗺️'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  search: {
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    elevation: 5,
    zIndex: 10,
  },

  mapToggle: {
    position: 'absolute',
    top: 120,
    right: 16,
    zIndex: 20,
  },

  mapToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },

  mapToggleText: {
    fontSize: 20,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  muted: { color: '#666' },
  error: { color: '#c00', fontWeight: '600' },

  webContainer: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#666', marginBottom: 12 },

  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
