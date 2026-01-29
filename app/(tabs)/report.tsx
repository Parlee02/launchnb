import { supabase } from '@/supabaseClient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable, ScrollView, StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

const IOS_BLUE = '#007AFF';
const DANGER_RED = '#FF3B30';
const MAP_BOTTOM_PADDING = 0;

/* ---------------- TYPES ---------------- */

type Coordinate = {
  latitude: number;
  longitude: number;
};

type ConfirmedReport = {
  id: string;
  latitude: number;
  longitude: number;
  created_at: string;
  species: {
    id: string;
    common_name: string;
    scientific_name: string;
    image_url: string | null;
  };
};

/* ---------------- COMPONENT ---------------- */

export default function ReportScreen() {
    type Species = {
  id: string;
  common_name: string;
  scientific_name: string;
  image_url: string | null;
};

const [speciesList, setSpeciesList] = useState<Species[]>([]);
const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
const [dropdownOpen, setDropdownOpen] = useState(false);
  const mapRef = useRef<MapView>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [reportLocation, setReportLocation] = useState<Coordinate | null>(null);
  const [speciesGuess, setSpeciesGuess] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

 const [confirmedReports, setConfirmedReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] =
    useState<ConfirmedReport | null>(null);

  const initialRegion: Region = {
    latitude: 46.5653,
    longitude: -66.4619,
    latitudeDelta: 3.5,
    longitudeDelta: 3.5,
  };
/* ---------------- LOAD SPECIES ---------------- */

async function loadSpecies() {
  const { data, error } = await supabase
    .from('species')
    .select('id, common_name, scientific_name, image_url')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (!error) {
    setSpeciesList(data ?? []);
  }
}

/* ---------------- LOAD CONFIRMED REPORTS ---------------- */

async function loadConfirmedReports() {
  let query = supabase
    .from('ais_reports')
    .select(`
      id,
      latitude,
      longitude,
      created_at,
      species:species_id (
        id,
        common_name,
        scientific_name,
        image_url
      )
    `)
    .eq('public_visible', true)
    .eq('status', 'confirmed');

  if (selectedSpecies) {
    query = query.eq('species_id', selectedSpecies.id);
  }

  const { data, error } = await query;

  if (!error) {
    setConfirmedReports(data ?? []);
  }
}
/* ---------------- EFFECTS ---------------- */

useEffect(() => {
  loadSpecies();
}, []);

useEffect(() => {
  loadConfirmedReports();
}, [selectedSpecies]);

  /* ---------------- TAKE PHOTO ---------------- */

  async function takePhoto() {
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPerm.granted) {
      Alert.alert('Camera access required');
      return;
    }

    const locationPerm = await Location.requestForegroundPermissionsAsync();
    if (!locationPerm.granted) {
      Alert.alert('Location access required');
      return;
    }

    const photo = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (photo.canceled) return;

    const loc = await Location.getCurrentPositionAsync({});

    const coordinate = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };

    setPhotoUri(photo.assets[0].uri);
    setReportLocation(coordinate);

    requestAnimationFrame(() => {
      mapRef.current?.animateCamera(
        { center: coordinate, zoom: 16 },
        { duration: 600 }
      );
    });
  }

  /* ---------------- SUBMIT ---------------- */

  async function submitReport() {
    if (!photoUri || !reportLocation) return;

    try {
      setSubmitting(true);

      const uri = photoUri.startsWith('file://')
        ? photoUri
        : `file://${photoUri}`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const bytes = Buffer.from(base64, 'base64');
      const fileName = `ais_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('ais-reports')
        .upload(fileName, bytes, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('ais-reports')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('ais_reports').insert({
        latitude: reportLocation.latitude,
        longitude: reportLocation.longitude,
        photo_url: data.publicUrl,
        species_guess: speciesGuess || null,
        notes: notes || null,
        status: 'pending',
      });

      if (insertError) throw insertError;

      Alert.alert('Report submitted', 'Thanks for helping protect our waters.');
      reset();
    } catch (err) {
      console.error(err);
      Alert.alert('Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setPhotoUri(null);
    setReportLocation(null);
    setSpeciesGuess('');
    setNotes('');
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.container}>
  
  
 <MapView
  ref={mapRef}
  style={StyleSheet.absoluteFill}
  initialRegion={initialRegion}
  showsUserLocation
  mapPadding={{
    top: 120,
    right: 0,
    bottom: MAP_BOTTOM_PADDING,
    left: 0,
  }}
  onPress={(e) =>
    reportLocation && setReportLocation(e.nativeEvent.coordinate)
  }
>
  {/* TEMP REPORT MARKER */}
  {reportLocation && <Marker coordinate={reportLocation} />}

  {/* CONFIRMED REPORT MARKERS */}
  {confirmedReports.map((report) => (
    <Marker
      key={report.id}
      coordinate={{
        latitude: report.latitude,
        longitude: report.longitude,
      }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => setSelectedReport(report)}
    >
      <View style={styles.markerContainer}>
   <Image
  source={{
    uri: report.species?.image_url || 'https://your-default-icon.png'
  }}
  style={styles.markerImage}
  resizeMode="contain"
/>
      </View>
    </Marker>
  ))}
</MapView>

      {/* HEADER */}
<View style={styles.header}>
  {/* REPORT BLOCK */}
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <View style={styles.headerIcon}>
      <FontAwesome name="info" size={14} color="#fff" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.headerTitle}>Aquatic Invasive Species Map</Text>
    </View>
  </View>

  {/* FILTER */}
  <Pressable
    style={{
      marginTop: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 10,
      backgroundColor: '#f9f9f9'
    }}
    onPress={() => setDropdownOpen(true)}
  >
    <Text>
      {selectedSpecies
        ? selectedSpecies.common_name
        : 'Filter by species'}
    </Text>
  </Pressable>
</View>

      {/* MAP HINT */}
      {reportLocation && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Tap the map to adjust the observation location
          </Text>
        </View>
      )}

      {/* FIXED BOTTOM BUTTON */}
      {!photoUri && !selectedReport && (
        <View style={styles.bottomAction}>

        <Pressable style={styles.bottomButton} onPress={takePhoto}>
  <FontAwesome name="camera" size={18} color="#000" />
  <Text style={styles.bottomButtonText}>Report a Sighting</Text>
</Pressable>



        </View>
      )}

{/* CONFIRMED REPORT DETAIL */}
{selectedReport && (
  <View style={styles.detailSheet}>
    
    {/* Close button */}
    <Pressable
      style={styles.detailCloseButton}
      onPress={() => setSelectedReport(null)}
    >
      <FontAwesome name="times" size={14} color="#666" />
    </Pressable>

    <Text style={styles.detailTitle}>
  {selectedReport.species?.common_name || 'Unknown species'}
</Text>

<Text style={styles.detailScientific}>
  ({selectedReport.species?.scientific_name || 'Not classified'})
</Text>


    <Text style={styles.detailMeta}>
      Reported on {new Date(selectedReport.created_at).toLocaleDateString()}
    </Text>
  </View>
)}


      {/* BOTTOM SHEET */}
      {photoUri && (
        <View style={styles.sheet}>
          <Image source={{ uri: photoUri }} style={styles.thumbnail} />

          <TextInput
            placeholder="Species guess (optional)"
            value={speciesGuess}
            onChangeText={setSpeciesGuess}
            style={styles.input}
          />

          <TextInput
            placeholder="Additional details (optional)"
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.notes]}
            multiline
          />

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={reset}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={styles.submitBtn}
              onPress={submitReport}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

{dropdownOpen && (
  <Pressable
    style={StyleSheet.absoluteFill}
    onPress={() => setDropdownOpen(false)}
  >
    <View style={styles.dropdownContainer}>
      <ScrollView
        style={{ maxHeight: 300 }}
        showsVerticalScrollIndicator
      >
        {speciesList.map((sp) => (
          <Pressable
            key={sp.id}
            style={styles.dropdownItem}
            onPress={() => {
              setSelectedSpecies(sp);
              setDropdownOpen(false);
            }}
          >
            <Image
              source={{
                uri:
                  sp.image_url ||
                  'https://stghveoagifbdhyrhxcl.supabase.co/storage/v1/object/public/species-images/default.png',
              }}
              style={{ width: 24, height: 24 }}
            />
            <View>
              <Text style={{ fontWeight: '600' }}>
                {sp.common_name}
              </Text>
              <Text style={{ fontSize: 12, color: '#666' }}>
                {sp.scientific_name}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        style={{ padding: 10 }}
        onPress={() => {
          setSelectedSpecies(null);
          setDropdownOpen(false);
        }}
      >
        <Text style={{ color: IOS_BLUE }}>Clear filter</Text>
      </Pressable>
    </View>
  </Pressable>
)}
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },

 header: {
  position: 'absolute',
  top: Platform.OS === 'ios' ? 10 : 10,
  left: 20,
  right: 20,
  backgroundColor: '#fff',
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#eee',
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
},


 headerTitle: {
  fontSize: 18,
  fontWeight: '700',
},

headerSubtitle: {
  fontSize: 13,
  color: '#666',
},


  hint: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 130 : 130,
    alignSelf: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    shadowOpacity: 0.2,
  },

  hintText: { fontSize: 14 },

  bottomAction: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 23 : 20,
    left: 16,
    right: 16,
  },

  bottomButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '#fff',
  paddingVertical: 14,
  paddingHorizontal: 22,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#ddd',
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
},


 bottomButtonText: {
  color: '#000',
  fontSize: 16,
  fontWeight: '600',
},


  sheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 10,
  },

  thumbnail: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
  },

  notes: {
    height: 70,
    textAlignVertical: 'top',
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
  },

  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: DANGER_RED,
    padding: 14,
    borderRadius: 10,
  },

  cancelText: {
    color: DANGER_RED,
    textAlign: 'center',
    fontWeight: '600',
  },

  submitBtn: {
    flex: 2,
    backgroundColor: IOS_BLUE,
    padding: 14,
    borderRadius: 10,
  },

  submitText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },

  detailBadge: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: IOS_BLUE,
  },

  detailClose: {
    marginTop: 12,
    textAlign: 'right',
    color: IOS_BLUE,
    fontWeight: '600',
  },
 markerContainer: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#fff',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: IOS_BLUE,
},

markerImage: {
  width: 20,
  height: 20,
},
headerIcon: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: IOS_BLUE,
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 2,
},

detailCheck: {
  width: 22,
  height: 22,
  borderRadius: 11,
  backgroundColor: IOS_BLUE,
  justifyContent: 'center',
  alignItems: 'center',
},

detailTitleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingRight: 32, // leave space for X button
},

detailCheckInline: {
  width: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: IOS_BLUE,
  justifyContent: 'center',
  alignItems: 'center',
},

detailSheet: {
  position: 'absolute',
  bottom: 30,
  left: 16,
  right: 16,
  backgroundColor: '#fff',
  padding: 16,
  borderRadius: 18,
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 5,
  zIndex: 10,   // 👈 THIS IS THE FIX
},

detailTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#000',
  paddingRight: 40, // 👈 reserves space for X
},

detailScientific: {
  fontSize: 15,
  fontStyle: 'italic',
  color: '#000',
},

detailMeta: {
  marginTop: 6,
  fontSize: 13,
  color: '#666',
},

detailCloseButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: '#f2f2f2',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 20,     // 👈 THIS is critical
  elevation: 20, // Android
},
dropdownContainer: {
  position: 'absolute',
  top: 120,
  left: 20,
  right: 20,
  backgroundColor: '#fff',
  borderRadius: 14,
  padding: 12,
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 10,
  elevation: 10,
  zIndex: 50,
},

dropdownItem: {
  flexDirection: 'row',
  gap: 10,
  padding: 10,
},

});
