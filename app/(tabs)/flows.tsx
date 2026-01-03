import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { supabase } from '../../supabaseClient';

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

export default function FlowMapScreen() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [mode, setMode] = useState<Mode>('incoming');
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: launchData } = await supabase
      .from('launches')
      .select('*');

    const { data: movementData } = await supabase
      .from('boater_movements')
      .select('*');

    setLaunches(launchData ?? []);
    setRows(movementData ?? []);
    setLoading(false);
  };

  const filteredRows = useMemo(() => {
    if (!selectedLaunch) return [];

    return rows.filter(r =>
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

  return (
    <View style={styles.container}>
      {/* MODE TOGGLE */}
      <View style={styles.toggleRow}>
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

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 46,
          longitude: -66.8,
          latitudeDelta: 4,
          longitudeDelta: 4,
        }}
        onPress={() => {
          // ✅ only fires for empty map presses
          setSelectedLaunch(null);
          setSelectedFlow(null);
        }}
      >
        {/* ALL LAUNCH MARKERS */}
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
              onPress={(e) => {
                e.stopPropagation(); // 🔑 THIS FIXES IT
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
            onPress={(e) => {
              e.stopPropagation();
            }}
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
                  strokeColor="rgba(0,122,255,0.8)"
                  strokeWidth={3}
                  tappable
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedFlow(f);
                  }}
                />

                <Marker
                  coordinate={endPoint}
                  anchor={{ x: 0.5, y: 0.5 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedFlow(f);
                  }}
                >
                  <View style={styles.countBubble}>
                    <Text style={styles.countText}>{f.count}</Text>
                  </View>
                </Marker>
              </View>
            );
          })}
      </MapView>

      {/* INFO OVERLAY */}
      {selectedFlow && selectedLaunch && (
        <View style={styles.infoOverlay}>
          <Text style={styles.infoText}>
            {mode === 'incoming'
              ? `Incoming from ${selectedFlow.name}`
              : `Outgoing to ${selectedFlow.name}`}
          </Text>
          <Text style={styles.infoSubtext}>
            {selectedFlow.count} boat
            {selectedFlow.count > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {!selectedLaunch && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            Tap a boat launch to view movements
          </Text>
        </View>
      )}
    </View>
  );
}

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
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    gap: 8,
    backgroundColor: '#fff',
    zIndex: 10,
  },

  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#eee',
  },

  toggleActive: {
    backgroundColor: '#007aff',
  },

  toggleText: {
    fontWeight: '600',
  },

  overlay: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8,
  },

  overlayText: {
    color: '#fff',
    fontSize: 14,
  },

  infoOverlay: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },

  infoText: {
    fontWeight: '600',
    fontSize: 14,
  },

  infoSubtext: {
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
    borderColor: '#007aff',
    minWidth: 22,
    alignItems: 'center',
  },

  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007aff',
  },
});
