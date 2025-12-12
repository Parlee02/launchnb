import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../supabaseClient';

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

  useEffect(() => {
    fetchLaunches();
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

  const filteredLaunches = useMemo(() => {
    if (!search) return launches;
    return launches.filter(l =>
      l.Name.toLowerCase().includes(search.toLowerCase())
    );
  }, [launches, search]);

  // Web fallback (react-native-maps does not render on web)
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

        {loading && <ActivityIndicator size="large" />}

        {filteredLaunches.map(launch => (
          <Text key={launch.id} style={styles.listItem}>
            {launch.Name}
          </Text>
        ))}
      </View>
    );
  }

  // Native iOS map
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
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
  muted: {
    color: '#666',
  },
  error: {
    color: '#c00',
    fontWeight: '600',
  },
  webContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
    marginBottom: 12,
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
