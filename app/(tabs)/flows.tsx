import { supabase } from '@/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

/* ---------------- COLORS ---------------- */

const INCOMING_COLOR = 'rgba(88,86,214,0.85)'; // 🟣 muted purple
const OUTGOING_COLOR = 'rgba(0,122,255,0.85)'; // 🔵 blue

/* ---------------- TYPES ---------------- */

type Launch = {
  id: string;
  Name: string;
  Latitude: number;
  Longitude: number;
};

type MovementRow = {
  boat_launch: string;
  movement_type: 'previous' | 'next';
  waterbody_name: string;
  waterbody_lat: number;
  waterbody_lon: number;
};

type Flow = {
  name: string;
  lat: number;
  lon: number;
  count: number;
};

type Mode = 'incoming' | 'outgoing';

/* ---------------- SCREEN ---------------- */

export default function FlowMapScreen() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [mode, setMode] = useState<Mode>('incoming');
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);

  /* 🗺️ MAP TYPE */
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  const loadData = async () => {
    setLoading(true);

    const { data: launchData, error: launchError } = await supabase
      .from('launches')
      .select('*');

    const { data: movementData, error: movementError } = await supabase
      .from('boater_movements')
      .select('*');

    if (launchError) console.error(launchError);
    if (movementError) console.error(movementError);

    setLaunches(launchData ?? []);
    setRows(movementData ?? []);
    setLoading(false);
  };

  // ✅ refresh when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const filteredRows = useMemo(() => {
    if (!selectedLaunch) return [];

    return rows.filter(
      r =>
        r.boat_launch === selectedLaunch.Name &&
        (mode === 'incoming'
          ? r.movement_type === 'previous'
          : r.movement_type === 'next')
    );
  }, [rows, selectedLaunch, mode]);

  const flows: Flow[] = useMemo(() => {
    const map = new Map<string, Flow>();

    filteredRows.forEach(r => {
      if (!map.has(r.waterbody_name)) {
        map.set(r.waterbody_name, {
          name: r.waterbody_name,
          lat: r.waterbody_lat,
          lon: r.waterbody_lon,
          count: 1,
        });
      } else {
        map.get(r.waterbody_name)!.count += 1;
      }
    });

    return Array.from(map.values());
  }, [filteredRows]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text>Movement map available on mobile.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading movement data…</Text>
      </View>
    );
  }

  const activeColor =
    mode === 'incoming' ? INCOMING_COLOR : OUTGOING_COLOR;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapType={mapType}
        initialRegion={{
          latitude: 46,
          longitude: -66.8,
          latitudeDelta: 4,
          longitudeDelta: 4,
        }}
        onPress={() => {
          setSelectedLaunch(null);
          setSelectedFlow(null);
        }}
      >
        {/* ALL LAUNCHES */}
        {!selectedLaunch &&
          launches.map(l => (
            <Marker
              key={l.id}
              coordinate={{
                latitude: l.Latitude,
                longitude: l.Longitude,
              }}
              pinColor="red"
              title={l.Name}
              onPress={e => {
                e.stopPropagation();
                setSelectedLaunch(l);
                setSelectedFlow(null);
              }}
            />
          ))}

        {/* SELECTED LAUNCH */}
        {selectedLaunch && (
          <Marker
            coordinate={{
              latitude: selectedLaunch.Latitude,
              longitude: selectedLaunch.Longitude,
            }}
            pinColor="red"
            title={selectedLaunch.Name}
            onPress={e => e.stopPropagation()}
          />
        )}

        {/* FLOWS */}
        {selectedLaunch &&
          flows.map((f, i) => {
            const endPoint = {
              latitude: f.lat,
              longitude: f.lon,
            };

            return (
              <View key={i}>
                <Polyline
                  coordinates={
                    mode === 'incoming'
                      ? [
                          endPoint,
                          {
                            latitude: selectedLaunch.Latitude,
                            longitude: selectedLaunch.Longitude,
                          },
                        ]
                      : [
                          {
                            latitude: selectedLaunch.Latitude,
                            longitude: selectedLaunch.Longitude,
                          },
                          endPoint,
                        ]
                  }
                  strokeColor={activeColor}
                  strokeWidth={3}
                  tappable
                  onPress={e => {
                    e.stopPropagation();
                    setSelectedFlow(f);
                  }}
                />

                <Marker
                  coordinate={endPoint}
                  onPress={e => {
                    e.stopPropagation();
                    setSelectedFlow(f);
                  }}
                >
                  <View
                    style={[
                      styles.countBubble,
                      { borderColor: activeColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        { color: activeColor },
                      ]}
                    >
                      {f.count}
                    </Text>
                  </View>
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

      {/* MODE TOGGLE */}
      <View style={styles.toggleOverlay}>
        <ToggleButton
          label="Incoming"
          active={mode === 'incoming'}
          onPress={() => {
            setMode('incoming');
            setSelectedFlow(null);
          }}
        />
        <ToggleButton
          label="Outgoing"
          active={mode === 'outgoing'}
          onPress={() => {
            setMode('outgoing');
            setSelectedFlow(null);
          }}
        />
      </View>

      {/* INFO PANEL */}
      {selectedFlow && selectedLaunch && (
        <View style={styles.infoOverlay}>
          <Text style={styles.infoTitle}>
            {mode === 'incoming'
              ? `Incoming from ${selectedFlow.name}`
              : `Outgoing to ${selectedFlow.name}`}
          </Text>
          <Text style={styles.infoSub}>
            {selectedFlow.count} boat
            {selectedFlow.count > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ---------------- TOGGLE BUTTON ---------------- */

function ToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.toggleButton, active && styles.toggleActive]}
    >
      <Text style={[styles.toggleText, active && { color: '#fff' }]}>
        {label}
      </Text>
    </Pressable>
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

  toggleOverlay: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 4,
    gap: 6,
    elevation: 6,
    zIndex: 20,
  },

  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#eee',
  },

  toggleActive: {
    backgroundColor: '#007aff',
  },

  toggleText: {
    fontWeight: '600',
  },

  infoOverlay: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 8,
  },

  infoTitle: {
    fontWeight: '600',
    fontSize: 14,
  },

  infoSub: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },

  countBubble: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    minWidth: 22,
    alignItems: 'center',
  },

  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
