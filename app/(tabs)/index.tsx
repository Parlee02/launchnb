import { ensureAnonymousUser } from '@/lib/ensureAnonymousUser';
import { supabase } from '@/supabaseClient';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard, Linking, Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { searchWaterbodies } from '../../lib/searchwaterbodies';
import { onWaterbodySelected } from '../../lib/waterbodySelection';



/* ---------------- TYPES ---------------- */

type Event = {
  event_id: string;
  organizer_id: string;   // ✅ ADD THIS
  event_name: string;
  start: string;
  end: string;
  latitude: number | null;
  longitude: number | null;
};
type Organizer = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};
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
function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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
  const name = (row?.Name ?? row?.name ?? row?.launch_name ?? '')
    .toString()
    .trim();

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
  const id =
    rawId != null && String(rawId).trim().length > 0
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

type Layer = 'launches' | 'tournaments';

export default function LaunchesScreen() {


useEffect(() => {
  ensureAnonymousUser().catch(err => {
    console.error('ensureAnonymousUser failed:', err);
  });
}, []);

  const [layer, setLayer] = useState<Layer>('launches'); // ✅ HERE
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [view, setView] = useState<SheetView>('prompt');
const [events, setEvents] = useState<Event[]>([]);
const [eventGroup, setEventGroup] = useState<Event[]>([]);
const [eventIndex, setEventIndex] = useState(0);
const [organizers, setOrganizers] = useState<Organizer[]>([]);
const [activeOrganizerId, setActiveOrganizerId] = useState<string | null>(null);

const currentEvent = eventGroup[eventIndex];




  /* 🗺️ MAP TYPE */
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  /* 🔍 LAUNCH SEARCH */
  const [launchSearch, setLaunchSearch] = useState('');
  const [showLaunchDropdown, setShowLaunchDropdown] = useState(false);

  const mapRef = useRef<MapView>(null);
  const lastLaunchRef = useRef<Launch | null>(null);

/* Previous trip */
const [prevProvince, setPrevProvince] = useState('New Brunswick');
const [prevQuery, setPrevQuery] = useState('');
const [prevResults, setPrevResults] = useState<any[]>([]);
const [prevWaterbody, setPrevWaterbody] = useState<any | null>(null);

/* Next trip */
const [nextProvince, setNextProvince] = useState('New Brunswick');
const [nextQuery, setNextQuery] = useState('');
const [nextResults, setNextResults] = useState<any[]>([]);
const [nextWaterbody, setNextWaterbody] = useState<any | null>(null);


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
        `launches loaded: raw=${raw.length} normalized=${normalized.length} dropped=${
          raw.length - normalized.length
        }`
      );

      setLaunches(normalized);
      setLoading(false);
    };

    load();
  }, []);

useEffect(() => {
  const loadEvents = async () => {
    const { data, error } = await supabase.from('events').select('*');

    if (error) {
      console.log('events load error', error);
      setEvents([]);
      return;
    }

    setEvents(data ?? []);
  };

  loadEvents();
}, []);

useEffect(() => {
  const loadOrganizers = async () => {
    const { data, error } = await supabase
      .from('organizers')
      .select('*')
      .eq('active', true)
      .order('name');

    if (!error) setOrganizers(data ?? []);
  };

  loadOrganizers();
}, []);


  /* ✅ LISTEN FOR MAP PICKER SELECTIONS */
  useEffect(() => {
  const unsub = onWaterbodySelected(({ target, waterbody }) => {
    if (target === 'prev') {
      setPrevWaterbody(waterbody);
      setPrevResults([]);
      setPrevQuery('');
    } else {
      setNextWaterbody(waterbody);
      setNextResults([]);
      setNextQuery('');
    }

    // ✅ RESTORE the launch modal
    setSelectedLaunch(lastLaunchRef.current);
    setView('checkin');
  });

  return () => {
    if (typeof unsub === 'function') unsub();
  };
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

  const filteredEvents = useMemo(() => {
  if (layer !== 'tournaments') return [];
  const q = launchSearch.trim().toLowerCase();
  if (!q) return [];
  return events.filter(e =>
    e.event_name.toLowerCase().includes(q)
  );
}, [events, launchSearch, layer]);

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
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      },
      350
    );
  };

 const openWaterbodyPicker = (
  target: 'prev' | 'next',
  province: string,
  item: any
) => {
  const key =
    (item?.search_name_norm ?? item?.search_name ?? '')
      .toString()
      .trim()
      .toLowerCase();

  // ✅ remember which launch opened the picker
  lastLaunchRef.current = selectedLaunch;

  // close modal
  setSelectedLaunch(null);

  requestAnimationFrame(() => {
    router.push({
      pathname: '/waterbody-picker',
      params: {
        target,
        province,
        key,
        label: item?.search_name ?? 'Select location',
      },
    });
  });
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

<Modal visible={eventGroup.length > 0} animationType="slide" transparent>
  <View style={styles.modalBackdrop}>
    <SafeAreaView style={styles.modalSafe}>
      <View style={styles.grabber} />

      <View style={styles.modal}>
        <Text style={styles.modalTitle}>
          {currentEvent?.event_name}
        </Text>

      <Text style={styles.eventDate}>
  {formatDate(currentEvent?.start)}
  {currentEvent?.start !== currentEvent?.end &&
    ` → ${formatDate(currentEvent?.end)}`}
</Text>

<Pressable
  style={styles.eventButton}
  onPress={() => {
    const lat = currentEvent?.latitude;
    const lon = currentEvent?.longitude;

    if (!lat || !lon) return;

    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${lat},${lon}`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    });

    if (url) Linking.openURL(url);
  }}
>
  <Text style={styles.primaryText}>Get directions</Text>
</Pressable>


        {/* NAV */}
        {eventGroup.length > 1 && (
          <View style={styles.eventNav}>
            <Pressable
              disabled={eventIndex === 0}
              onPress={() => setEventIndex(i => i - 1)}
            >
              <Text style={[
                styles.navArrow,
                eventIndex === 0 && { opacity: 0.3 }
              ]}>
                ◀
              </Text>
            </Pressable>

            <Text style={styles.navCounter}>
              {eventIndex + 1} / {eventGroup.length}
            </Text>

            <Pressable
              disabled={eventIndex === eventGroup.length - 1}
              onPress={() => setEventIndex(i => i + 1)}
            >
              <Text style={[
                styles.navArrow,
                eventIndex === eventGroup.length - 1 && { opacity: 0.3 }
              ]}>
                ▶
              </Text>
            </Pressable>
          </View>
        )}

        <Pressable
  style={styles.eventButtonSecondary}
  onPress={() => setEventGroup([])}
><Text style={styles.secondaryText}>Close</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  </View>
</Modal>


      {/* 🔍 LAUNCH SEARCH BAR (OVERLAY) */}
      <View style={styles.launchSearchWrap}>
        <View style={styles.launchSearchRow}>
          <TextInput
          placeholder={
  layer === 'launches'
    ? 'Search boat launches…'
    : 'Search events…'
}
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

       {/* Dropdown results – Launches */}
{showLaunchDropdown &&
  layer === 'launches' &&
  topLaunchMatches.length > 0 && (
    <View style={styles.launchDropdown}>
      {topLaunchMatches.map(item => (
        <Pressable
          key={item.id}
          style={styles.launchDropdownItem}
          onPress={() => selectLaunchFromSearch(item)}
        >
          <Text style={styles.launchDropdownText}>
            {item.Name}
          </Text>
        </Pressable>
      ))}
    </View>
  )}

{/* Dropdown results – Events */}
{showLaunchDropdown &&
  layer === 'tournaments' &&
  filteredEvents.length > 0 && (
    <View style={styles.launchDropdown}>
      {filteredEvents.slice(0, 8).map(ev => (
        <Pressable
          key={ev.event_id}
          style={styles.launchDropdownItem}
     onPress={() => {
  // 1️⃣ Close search UI
  setShowLaunchDropdown(false);
  setLaunchSearch('');

  // 2️⃣ FORCE layer FIRST
  setLayer('tournaments');

  // 3️⃣ Next frame: set organizer + everything else
  requestAnimationFrame(() => {
    setActiveOrganizerId(ev.organizer_id);

    // 4️⃣ Zoom map
    mapRef.current?.animateToRegion(
      {
        latitude: ev.latitude!,
        longitude: ev.longitude!,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      },
      350
    );

    // 5️⃣ Open modal
    const group = events.filter(
      e =>
        e.organizer_id === ev.organizer_id &&
        e.latitude === ev.latitude &&
        e.longitude === ev.longitude
    );

    setEventGroup(group);
    setEventIndex(
      group.findIndex(e => e.event_id === ev.event_id)
    );
  });
}}
        >
          <Text style={styles.launchDropdownText}>
            {ev.event_name}
          </Text>
        </Pressable>
      ))}
    </View>
  )}

{/* No matches */}
{showLaunchDropdown &&
  !!launchSearch.trim() &&
  ((layer === 'launches' && topLaunchMatches.length === 0) ||
   (layer === 'tournaments' && filteredEvents.length === 0)) && (
    <View style={styles.launchDropdown}>
      <View style={styles.launchDropdownItem}>
        <Text style={styles.launchDropdownMuted}>
          No matches
        </Text>
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
  {/* LAUNCHES */}
  {layer === 'launches' &&
    markers.map(l => (
      <Marker
        key={l.id}
        coordinate={{ latitude: l.Latitude, longitude: l.Longitude }}
        title={l.Name}
        pinColor="red"
        onPress={() => {
          setSelectedLaunch(l);
          setView('prompt');
        }}
      />
    ))}

  {/* EVENTS (only when selected) */}

{/* EVENTS */}
{layer === 'tournaments' &&
  events
    .filter(e => {
      if (!e.latitude || !e.longitude) return false;
      if (!activeOrganizerId) return false;
      return e.organizer_id === activeOrganizerId;
    })
    .map(e => {

      // JS scope
      const logoUrl =
        organizers.find(o => o.id === e.organizer_id)?.logo_url;

      return (
        <Marker
          key={e.event_id}
          coordinate={{
            latitude: e.latitude!,
            longitude: e.longitude!,
          }}
          zIndex={9999}
          onPress={() => {
            setEventGroup([]);
            requestAnimationFrame(() => {
              const group = events.filter(
                ev =>
                  ev.organizer_id === e.organizer_id &&
                  ev.latitude === e.latitude &&
                  ev.longitude === e.longitude
              );

              setEventGroup(group);
              setEventIndex(0);
            });
          }}
        >
          <View style={styles.eventPin}>
            {logoUrl && (
              <ExpoImage
                source={{ uri: logoUrl }}
                style={styles.eventPinImage}
                cachePolicy="disk"
                priority="high"
                transition={0}
              />
            )}
          </View>
        </Marker>
      );
    })}

</MapView>
{/* 🟦 EVENT SIDEBAR */}
{layer === 'tournaments' && (
  <View style={styles.eventRail}>
    <FlatList
      data={organizers}
      keyExtractor={o => o.id}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const isActive = activeOrganizerId === item.id;

        return (
          <Pressable
            style={styles.eventItem}
           
onPress={() => {
  setActiveOrganizerId(item.id);
}}
          >
            <View
              style={[
                styles.eventCircle,
                isActive && styles.eventCircleActive,
              ]}
            >
              {item.logo_url ? (
              <ExpoImage
  source={{ uri: item.logo_url }}
  style={styles.eventLogo}
  contentFit="contain"
  cachePolicy="disk"
  priority="high"
  transition={0}
/>
              ) : (
                <Text style={styles.eventPlaceholder}>
                  {item.name.charAt(0)}
                </Text>
              )}
            </View>

            <Text style={styles.eventLabel}>
              {item.name}
            </Text>
          </Pressable>
        );
      }}
    />
  </View>
)}

{/* 🗂️ LAYER TOGGLE */}
<View style={styles.layerToggle}>
  <Pressable
   onPress={() => {
  setLayer('launches');
  setActiveOrganizerId(null);
}}
    style={[
      styles.layerBtn,
      layer === 'launches' && styles.layerBtnActive,
    ]}
  >
    <Text
      style={[
        styles.layerText,
        layer === 'launches' && styles.layerTextActive,
      ]}
    >
      Launches
    </Text>
  </Pressable>

  <Pressable
    onPress={() => {
      setLayer('tournaments');
      setActiveOrganizerId(null);
    }}
    style={[
      styles.layerBtn,
      layer === 'tournaments' && styles.layerBtnActive,
    ]}
  >
    <Text
      style={[
        styles.layerText,
        layer === 'tournaments' && styles.layerTextActive,
      ]}
    >
      Events
    </Text>
  </Pressable>
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
    layer === 'tournaments'
      ? mapType === 'standard'
        ? require('@/assets/imagesat2.png')
        : require('@/assets/imagedef2.png')
      : mapType === 'standard'
        ? require('@/assets/imagesat.png')
        : require('@/assets/imagedef.png')
  }
  style={styles.mapToggleImage}
/>

        </Pressable>
      </View>

      {/* MODAL */}
      <Modal visible={!!selectedLaunch} animationType="slide" transparent>
        <View
  style={[
    styles.modalBackdrop,
    { paddingBottom: view === 'checkin' ? 200 : 40 },
  ]}
>
  <SafeAreaView
  style={[
    styles.modalSafe,
    { maxHeight: view === 'checkin' ? '95%' : '70%' },
  ]}
>
    <View style={styles.grabber} />

      <ScrollView
  keyboardShouldPersistTaps="handled"   // 👈 THIS IS THE MISSING PIECE
  contentContainerStyle={[
    styles.modal,
    { paddingBottom: 32 },
  ]}
>

              {view === 'prompt' && (
                <>
                  <Text style={styles.modalTitle}>{selectedLaunch?.Name}</Text>

                 <Pressable
  style={styles.eventButton}
  onPress={() => setView('checkin')}
>
  <Text style={styles.primaryText}>Check in at this launch</Text>
</Pressable>

            <Pressable
  style={styles.eventButtonSecondary}
  onPress={closeAll}
>
  <Text style={styles.secondaryText}>Close</Text>
</Pressable>
                </>
              )}

              {view === 'checkin' && (
                <>
                  <Text style={styles.modalTitle}>Register boater movement</Text>

                  {/* LAST TRIP */}
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Previous waterbody</Text>

                    <Pressable
  style={styles.settingRow}
  onPress={() => setView('province-prev')}
>
  <Text style={styles.settingLabel}>Province</Text>
  <View style={styles.settingRight}>
   <Text style={[styles.settingValue, styles.settingValueBlue]}>
  {prevProvince}
</Text>
   <View>
  <Text style={styles.chevron}>›</Text>
</View>
  </View>
</Pressable>

      {prevWaterbody ? (
  <View style={styles.settingRow}>
  <Text style={styles.settingValuePrimary}>
    {prevWaterbody?.search_name}
  </Text>

  <Pressable onPress={() => {
    setPrevWaterbody(null);
    setPrevQuery('');
  }}>
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
  keyboardShouldPersistTaps="handled"
  keyExtractor={(item, i) => `prev-${i}`}
  renderItem={({ item }) => (


    
    <Pressable
      style={styles.resultItem}
      onPress={() => {
        if (Number(item?.name_count ?? 0) > 1) {
          setPrevResults([]);
          openWaterbodyPicker('prev', prevProvince, item);
          return;
        }

        setPrevWaterbody(item);
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
                    <Text style={styles.cardTitle}>Next waterbody</Text>

                   <Pressable
  style={styles.settingRow}
  onPress={() => setView('province-next')}
>
  <Text style={styles.settingLabel}>Province</Text>
  <View style={styles.settingRight}>
    <Text style={[styles.settingValue, styles.settingValueBlue]}>
  {nextProvince}
</Text>
   <View>
  <Text style={styles.chevron}>›</Text>
</View>
  </View>
</Pressable>


                    {nextWaterbody ? (
        <View style={styles.settingRow}>
  <Text style={styles.settingValuePrimary}>
    {nextWaterbody?.search_name}
  </Text>

<Pressable onPress={() => {
  setNextWaterbody(null);   // ✅ correct
  setNextQuery('');
}}>
    <Text style={styles.changeText}>Change</Text>
  </Pressable>
</View>
                    ) : (
                      <>
                        <Pressable
                          style={styles.undecidedButton}
                          onPress={() =>
  setNextWaterbody({
    search_name: "Haven’t decided yet",
  })
}
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
  keyboardShouldPersistTaps="handled"
  keyExtractor={(item, i) => `next-${i}`}
  renderItem={({ item }) => (
    <Pressable
      style={styles.resultItem}
      onPress={() => {
        if (Number(item?.name_count ?? 0) > 1) {
          setNextResults([]);
          openWaterbodyPicker('next', nextProvince, item);
          return;
        }

        setNextWaterbody(item);
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
                      await ensureAnonymousUser();

  /* 1️⃣ INSERT CHECK-IN */
const { error: checkinError } = await supabase
  .from('launch_checkins')
  .insert(
    [
      {
        launch_id: selectedLaunch?.id ?? null,
        launch_name: selectedLaunch?.Name ?? null,

        prev_province: prevProvince ?? null,
        prev_waterbody:
          typeof prevWaterbody === 'string'
            ? prevWaterbody
            : prevWaterbody?.search_name ?? null,
        prev_waterbody_id:
          typeof prevWaterbody === 'object' &&
          prevWaterbody?.id !== undefined &&
          prevWaterbody?.id !== null
            ? Number(prevWaterbody.id)
            : null,

        next_province: nextProvince ?? null,
        next_waterbody:
          typeof nextWaterbody === 'string'
            ? nextWaterbody
            : nextWaterbody?.search_name ?? null,
        next_waterbody_id:
          typeof nextWaterbody === 'object' &&
          nextWaterbody?.id !== undefined &&
          nextWaterbody?.id !== null
            ? Number(nextWaterbody.id)
            : null,
      },
    ],
    { returning: 'minimal' } as any
  );

if (checkinError) {
  console.error('CHECKIN INSERT ERROR:', checkinError);
  alert(checkinError.message);
  return;
}

  /* 2️⃣ BUILD FLOW ROWS */
  const flowRows: any[] = [];

  if (
    prevWaterbody &&
    typeof prevWaterbody !== 'string' &&
    prevWaterbody.latitude &&
    prevWaterbody.longitude
  ) {
    flowRows.push({
      boat_launch: selectedLaunch?.Name,
      movement_type: 'previous',
      waterbody_name: prevWaterbody.search_name,
      waterbody_lat: prevWaterbody.latitude,
      waterbody_lon: prevWaterbody.longitude,
    });
  }

  if (
    nextWaterbody &&
    typeof nextWaterbody !== 'string' &&
    nextWaterbody.latitude &&
    nextWaterbody.longitude
  ) {
    flowRows.push({
      boat_launch: selectedLaunch?.Name,
      movement_type: 'next',
      waterbody_name: nextWaterbody.search_name,
      waterbody_lat: nextWaterbody.latitude,
      waterbody_lon: nextWaterbody.longitude,
    });
  }

  /* 3️⃣ STOP WRITING launch_flows_old
   Flows are now derived from launch_checkins via a VIEW (launch_flows_v2).
   Nothing to insert here.
*/

  /* 4️⃣ CLOSE MODAL */
  closeAll();
}}

                  >
                    <Text style={styles.primaryText}>Submit check-in</Text>
                  </Pressable>

                <Pressable style={styles.eventButtonSecondary} onPress={closeAll}>
  <Text style={styles.secondaryText}>Close</Text>
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

                        // When province changes, clear any selected waterbody + results for that section
                        if (view === 'province-prev') {
                          setPrevWaterbody(null);
                          setPrevQuery('');
                          setPrevResults([]);
                        } else {
                          setNextWaterbody(null);
                          setNextQuery('');
                          setNextResults([]);
                        }

                        setView('checkin');
                      }}
                    >
                      <Text>{p}</Text>
                    </Pressable>
                  ))}

                  <Pressable
  style={styles.eventButtonSecondary}
  onPress={() => setView('checkin')}
>
  <Text style={styles.secondaryText}>Close</Text>
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
  zIndex: 100,   // 👈 make this bigger than eventRail
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
  paddingHorizontal: 16,
  paddingVertical: 10,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#EFEFF4',
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
  backgroundColor: '#F2F2F7',
  borderRadius: 12,
  padding: 12,
  marginTop: 8,
  fontSize: 15,
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

  pickerItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
layerToggle: {
  position: 'absolute',
  top: 76,
  left: 12,
  right: 12,
  flexDirection: 'row',
  backgroundColor: '#fff',
  borderRadius: 20,
  padding: 4,
  gap: 6,
  elevation: 6,
  borderWidth: 1,
  borderColor: '#E7E7EA',
  zIndex: 40,
},
layerBtn: {
  flex: 1,
  paddingVertical: 6,      // was 8
  paddingHorizontal: 14,   // was 16
  borderRadius: 16,       // optional: 18 → 16 looks tighter
  backgroundColor: '#F2F2F7',
  alignItems: 'center',
},
layerBtnActive: {
  backgroundColor: '#007AFF',
},

layerText: {
  fontWeight: '600',   // ✅ same as Incoming/Outgoing
  fontSize: 14,        // ✅ explicit (matches default RN button feel)
  color: '#333',
},


layerTextActive: {
  color: '#fff',
},
eventNav: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
},
navArrow: {
  fontSize: 28,
  fontWeight: '700',
  color: '#007AFF',
},
navCounter: {
  fontSize: 14,
  fontWeight: '600',
  color: '#444',
},
eventRail: {
  position: 'absolute',
  top: 140,
  left: 8,
  bottom: 40,
  width: 86,
  zIndex: 60,
  alignItems: 'center',
},

eventItem: {
  alignItems: 'center',
  marginBottom: 14,
},

eventCircle: {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: '#F2F2F7',
  borderWidth: 2,
  borderColor: '#007AFF',   // 🔵 always blue
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
},

eventCircleActive: {
  borderColor: '#007AFF',
  backgroundColor: '#007AFF20',
  shadowColor: '#007AFF',
  shadowOpacity: 0.6,
  shadowRadius: 6,
  elevation: 6,
},

eventLogo: {
  width: 52,
  height: 52,
  borderRadius: 26,
},

eventPlaceholder: {
  fontSize: 18,
  fontWeight: '800',
  color: '#444',
},

eventLabel: {
  fontSize: 10,
  fontWeight: '700',
  marginTop: 4,
  textAlign: 'center',
  color: '#111',
  maxWidth: 78,
},
eventPin: {
  width: 26,
  height: 26,
  borderRadius: 13,
  backgroundColor: '#fff',
  borderWidth: 1,          // 👈 THIS IS THE KEY
  borderColor: '#007AFF',
  alignItems: 'center',
  justifyContent: 'center',
},
eventPinActive: {
  shadowColor: '#007AFF',
  shadowOpacity: 0.7,
  shadowRadius: 6,
  elevation: 6,
},

eventPinImage: {
  width: 18,
  height: 18,
  borderRadius: 9,
},


eventButton: {
  backgroundColor: '#007AFF',
  paddingVertical: 10,   // 👈 slimmer
  paddingHorizontal: 14,
  borderRadius: 14,
  alignItems: 'center',
  marginTop: 10,
},

eventButtonSecondary: {
  backgroundColor: '#E9E9EE',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 14,
  alignItems: 'center',
  marginTop: 8,
},
secondaryText: {
  color: '#111',
  fontWeight: '700',
},
eventDate: {
  fontSize: 15,
  fontWeight: '600',
  color: '#444',
  marginBottom: 16,
},
settingRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: '#EFEFF4',
},

settingLabel: {
  fontSize: 15,
  color: '#111',
  fontWeight: '600',
},

settingRight: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  flex: 1,
  justifyContent: 'flex-end', // ✅ THIS
},

settingValue: {
  fontSize: 15,
  color: '#666',
  fontWeight: '600',
  maxWidth: '70%',      // 👈 IMPORTANT
},

settingValueBlue: {
  color: '#007AFF',     // iOS blue
},
chevron: {
  fontSize: 20,
  color: '#C7C7CC', // iOS light grey
  marginTop: -2,
},
settingValuePrimary: {
  fontSize: 15,
  color: '#111',
  fontWeight: '600',
  maxWidth: '70%',
},
});
