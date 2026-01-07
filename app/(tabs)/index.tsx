import { supabase } from '@/supabaseClient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { searchWaterbodies } from '../../lib/searchwaterbodies';

/* ---------------- TYPES ---------------- */

type Launch = {
  id: string;
  Name: string;
  Latitude: number;
  Longitude: number;
};

type SheetView = 'prompt' | 'checkin' | 'province-prev' | 'province-next';

const PROVINCES = [
  'New Brunswick',
  'Nova Scotia',
  'Prince Edward Island',
  'Quebec',
  'Ontario',
  'Maine',
];

/* ---------------- HELPERS ---------------- */

function toNumber(v: any): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Normalizes ANY Supabase row into Launch shape.
 * Handles:
 * - Name vs name
 * - Latitude/Longitude vs latitude/longitude
 * - id vs ID vs launch_id-ish fallback
 * - numbers or numeric strings
 */
function normalizeLaunchRow(row: any, index: number): Launch | null {
  const name = (row?.Name ?? row?.name ?? row?.launch_name ?? '').toString().trim();

  const lat =
    toNumber(row?.Latitude) ??
    toNumber(row?.latitude) ??
    toNumber(row?.Lat) ??
    toNumber(row?.lat);

  const lng =
    toNumber(row?.Longitude) ??
    toNumber(row?.longitude) ??
    toNumber(row?.Lng) ??
    toNumber(row?.lng) ??
    toNumber(row?.Long) ??
    toNumber(row?.long);

  // If coords aren’t valid, we cannot render a marker — drop it.
  if (lat == null || lng == null) return null;

  // Sanity bounds (prevents weird rows from breaking marker rendering)
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  // Ensure stable, unique id even if table has null/duplicate ids
  const rawId = row?.id ?? row?.ID ?? row?.launch_id ?? row?.uuid;
  const id = (rawId != null && String(rawId).trim().length > 0)
    ? String(rawId)
    : `row-${index}-${name}-${lat}-${lng}`;

  return {
    id,
    Name: name.length ? name : `Unnamed launch (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    Latitude: lat,
    Longitude: lng,
  };
}

/* ---------------- SCREEN ---------------- */

export default function LaunchesScreen() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [view, setView] = useState<SheetView>('prompt');

  /* 🗺️ MAP TYPE */
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  /* 🔍 LAUNCH SEARCH */
  const [launchSearch, setLaunchSearch] = useState('');
  const [showLaunchDropdown, setShowLaunchDropdown] = useState(false);

  const mapRef = useRef<MapView>(null);

  /* Previous trip */
  const [prevProvince, setPrevProvince] = useState('New Brunswick');
  const [prevQuery, setPrevQuery] = useState('');
  const [prevResults, setPrevResults] = useState<any[]>([]);
  const [prevWaterbody, setPrevWaterbody] = useState<string | null>(null);

  /* Next trip */
  const [nextProvince, setNextProvince] = useState('New Brunswick');
  const [nextQuery, setNextQuery] = useState('');
  const [nextResults, setNextResults] = useState<any[]>([]);
  const [nextWaterbody, setNextWaterbody] = useState<string | null>(null);

  const canSubmit = !!prevWaterbody && !!nextWaterbody;

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase.from('launches').select('*');

      if (error) {
        console.log('launches load error', error);
        setLaunches([]);
        setLoading(false);
        return;
      }

      const raw = Array.isArray(data) ? data : [];
      const normalized: Launch[] = [];

      for (let i = 0; i < raw.length; i++) {
        const n = normalizeLaunchRow(raw[i], i);
        if (n) normalized.push(n);
      }

      // Helpful debug (you can delete later)
      console.log(
        `launches loaded: raw=${raw.length} normalized=${normalized.length} dropped=${raw.length - normalized.length}`
      );

      setLaunches(normalized);
      setLoading(false);
    };

    load();
  }, []);

  /* 🔍 Filter launches for markers + dropdown */
  const filteredLaunches = useMemo(() => {
    const q = launchSearch.trim().toLowerCase();
    if (!q) return launches;
    return launches.filter(l => (l.Name ?? '').toLowerCase().includes(q));
  }, [launches, launchSearch]);

  const topLaunchMatches = useMemo(() => {
    if (!launchSearch.trim()) return [];
    return filteredLaunches.slice(0, 8);
  }, [filteredLaunches, launchSearch]);

  /* Search previous */
  useEffect(() => {
    if (!prevQuery || prevWaterbody) return;
    const t = setTimeout(async () => {
      setPrevResults(await searchWaterbodies(prevQuery, prevProvince));
    }, 250);
    return () => clearTimeout(t);
  }, [prevQuery, prevProvince, prevWaterbody]);

  /* Search next */
  useEffect(() => {
    if (!nextQuery || nextWaterbody) return;
    const t = setTimeout(async () => {
      setNextResults(await searchWaterbodies(nextQuery, nextProvince));
    }, 250);
    return () => clearTimeout(t);
  }, [nextQuery, nextProvince, nextWaterbody]);

  const closeAll = () => {
    setSelectedLaunch(null);
    setView('prompt');
    setPrevWaterbody(null);
    setNextWaterbody(null);
    setPrevQuery('');
    setNextQuery('');
    setPrevResults([]);
    setNextResults([]);
    setLaunchSearch('');
    setShowLaunchDropdown(false);
  };

 const selectLaunchFromSearch = (l: Launch) => {
  Keyboard.dismiss();
  setShowLaunchDropdown(false);

  setLaunchSearch(''); // ✅ IMPORTANT
  setSelectedLaunch(l);
  setView('prompt');

  mapRef.current?.animateToRegion(
    {
      latitude: l.Latitude,
      longitude: l.Longitude,
      latitudeDelta: 0.10,
      longitudeDelta: 0.10,
    },
    350
  );
};

  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text>Launch map available on iOS</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const markers = launches;

  return (
    <View style={{ flex: 1 }}>
      {/* 🔍 LAUNCH SEARCH BAR (OVERLAY) */}
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

        {/* Dropdown results */}
        {showLaunchDropdown && topLaunchMatches.length > 0 && (
          <View style={styles.launchDropdown}>
            {topLaunchMatches.map(item => (
              <Pressable
                key={item.id}
                style={styles.launchDropdownItem}
                onPress={() => selectLaunchFromSearch(item)}
              >
                <Text style={styles.launchDropdownText}>{item.Name}</Text>
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
          latitudeDelta: 3,
          longitudeDelta: 3,
        }}
        onPress={() => {
          setShowLaunchDropdown(false);
          Keyboard.dismiss();
        }}
      >
        {markers.map(l => (
          <Marker
            key={l.id}
            coordinate={{ latitude: l.Latitude, longitude: l.Longitude }}
            title={l.Name}
            onPress={() => {
              setSelectedLaunch(l);
              setView('prompt');
            }}
          />
        ))}
      </MapView>

      {/* ℹ️ FLOATING HINT */}
      <View style={styles.floatingHint}>
        <Text style={styles.hintText}>Tap a boat launch to register your visit</Text>
      </View>

      {/* 🛰️ MAP TYPE TOGGLE */}
      <View style={styles.mapToggle}>
        <Pressable
          onPress={() =>
            setMapType(prev => (prev === 'standard' ? 'satellite' : 'standard'))
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

      {/* MODAL */}
      <Modal visible={!!selectedLaunch} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.grabber} />

            <ScrollView contentContainerStyle={styles.modal}>
              {view === 'prompt' && (
                <>
                  <Text style={styles.modalTitle}>{selectedLaunch?.Name}</Text>

                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => setView('checkin')}
                  >
                    <Text style={styles.primaryText}>Check in at this launch</Text>
                  </Pressable>

                  <Pressable style={styles.cancel} onPress={closeAll}>
                    <Text>Cancel</Text>
                  </Pressable>
                </>
              )}

              {view === 'checkin' && (
                <>
                  <Text style={styles.modalTitle}>Trip details</Text>

                  {/* LAST TRIP */}
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Last trip</Text>

                    <Pressable
                      style={styles.selector}
                      onPress={() => setView('province-prev')}
                    >
                      <Text style={styles.selectorLabel}>Province</Text>
                      <Text style={styles.selectorValue}>{prevProvince}</Text>
                    </Pressable>

                    {prevWaterbody ? (
                      <View style={styles.selectedRow}>
                        <Text style={styles.selectedText}>{prevWaterbody}</Text>
                        <Pressable
                          onPress={() => {
                            setPrevWaterbody(null);
                            setPrevQuery('');
                          }}
                        >
                          <Text style={styles.changeText}>Change</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          placeholder="Search waterbody"
                          value={prevQuery}
                          onChangeText={setPrevQuery}
                          style={styles.input}
                          autoCorrect={false}
                          autoCapitalize="none"
                        />
                        <FlatList
                          data={prevResults}
                          scrollEnabled={false}
                          keyExtractor={(item, i) => `prev-${i}`}
                          renderItem={({ item }) => (
                            <Pressable
                              style={styles.resultItem}
                              onPress={() => {
                                setPrevWaterbody(item.search_name);
                                setPrevResults([]);
                              }}
                            >
                              <Text>{item.search_name}</Text>
                            </Pressable>
                          )}
                        />
                      </>
                    )}
                  </View>

                  {/* NEXT TRIP */}
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Next planned trip</Text>

                    <Pressable
                      style={styles.selector}
                      onPress={() => setView('province-next')}
                    >
                      <Text style={styles.selectorLabel}>Province</Text>
                      <Text style={styles.selectorValue}>{nextProvince}</Text>
                    </Pressable>

                    {nextWaterbody ? (
                      <View style={styles.selectedRow}>
                        <Text style={styles.selectedText}>{nextWaterbody}</Text>
                        <Pressable
                          onPress={() => {
                            setNextWaterbody(null);
                            setNextQuery('');
                          }}
                        >
                          <Text style={styles.changeText}>Change</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <Pressable
                          style={styles.undecidedButton}
                          onPress={() => setNextWaterbody("Haven’t decided yet")}
                        >
                          <Text style={styles.undecidedText}>Haven’t decided yet</Text>
                        </Pressable>

                        <TextInput
                          placeholder="Search waterbody"
                          value={nextQuery}
                          onChangeText={setNextQuery}
                          style={styles.input}
                          autoCorrect={false}
                          autoCapitalize="none"
                        />
                        <FlatList
                          data={nextResults}
                          scrollEnabled={false}
                          keyExtractor={(item, i) => `next-${i}`}
                          renderItem={({ item }) => (
                            <Pressable
                              style={styles.resultItem}
                              onPress={() => {
                                setNextWaterbody(item.search_name);
                                setNextResults([]);
                              }}
                            >
                              <Text>{item.search_name}</Text>
                            </Pressable>
                          )}
                        />
                      </>
                    )}
                  </View>

                  <Pressable
                    disabled={!canSubmit}
                    style={[
                      styles.primaryButton,
                      !canSubmit && styles.disabledButton,
                    ]}
                    onPress={async () => {
                      await supabase.from('launch_checkins').insert({
                        launch_id: selectedLaunch?.id,
                        launch_name: selectedLaunch?.Name,
                        prev_province: prevProvince,
                        prev_waterbody: prevWaterbody,
                        next_province: nextProvince,
                        next_waterbody: nextWaterbody,
                      });
                      closeAll();
                    }}
                  >
                    <Text style={styles.primaryText}>Submit check-in</Text>
                  </Pressable>

                  <Pressable style={styles.cancel} onPress={closeAll}>
                    <Text>Cancel</Text>
                  </Pressable>
                </>
              )}

              {(view === 'province-prev' || view === 'province-next') && (
                <>
                  <Text style={styles.modalTitle}>Select province</Text>

                  {PROVINCES.map(p => (
                    <Pressable
                      key={p}
                      style={styles.pickerItem}
                      onPress={() => {
                        view === 'province-prev'
                          ? setPrevProvince(p)
                          : setNextProvince(p);
                        setView('checkin');
                      }}
                    >
                      <Text>{p}</Text>
                    </Pressable>
                  ))}

                  <Pressable
                    style={styles.cancel}
                    onPress={() => setView('checkin')}
                  >
                    <Text>Cancel</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* 🔍 Launch search */
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
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
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
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
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

  /* ℹ️ Floating hint */
  floatingHint: {
    position: 'absolute',
    top: 76,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E7E7EA',
  },
  hintText: {
    fontSize: 12.5,
    color: '#222',
    textAlign: 'center',
    fontWeight: '600',
  },

  mapToggle: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    zIndex: 20,
  },
  mapToggleButton: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 7,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mapToggleImage: {
    width: '100%',
    height: '100%',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'flex-end',
  },
  modalSafe: { maxHeight: '90%' },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ccc',
    marginBottom: 8,
  },
  modal: {
    backgroundColor: '#F2F2F7',
    padding: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },

  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },

  selector: {
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 8,
  },
  selectorLabel: { fontSize: 12, color: '#666' },
  selectorValue: { fontWeight: '700' },

  selectedRow: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedText: { fontWeight: '700' },
  changeText: { color: '#007AFF', fontWeight: '700' },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#fff',
  },

  resultItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  undecidedButton: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    alignItems: 'center',
  },
  undecidedText: { fontWeight: '700' },

  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryText: { color: 'white', fontWeight: '800' },
  disabledButton: { opacity: 0.4 },

  cancel: {
    alignItems: 'center',
    padding: 14,
  },

  pickerItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
