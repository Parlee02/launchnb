import { supabase } from '@/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
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

const INCOMING_COLOR = 'rgba(88,86,214,0.85)';
const OUTGOING_COLOR = 'rgba(0,122,255,0.85)';

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
  waterbody_id: number | string;
  waterbody_name: string;
  waterbody_lat: number;
  waterbody_lon: number;
};

type Flow = {
  name: string;
  lat: number;
  lon: number;
  count: number;
  waterbody_id: number | string;
};

type Mode = 'incoming' | 'outgoing';

/* ---------------- SCREEN ---------------- */

export default function FlowMapScreen() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [mode, setMode] = useState<Mode>('incoming');
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);

  const [loadingLaunches, setLoadingLaunches] = useState(true);
  const [loadingFlows, setLoadingFlows] = useState(false);

  /* 🗺️ MAP TYPE */
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  /* ✅ Prevent UI overlay taps from also clearing MapView selection */
  const ignoreNextMapPressRef = useRef(false);

  /* ---------------- DATA LOADING ---------------- */

  const loadLaunches = async () => {
    setLoadingLaunches(true);

    const { data, error } = await supabase.from('launches').select('*');

    if (error) {
      console.error('loadLaunches error:', error);
    }

    setLaunches(data ?? []);
    setLoadingLaunches(false);
  };

  const loadFlowsForLaunch = async (launchName: string) => {
    setLoadingFlows(true);

    const { data, error } = await supabase
      .from('launch_flows_v2') // ✅ USE THE VIEW, NOT launch_flows_old
      .select('*')
      .eq('boat_launch', launchName.trim());

    if (error) {
      console.error('loadFlows error:', error);
    }

    setRows((data as MovementRow[]) ?? []);
    setLoadingFlows(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadLaunches();
    }, [])
  );

  /* ---------------- FLOW PROCESSING ---------------- */

  const filteredRows = useMemo(() => {
    if (!selectedLaunch) return [];

    const modeFiltered = rows.filter(r =>
      mode === 'incoming'
        ? r.movement_type === 'previous'
        : r.movement_type === 'next'
    );

    // ✅ drop rows with bad coords (prevents “invisible” polylines)
    return modeFiltered.filter(r => {
      const lat = Number(r.waterbody_lat);
      const lon = Number(r.waterbody_lon);
      return Number.isFinite(lat) && Number.isFinite(lon);
    });
  }, [rows, selectedLaunch, mode]);

  const flows: Flow[] = useMemo(() => {
    const map = new Map<string, Flow>();

    filteredRows.forEach(r => {
      // ✅ collision-safe key (id + coords)
      const key = `${String(r.waterbody_id)}-${Number(r.waterbody_lat)}-${Number(
        r.waterbody_lon
      )}`;

      if (!map.has(key)) {
        map.set(key, {
          waterbody_id: r.waterbody_id,
          name: r.waterbody_name,
          lat: Number(r.waterbody_lat),
          lon: Number(r.waterbody_lon),
          count: 1,
        });
      } else {
        map.get(key)!.count += 1;
      }
    });

    return Array.from(map.values());
  }, [filteredRows]);

  /* ---------------- GUARDS ---------------- */

  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text>Movement map available on mobile.</Text>
      </View>
    );
  }

  if (loadingLaunches) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading launches…</Text>
      </View>
    );
  }

  const activeColor = mode === 'incoming' ? INCOMING_COLOR : OUTGOING_COLOR;

  /* ---------------- RENDER ---------------- */

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
          // ✅ don’t clear when user taps overlays
          if (ignoreNextMapPressRef.current) {
            ignoreNextMapPressRef.current = false;
            return;
          }

          setSelectedLaunch(null);
          setSelectedFlow(null);
          setRows([]);
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
                loadFlowsForLaunch(l.Name);
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
          flows.map(f => {
            const endPoint = {
              latitude: Number(f.lat),
              longitude: Number(f.lon),
            };

            // ✅ CRITICAL: include mode in keys to force remount
            // react-native-maps can keep stale polylines otherwise
            const renderKey = `${mode}-${String(f.waterbody_id)}-${endPoint.latitude}-${endPoint.longitude}`;

            return (
              <View key={renderKey}>
                <Polyline
                  key={`poly-${renderKey}`}
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
                  key={`mk-${renderKey}`}
                  coordinate={endPoint}
                  onPress={e => {
                    e.stopPropagation();
                    setSelectedFlow(f);
                  }}
                >
                  <View style={[styles.countBubble, { borderColor: activeColor }]}>
                    <Text style={[styles.countText, { color: activeColor }]}>
                      {f.count}
                    </Text>
                  </View>
                </Marker>
              </View>
            );
          })}
      </MapView>

      {/* ℹ️ FLOATING HINT */}
      <View style={styles.floatingHint}>
        <Text style={styles.hintText}>
          Tap a launch to view incoming or outgoing boat movements
        </Text>
      </View>

      {/* ⏳ FLOW LOADING PILL */}
      {loadingFlows && selectedLaunch && (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>Loading movements…</Text>
        </View>
      )}

      {/* 🛰️ MAP TYPE TOGGLE */}
      <View style={styles.mapToggle}>
        <Pressable
          onPress={() => {
            ignoreNextMapPressRef.current = true;
            setMapType(prev => (prev === 'standard' ? 'satellite' : 'standard'));
          }}
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
            ignoreNextMapPressRef.current = true;
            setMode('incoming');
            setSelectedFlow(null);
          }}
        />
        <ToggleButton
          label="Outgoing"
          active={mode === 'outgoing'}
          onPress={() => {
            ignoreNextMapPressRef.current = true;
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
            {selectedFlow.count} boat{selectedFlow.count > 1 ? 's' : ''}
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

  floatingHint: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 4,
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
  },

  loadingPill: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    elevation: 6,
  },
  loadingText: {
    fontSize: 12,
  },

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
  left: 16,          // 👈 push to the left
  right: 72,         // 👈 leave space so it doesn’t hit the edge
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
