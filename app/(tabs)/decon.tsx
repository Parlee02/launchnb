import { supabase } from '@/supabaseClient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Circle, Marker } from 'react-native-maps';

type DeconStation = {
  station_id: string;
  station_type: string;
  location_name: string;
  latitude: number;
  longitude: number;
  operational_status: string;
};

const DECON_RADIUS_METERS = 5000;

export default function DeconMapScreen() {
  const [stations, setStations] = useState<DeconStation[]>([]);
  const [loading, setLoading] = useState(true);

  /* 🗺️ MAP TYPE */
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    const { data, error } = await supabase
      .from('decon_stations')
      .select('*');

    if (error) {
      console.error(error.message);
      setLoading(false);
      return;
    }

    setStations(data ?? []);
    setLoading(false);
  };

  // 🚗 OPEN DIRECTIONS (APPLE / GOOGLE MAPS)
  const openDirections = (lat: number, lon: number) => {
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${lat},${lon}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

    Linking.openURL(url);
  };

  // 🌐 Web fallback
  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text>Decontamination map available on iOS</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading decontamination stations…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapType={mapType}
        initialRegion={{
          latitude: 46.0,
          longitude: -66.8,
          latitudeDelta: 3,
          longitudeDelta: 3,
        }}
      >
        {stations.map(station => (
          <View key={station.station_id}>
            {/* 🟦 SERVICE AREA */}
            <Circle
              center={{
                latitude: station.latitude,
                longitude: station.longitude,
              }}
              radius={DECON_RADIUS_METERS}
              strokeColor="rgba(0,122,255,0.9)"
              fillColor="rgba(0,122,255,0.25)"
              strokeWidth={2}
              zIndex={1}
            />

            {/* 🔵 PIN */}
            <Marker
              coordinate={{
                latitude: station.latitude,
                longitude: station.longitude,
              }}
              pinColor="blue"
              zIndex={10}
            >
              <Callout
                onPress={() =>
                  openDirections(
                    station.latitude,
                    station.longitude
                  )
                }
              >
                <View style={{ width: 220 }}>
                  <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                    {station.location_name}
                  </Text>
                  <Text>Type: {station.station_type}</Text>
                  <Text>Status: {station.operational_status}</Text>

                  <Text
                    style={{
                      marginTop: 10,
                      color: '#007aff',
                      fontWeight: '600',
                    }}
                  >
                    Directions →
                  </Text>
                </View>
              </Callout>
            </Marker>
          </View>
        ))}
      </MapView>

      {/* 🛰️ MAP TYPE TOGGLE */}
      <View style={styles.mapToggle}>
        <Pressable
          onPress={() =>
            setMapType(prev =>
              prev === 'standard' ? 'satellite' : 'standard'
            )
          }
          style={styles.mapToggleButton}
        >
          <Image
            source={
              mapType === 'standard'
                ? require('@/assets/imagesat.png')
                : require('@/assets/imagedef.png')
            }
            style={styles.mapToggleImage}
          />
        </Pressable>
      </View>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  /* 🛰️ Map toggle */
  mapToggle: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    zIndex: 30,
  },
  mapToggleButton: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mapToggleImage: {
    width: '100%',
    height: '100%',
  },
});
