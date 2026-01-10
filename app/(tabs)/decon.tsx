import { supabase } from '@/supabaseClient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Callout, Circle, Marker } from 'react-native-maps';

/* ---------------- TYPES ---------------- */

type DeconStation = {
  station_id: string;
  station_type: string;
  location_name: string;
  station_name: string;
  latitude: number;
  longitude: number;
  operational_status: string;
};

type Province = 'NB' | 'QC';

/* ---------------- CONSTANTS ---------------- */

const DECON_RADIUS_METERS = 5000;

/* ---------------- SCREEN ---------------- */

export default function DeconMapScreen() {
  const [stations, setStations] = useState<DeconStation[]>([]);
  const [loading, setLoading] = useState(true);

  /* 🔍 SEARCH (DROPDOWN ONLY) */
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  /* 🧭 PROVINCE */
  const [province, setProvince] = useState<Province>('NB');

  /* 🗺️ MAP */
  const [mapType, setMapType] =
    useState<'standard' | 'satellite'>('standard');
  const mapRef = useRef<MapView>(null);

  /* ---------------- DATA ---------------- */

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

  /* ---------------- MAP STATIONS (NO SEARCH FILTER) ---------------- */

  const mapStations = useMemo(() => {
    return stations.filter(s => {
      if (province === 'NB') return s.station_id?.startsWith('NB');
      if (province === 'QC') return s.station_id?.startsWith('STA');
      return true;
    });
  }, [stations, province]);

  /* ---------------- SEARCH RESULTS (DROPDOWN ONLY) ---------------- */

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return mapStations.filter(s =>
      (s.station_name ?? '').toLowerCase().includes(q)
    );
  }, [mapStations, searchQuery]);

  const topMatches = searchResults.slice(0, 8);

  const selectStation = (station: DeconStation) => {
    Keyboard.dismiss();
    setShowDropdown(false);
    setSearchQuery('');

    mapRef.current?.animateToRegion(
      {
        latitude: station.latitude,
        longitude: station.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      },
      350
    );
  };

  /* 🚗 DIRECTIONS */

  const openDirections = (lat: number, lon: number) => {
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${lat},${lon}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

    Linking.openURL(url);
  };

  /* ---------------- GUARDS ---------------- */

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

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.container}>
      {/* 🔍 SEARCH BAR */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search decon stations…"
            value={searchQuery}
            onChangeText={t => {
              setSearchQuery(t);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            placeholderTextColor="#7A7A7A"
          />

          {!!searchQuery && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setShowDropdown(false);
                Keyboard.dismiss();
              }}
              style={styles.clearBtn}
            >
              <Text style={styles.clearBtnText}>×</Text>
            </Pressable>
          )}
        </View>

        {showDropdown && topMatches.length > 0 && (
          <View style={styles.dropdown}>
            {topMatches.map(s => (
              <Pressable
                key={s.station_id}
                style={styles.dropdownItem}
                onPress={() => selectStation(s)}
              >
                <Text style={styles.dropdownText}>
                  {s.station_name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* 🧭 PROVINCE TOGGLE */}
      <View style={styles.provinceToggle}>
        {(['NB', 'QC'] as Province[]).map(p => (
          <Pressable
            key={p}
            onPress={() => {
              setProvince(p);
              setSearchQuery('');
              setShowDropdown(false);
            }}
            style={[
              styles.provinceBtn,
              province === p && styles.provinceBtnActive,
            ]}
          >
            <Text
              style={[
                styles.provinceText,
                province === p && styles.provinceTextActive,
              ]}
            >
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 🗺️ MAP */}
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        initialRegion={{
          latitude: 46,
          longitude: -66.8,
          latitudeDelta: 3,
          longitudeDelta: 3,
        }}
        onPress={() => {
          setShowDropdown(false);
          Keyboard.dismiss();
        }}
      >
        {mapStations.map(station => {
          const isQC = station.station_id.startsWith('STA');

          return (
            <View key={station.station_id}>
              <Circle
                center={{
                  latitude: station.latitude,
                  longitude: station.longitude,
                }}
                radius={DECON_RADIUS_METERS}
                strokeColor="rgba(0,122,255,0.6)"
                fillColor="rgba(0,122,255,0.18)"
                strokeWidth={2}
              />

              <Marker
                coordinate={{
                  latitude: station.latitude,
                  longitude: station.longitude,
                }}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={[styles.pin, isQC && styles.pinQC]}>
                  <View
                    style={[
                      styles.pinInner,
                      isQC && styles.pinInnerQC,
                    ]}
                  >
                    <Image
                      source={require('@/assets/decon.png')}
                      style={[
                        styles.pinImage,
                        isQC && styles.pinImageQC,
                      ]}
                    />
                  </View>
                </View>

                <Callout
                  onPress={() =>
                    openDirections(
                      station.latitude,
                      station.longitude
                    )
                  }
                >
                  <View style={{ width: 220 }}>
                    <Text style={{ fontWeight: '600' }}>
                      {station.station_name}
                    </Text>

                    {station.location_name &&
                      station.location_name !== station.station_name && (
                        <Text>{station.location_name}</Text>
                      )}

                    <Text>Type: {station.station_type}</Text>
                    <Text>Status: {station.operational_status}</Text>

                    <Text
                      style={{
                        marginTop: 8,
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
          );
        })}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },

  searchWrap: { position: 'absolute', top: 10, left: 12, right: 12, zIndex: 50 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 16,
    padding: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E7E7EA',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  clearBtn: {
    marginLeft: 10,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  clearBtnText: { fontSize: 24, marginTop: -1 },

  dropdown: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFF4',
  },
  dropdownText: { fontSize: 14, fontWeight: '600' },

  provinceToggle: {
    position: 'absolute',
    top: 76,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E7E7EA',
    zIndex: 40,
  },
  provinceBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
  },
  provinceBtnActive: { backgroundColor: '#007aff' },
  provinceText: { fontWeight: '600', color: '#333' },
  provinceTextActive: { color: '#fff' },

  pin: {
    width: 44,
    height: 44,
    backgroundColor: '#007AFF',
    borderRadius: 22,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 6,
  },
  pinInner: {
    width: 26,
    height: 26,
    backgroundColor: '#fff',
    borderRadius: 13,
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinImage: { width: 18, height: 18, resizeMode: 'contain' },

  pinQC: { width: 34, height: 34, borderRadius: 17 },
  pinInnerQC: { width: 20, height: 20, borderRadius: 10 },
  pinImageQC: { width: 14, height: 14, resizeMode: 'contain' },

  mapToggle: { position: 'absolute', bottom: 24, right: 16 },
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
  mapToggleImage: { width: '100%', height: '100%' },
});
