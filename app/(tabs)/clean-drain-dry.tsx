import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/* ---------------- COLORS ---------------- */

const IOS_BLUE = '#007AFF';
const IOS_BLUE_TINT = 'rgba(0,122,255,0.08)';
const IOS_BLUE_BORDER = 'rgba(0,122,255,0.35)';

export default function CleanDrainDryScreen() {
  function openDFOLink() {
    Linking.openURL(
      'https://www.dfo-mpo.gc.ca/species-especes/ais-eae/prevention/clean-drain-dry-decontaminate-lavez-videz-sechez-decontaminez-eng.html'
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Aquatic Invasive Species Prevention
        </Text>
        <Text style={styles.heroSubtitle}>
          Simple actions that help protect our waters
        </Text>
      </View>

      {/* Intro */}
      <Text style={styles.section}>
        Aquatic invasive species can threaten biodiversity, ecosystem health, and
        economic activities. These species may spread unintentionally through
        recreational boating when organisms attach to watercraft, trailers, or
        equipment.
      </Text>

      <Text style={styles.section}>
        Clean • Drain • Dry is a widely recognized best-practice approach used
        across Canada and North America to help reduce the spread of aquatic
        invasive species. LaunchNB promotes these actions for educational and
        awareness purposes only.
      </Text>

      {/* Steps */}
      <Text style={styles.header}>Prevention Steps</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Clean</Text>
        <Text style={styles.cardText}>
          Remove all visible plants, animals, mud, and debris. Clean watercraft,
          trailers, and equipment on dry land, away from storm drains and
          waterways where possible.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Drain</Text>
        <Text style={styles.cardText}>
          Drain all water from bilges, livewells, motors, bait buckets, coolers,
          and internal compartments. Drain plug requirements may vary by
          jurisdiction.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dry</Text>
        <Text style={styles.cardText}>
          Allow all equipment to dry completely before entering another
          waterbody. Drying time may vary depending on conditions and local
          guidance.
        </Text>
      </View>

      {/* About */}
      <Text style={styles.header}>About LaunchNB</Text>

      <Text style={styles.section}>
        LaunchNB is an independent, non-government informational tool designed to
        support planning and awareness of aquatic invasive species prevention.
      </Text>

      {/* Button */}
      <Pressable style={styles.button} onPress={openDFOLink}>
        <Text style={styles.buttonText}>Official Guidance (DFO)</Text>
      </Pressable>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        LaunchNB provides publicly available and partner-supplied information for
        planning and awareness purposes only. Availability, access conditions,
        and operational status may change without notice. LaunchNB does not own,
        operate, maintain, or staff any boat launch or decontamination station
        shown in the app and does not guarantee accuracy or availability. Users
        are responsible for assessing site conditions, personal safety, and
        compliance with applicable laws and regulations. LaunchNB is not an
        enforcement or regulatory authority.
      </Text>
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
  paddingHorizontal: 22,
  paddingTop: 20,
  paddingBottom: 44,
  backgroundColor: '#F5F7FA',
},
  /* Hero */
  hero: {
    backgroundColor: IOS_BLUE_TINT,
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: IOS_BLUE_BORDER,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: IOS_BLUE,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#555',
  },

  /* Text */
  header: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 28,
    marginBottom: 10,
    color: IOS_BLUE,
  },
  section: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
    color: '#333',
    textAlign: 'left',
  },

  /* Cards */
  card: {
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: IOS_BLUE,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
    color: IOS_BLUE,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },

  /* Button */
  button: {
    marginTop: 30,
    backgroundColor: IOS_BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  /* Disclaimer */
  disclaimer: {
    marginTop: 28,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    textAlign: 'center',
  },
});
