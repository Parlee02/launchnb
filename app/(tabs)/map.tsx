import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, {
  Callout,
  Circle,
  Marker,
} from 'react-native-maps';
import { supabase } from '../../supabaseClient';

type Launch = {
  id: string;
  Name: string;
  Latitude: number;
  Longitude: number;
};

type DeconStation = {
  station_id: string;
  station_type: string;
  location_name: string;
  latitude: number;
  longitude: number;
  operational_status: string;
};

// 🔧 EASY TO TUNE
const DECON_RADIUS_METERS = 5000;

export default function MapScreen() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [deconStations, setDeconStations] = useState<DeconStation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLaunches();
    fetchDeconStations();
  }, []);

  const fetchLaunches = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('launches')
      .select('*');

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLaunches(data ?? []);
    setLoading(false);
  };

  const fetchDeconStations = async () => {
    const { data, error } = await supabase
      .from('decon_stations')
      .select('*');

    if (error) {
      console.error('Error loading decon stations:', error.message);
      return;
    }

    setDeconStations(data ?? []);
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
          Map is available on iOS. Showing list instead.
        </Text>

        <TextInput
          placeholder="Search launches"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        {filteredLaunches.map(launch => (
          <Text key={launch.id} style={styles.listItem}>
            {launch.Name}
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
      <TextInput
        placeholder="Search launches"
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 46.0,
          longitude: -66.8,
          latitudeDelta: 3,
          longitudeDelta: 3,
        }}
      >
        {/* 🚤 Boat launches (markers, auto-decluttered) */}
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

        {/* 🧼 Decon stations = POLYGON + POINT */}
        {deconStations.map(station => (
          <View key={station.station_id}>
            {/* POLYGON / SERVICE AREA (always visible) */}
            <Circle
              center={{
                latitude: station.latitude,
                longitude: station.longitude,
              }}
              radius={DECON_RADIUS_METERS}
              strokeColor="rgba(0, 122, 255, 0.9)"
              fillColor="rgba(0, 122, 255, 0.25)"
              strokeWidth={2}
            />

            {/* POINT / EXACT LOCATION */}
            <Marker
              coordinate={{
                latitude: station.latitude,
                longitude: station.longitude,
              }}
              pinColor="blue"
            >
              <Callout>
                <View style={{ width: 220 }}>
                  <Text style={{ fontWeight: '600' }}>
                    {station.location_name}
                  </Text>
                  <Text>Type: {station.station_type}</Text>
                  <Text>Status: {station.operational_status}</Text>
                </View>
              </Callout>
            </Marker>
          </View>
        ))}
      </MapView>
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
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
