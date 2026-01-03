import { supabase } from '@/supabaseClient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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

type Launch = {
  id: string;
  Name: string;
  Latitude: number;
  Longitude: number;
};

const PROVINCES = [
  'New Brunswick',
  'Nova Scotia',
  'Prince Edward Island',
  'Quebec',
  'Ontario',
  'Maine',
];

type SheetView = 'prompt' | 'checkin' | 'province-prev' | 'province-next';

export default function LaunchesScreen() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [view, setView] = useState<SheetView>('prompt');

  // Previous trip
  const [prevProvince, setPrevProvince] = useState('New Brunswick');
  const [prevQuery, setPrevQuery] = useState('');
  const [prevResults, setPrevResults] = useState<any[]>([]);
  const [prevWaterbody, setPrevWaterbody] = useState<string | null>(null);

  // Next trip
  const [nextProvince, setNextProvince] = useState('New Brunswick');
  const [nextQuery, setNextQuery] = useState('');
  const [nextResults, setNextResults] = useState<any[]>([]);
  const [nextWaterbody, setNextWaterbody] = useState<string | null>(null);

  const canSubmit = !!prevWaterbody && !!nextWaterbody;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('launches').select('*');
      setLaunches(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  // Search previous
  useEffect(() => {
    if (!prevQuery || prevWaterbody) return;
    const t = setTimeout(async () => {
      setPrevResults(await searchWaterbodies(prevQuery, prevProvince));
    }, 250);
    return () => clearTimeout(t);
  }, [prevQuery, prevProvince, prevWaterbody]);

  // Search next
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

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 46,
          longitude: -66.8,
          latitudeDelta: 3,
          longitudeDelta: 3,
        }}
      >
        {launches.map(l => (
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
                          onPress={() =>
                            setNextWaterbody('Haven’t decided yet')
                          }
                        >
                          <Text style={styles.undecidedText}>
                            Haven’t decided yet
                          </Text>
                        </Pressable>

                        <TextInput
                          placeholder="Search waterbody"
                          value={nextQuery}
                          onChangeText={setNextQuery}
                          style={styles.input}
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

                  {/* ✅ THIS IS THE IMPORTANT PART */}
                  <Pressable
                    disabled={!canSubmit}
                    style={[
                      styles.primaryButton,
                      !canSubmit && styles.disabledButton,
                    ]}
                    onPress={async () => {
                      const payload = {
                        launch_id: selectedLaunch?.id,
                        launch_name: selectedLaunch?.Name,
                        prev_province: prevProvince,
                        prev_waterbody: prevWaterbody,
                        next_province: nextProvince,
                        next_waterbody: nextWaterbody,
                      };

                      console.log('CHECK-IN PAYLOAD:', payload);

                      const { error } = await supabase
                        .from('launch_checkins')
                        .insert(payload);

                      if (error) {
                        console.error('CHECK-IN INSERT ERROR:', error);
                        return;
                      }

                      console.log('CHECK-IN INSERT SUCCESS');
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

                  <Pressable style={styles.cancel} onPress={() => setView('checkin')}>
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

const styles = StyleSheet.create({
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'flex-end',
  },
  modalSafe: { maxHeight: '90%' },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ccc',
    marginBottom: 8,
  },
  modal: {
    backgroundColor: '#F2F2F7',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },

  selector: {
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    marginBottom: 8,
  },
  selectorLabel: { fontSize: 12, color: '#666' },
  selectorValue: { fontWeight: '600' },

  selectedRow: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedText: { fontWeight: '600' },
  changeText: { color: '#007AFF', fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
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
    borderRadius: 10,
    alignItems: 'center',
  },
  undecidedText: { fontWeight: '600' },

  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryText: { color: 'white', fontWeight: '700' },
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
