import { supabase } from '@/supabaseClient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image, // ✅ add
  InputAccessoryView, // ✅ add
  Keyboard,
  KeyboardAvoidingView,
  Linking, Modal, Platform,
  Pressable, ScrollView, StyleSheet,
  Text,
  TextInput, // ✅ add
  TouchableWithoutFeedback,
  View
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

const IOS_BLUE = '#007AFF';
const DANGER_RED = '#FF3B30';
const MAP_BOTTOM_PADDING = 0;
const TOP_UI_OFFSET = 30;

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
    info_url: string | null;
  };
};

/* ---------------- COMPONENT ---------------- */

export default function ReportScreen() {
 type Species = {
  id: string;
  common_name: string;
  scientific_name: string;
  image_url: string | null;
  info_url: string | null;
};

const [speciesList, setSpeciesList] = useState<Species[]>([]);
const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
const [dropdownOpen, setDropdownOpen] = useState(false);
  const mapRef = useRef<MapView>(null);
const { height: SCREEN_H } = Dimensions.get('window');
const [imageOpen, setImageOpen] = useState(false);

// Estimate how much vertical space your bottom sheet uses (adjust if you change the UI)
const SHEET_ESTIMATED_HEIGHT = 340; // ✅ tune once if needed

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const isAdjustingLocation = !!photoUri;
  const [reportLocation, setReportLocation] = useState<Coordinate | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

 const [confirmedReports, setConfirmedReports] = useState<ConfirmedReport[]>([]);
  const [selectedReport, setSelectedReport] =
    useState<ConfirmedReport | null>(null);

const [mapType, setMapType] =
  useState<'standard' | 'satellite'>('standard');

  const SAT_ICON = require('@/assets/imagesat2.png');
const DEF_ICON = require('@/assets/imagedef2.png');

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
 .select('id, common_name, scientific_name, image_url, info_url')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (!error) {
    setSpeciesList(data ?? []);
  }
}

/* ---------------- EFFECTS ---------------- */

useEffect(() => {
  loadSpecies();
}, []);

useEffect(() => {
  loadConfirmedReports(selectedSpecies);
}, [selectedSpecies]);

/* ---------------- LOAD CONFIRMED REPORTS ---------------- */

async function loadConfirmedReports(species: Species | null) {

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
        image_url,
        info_url
      )
    `)
    .eq('public_visible', true)
    .eq('status', 'confirmed');

  if (species) {
    query = query.eq('species_id', species.id);
  }

  const { data, error } = await query.returns<ConfirmedReport[]>();
  if (!error && data) {
    setConfirmedReports(data);
  }
}


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
  



 /// ✅ move map AFTER state updates
requestAnimationFrame(() => {
  const { height: SCREEN_H } = Dimensions.get('window');

  mapRef.current?.fitToCoordinates(
    [coordinate],
    {
      edgePadding: {
        top: 120,                     // small breathing room
        bottom: SCREEN_H * 0.70,      // 👈 55% of screen = upper tier
        left: 40,
        right: 40,
      },
      animated: true,
    }
  );
});

  }
  

  /* ---------------- SUBMIT ---------------- */


async function submitReport() {
  if (!photoUri || !reportLocation) return;
  
const { data: authData, error: authErr } = await supabase.auth.getUser();
console.log('AUTH USER:', authData?.user, authErr);
  try {
    setSubmitting(true);

    // 1. Read photo
    const uri = photoUri.startsWith('file://')
      ? photoUri
      : `file://${photoUri}`;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const bytes = Buffer.from(base64, 'base64');

    // 2. Create report first
    const { data: report, error: reportError } = await supabase
      .from('ais_reports')

      .insert({
        latitude: reportLocation.latitude,
        longitude: reportLocation.longitude,
        notes: notes || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (reportError) throw reportError;

    // 3. Upload photo using report.id
    const photoPath = `ais-reports/${report.id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('ais-reports')
      .upload(photoPath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 4. Save photo_path
    const { error: updateError } = await supabase
      .from('ais_reports')
      .update({ photo_path: photoPath })
      .eq('id', report.id);

    if (updateError) throw updateError;

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
  setNotes('');
}

  /* ---------------- RENDER ---------------- */

  return (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={90} // ✅ adjust if needed (header height)
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>

  
<MapView
  ref={mapRef}
  style={StyleSheet.absoluteFill}
  mapType={mapType}   // 👈 ADD THIS LINE
  region={isAdjustingLocation ? undefined : initialRegion}
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
{!isAdjustingLocation &&
  confirmedReports.map((report) => (
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
        <ExpoImage
          source={{
            uri: report.species?.image_url || 'https://your-default-icon.png'
          }}
          style={styles.markerImage}
          contentFit="contain"
          cachePolicy="disk"
          priority="high"
        />
      </View>
    </Marker>
  ))}
</MapView>


{/* HEADER */}
{!isAdjustingLocation && (
  <View style={styles.header}>

    {/* TITLE ROW */}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={styles.headerIcon}>
        <FontAwesome name="info" size={14} color="#fff" />
      </View>
      <Text style={styles.headerTitle}>
        Aquatic Invasive Species Map
      </Text>
    </View>

{/* SPECIES DROPDOWN MODAL */}
<Modal
  visible={dropdownOpen}
  transparent
  animationType="fade"
  onRequestClose={() => setDropdownOpen(false)}
>
  {/* Backdrop (tap anywhere to close) */}
  <Pressable
    style={StyleSheet.absoluteFill}
    onPress={() => setDropdownOpen(false)}
  >
    {/* This stops the backdrop from stealing taps inside the dropdown */}
    <Pressable
      onPress={() => {}}
      style={styles.dropdownContainer}
    >
      <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator>
        {speciesList.map((sp) => (
          <Pressable
            key={sp.id}
            style={styles.dropdownItem}
            onPress={() => {
              setSelectedSpecies(sp);
              setDropdownOpen(false);
            }}
          >
            <ExpoImage
              source={{ uri: sp.image_url || undefined }}
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
            <Text>{sp.common_name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Pressable>
  </Pressable>
</Modal>

    {/* FILTER BUTTON */}
    <Pressable
      style={styles.filterButton}
   onPress={() => setDropdownOpen((v) => !v)}
    >
      <View style={styles.filterRow}>

        <Text style={styles.filterText} numberOfLines={1}>
          {selectedSpecies
            ? selectedSpecies.common_name
            : 'Filter by species'}
        </Text>

        {selectedSpecies && (
          <Pressable
onPress={(e) => {
  e.stopPropagation();
  setDropdownOpen(false);
  setSelectedSpecies(null);
}}
            style={styles.filterClearSquare}
            hitSlop={10}
          >
            <FontAwesome name="times" size={12} color="#666" />
          </Pressable>
        )}

      </View>
    </Pressable>

  </View>
)}


      {/* MAP HINT */}
   {reportLocation && (
  <View style={styles.hint}>
    <Text style={styles.hintText}>
      Tap the map to adjust the observation location
    </Text>
  </View>
)}


{/* FIXED BOTTOM ACTION BAR */}
{!isAdjustingLocation && !selectedReport && (
  <View style={styles.bottomActionRow}>
    
    {/* Report button */}
    <Pressable style={styles.bottomButtonCompact} onPress={takePhoto}>
      <FontAwesome name="camera" size={18} color="#000" />
      <Text style={styles.bottomButtonText}>Report</Text>
    </Pressable>

    {/* Map type toggle */}
    <Pressable
      onPress={() =>
        setMapType(prev => (prev === 'standard' ? 'satellite' : 'standard'))
      }
      style={styles.mapToggleButtonInline}
    >
      <Image
        source={mapType === 'standard' ? SAT_ICON : DEF_ICON}
        style={styles.mapToggleImage}
        fadeDuration={0}
      />
    </Pressable>

  </View>
)}



{/* CONFIRMED REPORT DETAIL */}
{!isAdjustingLocation && selectedReport && (
  <View style={styles.detailSheet}>
    
    {/* Close button */}
    <Pressable
      style={styles.detailCloseButton}
      onPress={() => setSelectedReport(null)}
    >
      <FontAwesome name="times" size={14} color="#666" />
    </Pressable>

<View style={{ 
  flexDirection: 'row', 
  alignItems: 'center',
  gap: 12 
}}>



     {/* LEFT SIDE */}
<View style={{ flexShrink: 1, paddingRight: 12 }}>
  <Text style={styles.detailTitle}>
    {selectedReport.species?.common_name || 'Unknown species'}
  </Text>

  <Text style={styles.detailMeta}>
    Reported on {new Date(selectedReport.created_at).toLocaleDateString()}
  </Text>

  {selectedReport.species?.info_url && (
    <Pressable
      onPress={() =>
        Linking.openURL(selectedReport.species!.info_url!)
      }
    >
      <Text style={{
        color: IOS_BLUE,
        marginTop: 8,
        fontWeight: '600'
      }}>
        More information →
      </Text>
    </Pressable>
  )}
</View>


      {/* RIGHT SIDE IMAGE */}

   {selectedReport.species?.image_url && (
  <Pressable onPress={() => setImageOpen(true)}>
    <Image
  source={{ uri: selectedReport.species.image_url }}
  style={{
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    marginLeft: 50  // 👈 subtle shift left
  }}
  resizeMode="contain"
/>
  </Pressable>
)}
    </View>
  </View>
)}

{/* IMAGE FULLSCREEN MODAL */}
{selectedReport && (
  <Modal visible={imageOpen} transparent animationType="fade">
    <Pressable
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onPress={() => setImageOpen(false)}
    >
      <Image
        source={{ uri: selectedReport.species.image_url! }}
        style={{
          width: '90%',
          height: '70%',
          borderRadius: 16
        }}
        resizeMode="contain"
      />
    </Pressable>
  </Modal>
)}


{/* BOTTOM SHEET */}
{photoUri && (
  <>
    <View style={styles.sheet}>
      <Image source={{ uri: photoUri }} style={styles.thumbnail} />

      <TextInput
        placeholder="Additional details (optional)"
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, styles.notes]}
        multiline
        inputAccessoryViewID="notesDone"
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

    {/* iOS keyboard toolbar */}
    {Platform.OS === 'ios' && (
      <InputAccessoryView nativeID="notesDone">
        <View
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: '#E7E7EA',
            alignItems: 'flex-end',
          }}
        >
          <Pressable onPress={Keyboard.dismiss}>
            <Text style={{ color: IOS_BLUE, fontWeight: '700', fontSize: 16 }}>
              Done
            </Text>
          </Pressable>
        </View>
      </InputAccessoryView>
    )}
  </>
)}

      </View>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}



/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },

 header: {
  position: 'absolute',
  top: 10,                 // 👈 this is the line you want
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
    top: Platform.OS === 'ios' ? 30 : 30,
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

dropdownItem: {
  flexDirection: 'row',
  gap: 10,
  padding: 10,
},
filterButton: {
  marginTop: 12,
  height: 44,                 // 👈 LOCK HEIGHT (iOS standard)
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: '#E7E7EA',
  borderRadius: 12,
  backgroundColor: '#F2F2F7',
  justifyContent: 'center',   // center content vertically
},

filterText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#111',
},
filterClear: {
  width: 18,
  height: 18,
  borderRadius: 9,
  backgroundColor: '#E5E5EA', // iOS system gray 5
  justifyContent: 'center',
  alignItems: 'center',
},
filterRow: {
  flexDirection: 'row',
  alignItems: 'center',
},

filterClearSquare: {
  width: 28,
  height: 28,
  borderRadius: 6,        // square, not circle
  backgroundColor: '#E5E5EA',
  justifyContent: 'center',
  alignItems: 'center',
  marginLeft: 'auto',    // 👈 THIS pushes it to far right
},mapToggle: {
  position: 'absolute',
  bottom: 110,   // above your bottom CTA
  right: 16,
  zIndex: 20,
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
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
},

mapToggleImage: {
  width: '100%',
  height: '100%',
},
bottomActionRow: {
  position: 'absolute',
  bottom: Platform.OS === 'ios' ? 23 : 20,
  left: 16,
  right: 16,
  flexDirection: 'row',
  gap: 12,
  alignItems: 'center',
},
bottomButtonCompact: {
  flex: 1,                    // 👈 takes most space
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '#fff',
  paddingVertical: 14,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#ddd',
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
},
mapToggleButtonInline: {
  width: 56,
  height: 56,
  borderRadius: 14,
  backgroundColor: '#fff',
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: '#ddd',
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
},

dropdownContainer: {
  position: 'absolute',
  top: 230,        // tune if needed
  left: 20,
  right: 20,
  backgroundColor: '#fff',
  borderRadius: 18,
  paddingVertical: 10,
  paddingHorizontal: 12,
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 10,
  elevation: 10,
},

});
