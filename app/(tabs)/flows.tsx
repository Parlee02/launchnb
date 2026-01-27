import { supabase } from '@/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

/* ---------------- COLORS ---------------- */

const INCOMING_COLOR = 'rgba(88,86,214,0.85)';
const OUTGOING_COLOR = 'rgba(0,122,255,0.85)';

/* ---------------- TYPES ---------------- */

type Launch = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  has_movement: boolean;
  movement_count: number;
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

  /* 🔍 LAUNCH SEARCH */
  const [launchSearch, setLaunchSearch] = useState('');
  const [showLaunchDropdown, setShowLaunchDropdown] = useState(false);

  /* 🗺️ MAP TYPE */
  const [mapType, setMapType] =
    useState<'standard' | 'satellite'>('standard');

  /* ✅ Prevent UI overlay taps from also clearing MapView selection */
  const ignoreNextMapPressRef = useRef(false);
  const mapRef = useRef<MapView>(null);
  const activeLaunchRef = useRef<string | null>(null);

  /* ---------------- DATA LOADING ---------------- */

const loadLaunches = async () => {
  setLoadingLaunches(true);

  const { data, error } = await supabase
  .from('launches_with_activity_real')
    .select('*');

  if (error) {
    console.error('loadLaunches error:', error);
  }

  setLaunches(data ?? []);
  setLoadingLaunches(false);
};

const loadFlowsForLaunch = async (launchName: string) => {
  setLoadingFlows(true);
  activeLaunchRef.current = launchName;

  const { data, error } = await supabase
    .from('launch_flows_v2')
    .select('*')
    .eq('boat_launch', launchName.trim());

  if (activeLaunchRef.current !== launchName) return;

  if (error) {
    console.error('loadFlows error:', error);
    setRows([]);
  } else {
    setRows((data as MovementRow[]) ?? []);
  }

  setLoadingFlows(false);
};


useFocusEffect(
  useCallback(() => {
    loadLaunches();
  }, [])
);

useEffect(() => {
  if (!selectedLaunch) return;
  const updated = launches.find(l => l.id === selectedLaunch.id);
  if (updated) setSelectedLaunch(updated);
}, [launches, selectedLaunch?.id]);


  /* ---------------- SEARCH LOGIC ---------------- */

  const filteredLaunches = useMemo(() => {
    const q = launchSearch.trim().toLowerCase();
    if (!q) return [];

  return launches.filter(l => l.name.toLowerCase().includes(q));
  }, [launches, launchSearch]);

  const topLaunchMatches = filteredLaunches.slice(0, 8);
const selectLaunchFromSearch = (launch: Launch) => {
  Keyboard.dismiss();
  setShowLaunchDropdown(false);
  setLaunchSearch('');

  ignoreNextMapPressRef.current = true;

  // 🔑 FORCE OLD MARKER TO UNMOUNT
  setSelectedLaunch(null);
  setSelectedFlow(null);
  setRows([]);

  requestAnimationFrame(() => {
    setSelectedLaunch(launch);
  loadFlowsForLaunch(launch.name);


    mapRef.current?.animateToRegion(
      {
        latitude: launch.latitude,
longitude: launch.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      },
      350
    );
  });
};


  /* ---------------- FLOW PROCESSING ---------------- */

  const filteredRows = useMemo(() => {
    if (!selectedLaunch) return [];

    const modeFiltered = rows.filter(r =>
      mode === 'incoming'
        ? r.movement_type === 'previous'
        : r.movement_type === 'next'
    );

    return modeFiltered.filter(r => {
      const lat = Number(r.waterbody_lat);
      const lon = Number(r.waterbody_lon);
      return Number.isFinite(lat) && Number.isFinite(lon);
    });
  }, [rows, selectedLaunch, mode]);

  const flows: Flow[] = useMemo(() => {
    const map = new Map<string, Flow>();

    filteredRows.forEach(r => {
      // ✅ FIX: was missing backticks
      const key = `${String(r.waterbody_id)}-${Number(
        r.waterbody_lat
      )}-${Number(r.waterbody_lon)}`;

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
      {/* 🔍 LAUNCH SEARCH BAR */}
      <View style={styles.launchSearchWrap}>
        <View style={styles.launchSearchRow}>
          <TextInput
            placeholder="Search boat launches…"
            value={launchSearch}
            onChangeText={t => {
              setLaunchSearch(t);
              setShowLaunchDropdown(true);
            }}
            onFocus={() => setShowLaunchDropdown(true)}
            style={styles.launchSearchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            placeholderTextColor="#7A7A7A"
          />

          {!!launchSearch.trim() && (
            <Pressable
              onPress={() => {
                setLaunchSearch('');
                setShowLaunchDropdown(false);
                Keyboard.dismiss();
              }}
              style={styles.clearBtn}
              hitSlop={10}
            >
              <Text style={styles.clearBtnText}>×</Text>
            </Pressable>
          )}
        </View>

        {showLaunchDropdown && topLaunchMatches.length > 0 && (
          <View style={styles.launchDropdown}>
            {topLaunchMatches.map(item => (
              <Pressable
                key={item.id}
                style={styles.launchDropdownItem}
                onPress={() => selectLaunchFromSearch(item)}
              >
                <Text style={styles.launchDropdownText}>{item.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {showLaunchDropdown &&
          !!launchSearch.trim() &&
          topLaunchMatches.length === 0 && (
            <View style={styles.launchDropdown}>
              <View style={styles.launchDropdownItem}>
                <Text style={styles.launchDropdownMuted}>No matches</Text>
              </View>
            </View>
          )}
      </View>

      {/* 🗺️ MAP */}
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        initialRegion={{
          latitude: 46,
          longitude: -66.8,
          latitudeDelta: 4,
          longitudeDelta: 4,
        }}
        onPress={() => {
          if (ignoreNextMapPressRef.current) {
            ignoreNextMapPressRef.current = false;
            return;
          }

          setSelectedLaunch(null);
          setSelectedFlow(null);
          setRows([]);
        }}
      >
        {!selectedLaunch &&
        launches.map(l => (
  <Marker
    key={l.id}
    coordinate={{
      latitude: l.latitude,
      longitude: l.longitude,
    }}
    pinColor={l.has_movement ? '#FF3B30' : '#C7C7CC'}
    title={l.name}
             onPress={e => {
  e.stopPropagation();

  // 🔑 FORCE OLD MARKER TO UNMOUNT
  setSelectedLaunch(null);
  setSelectedFlow(null);
  setRows([]);

  requestAnimationFrame(() => {
    setSelectedLaunch(l);
 loadFlowsForLaunch(l.name);
  });
}}
            />
          ))}

        {selectedLaunch && (
  <Marker
    coordinate={{
      latitude: selectedLaunch.latitude,
      longitude: selectedLaunch.longitude,
    }}
    pinColor={selectedLaunch.has_movement ? '#FF3B30' : '#C7C7CC'}
    title={selectedLaunch.name}
            onPress={e => e.stopPropagation()}
          />
        )}

        {selectedLaunch &&
          flows.map(f => {
            const endPoint = {
              latitude: Number(f.lat),
              longitude: Number(f.lon),
            };

            // ✅ FIX: was missing backticks
            const renderKey = `${mode}-${String(
              f.waterbody_id
            )}-${endPoint.latitude}-${endPoint.longitude}`;

            return (
              <View key={renderKey}>
                <Polyline
                  coordinates={
                    mode === 'incoming'
                      ? [
                          endPoint,
                          {
                           latitude: selectedLaunch.latitude,
longitude: selectedLaunch.longitude,
                          },
                        ]
                      : [
                          {
                            latitude: selectedLaunch.latitude,
longitude: selectedLaunch.longitude,
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
                    style={[styles.countBubble, { borderColor: activeColor }]}
                  >
                    <Text style={[styles.countText, { color: activeColor }]}>
                      {f.count}
                    </Text>
                  </View>
                </Marker>
              </View>
            );
          })}
      </MapView>


{/* 🗂️ MOVEMENT LEGEND */}
<View style={styles.movementLegend} pointerEvents="none">
  <View style={styles.movementLegendRow}>
    <View style={[styles.movementLegendDot, styles.movementLegendDotRed]} />
    <Text style={styles.movementLegendText}>Launch with movement</Text>
  </View>

  <View style={styles.movementLegendRow}>
    <View style={[styles.movementLegendDot, styles.movementLegendDotGrey]} />
    <Text style={styles.movementLegendText}>No recorded movement</Text>
  </View>
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

  /* 🔍 SEARCH */
  launchSearchWrap: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 50,
  },
  launchSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 16,
    padding: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E7E7EA',
  },
  launchSearchInput: {
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
  clearBtnText: {
    fontSize: 24,
    lineHeight: 24,
    color: '#333',
    marginTop: -1,
  },

  launchDropdown: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E7E7EA',
  },
  launchDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFF4',
  },
  launchDropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  launchDropdownMuted: {
    fontSize: 14,
    color: '#666',
  },

  loadingPill: {
    position: 'absolute',
    top: 64,
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
    top: 76,
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
    left: 16,
    right: 96,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 18,
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
movementLegend: {
  position: 'absolute',
  bottom: 24,
  left: 16,
  backgroundColor: '#fff',
  borderRadius: 14,
  paddingVertical: 10,
  paddingHorizontal: 12,
  elevation: 6,
  borderWidth: 1,
  borderColor: '#E7E7EA',
},
movementLegendRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 4,
},
movementLegendDot: {
  width: 14,
  height: 14,
  borderRadius: 7,
  marginRight: 8,
},
movementLegendDotRed: { backgroundColor: '#FF3B30' },
movementLegendDotGrey: { backgroundColor: '#C7C7CC' },
movementLegendText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#333',
},

});
