import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDrawer } from '../src/context/DrawerContext';
import { COLORS } from '../src/constants/colors';

const STEPS = [
  { icon: '⚙️', title: 'Open Settings', desc: 'Go to your iPhone Settings app' },
  { icon: '⌨️', title: 'Find Keyboards', desc: 'General → Keyboard → Keyboards' },
  { icon: '➕', title: 'Add Keyboard', desc: 'Tap "Add New Keyboard" and select SeedlingSpeaks' },
  { icon: '🔓', title: 'Allow Full Access', desc: 'Tap SeedlingSpeaks → turn ON "Allow Full Access"' },
  { icon: '🌐', title: 'Switch Keyboard', desc: 'In any text field, hold the 🌐 globe key and select SeedlingSpeaks' },
];

export default function KeyboardSetupScreen() {
  const insets = useSafeAreaInsets();
  const { openDrawer } = useDrawer();

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={openDrawer} style={s.hamburger}>
          <Text style={s.hamburgerText}>☰</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Keyboard Setup</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>⌨️</Text>
          <Text style={s.heroTitle}>SeedlingSpeaks Keyboard</Text>
          <Text style={s.heroDesc}>
            Speak in your language, type in English — directly inside WhatsApp, Email, or any app!
          </Text>
        </View>

        {/* Steps */}
        <Text style={s.sectionTitle}>How to Enable</Text>
        {STEPS.map((step, i) => (
          <View key={i} style={s.stepCard}>
            <View style={s.stepNumber}>
              <Text style={s.stepNumberText}>{i + 1}</Text>
            </View>
            <View style={s.stepContent}>
              <View style={s.stepHeader}>
                <Text style={s.stepIcon}>{step.icon}</Text>
                <Text style={s.stepTitle}>{step.title}</Text>
              </View>
              <Text style={s.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}

        {/* Open Settings button */}
        <TouchableOpacity style={s.settingsBtn} onPress={openSettings} activeOpacity={0.8}>
          <Text style={s.settingsBtnIcon}>⚙️</Text>
          <Text style={s.settingsBtnText}>Open iPhone Settings</Text>
        </TouchableOpacity>

        {/* Info box */}
        <View style={s.infoBox}>
          <Text style={s.infoIcon}>ℹ️</Text>
          <Text style={s.infoText}>
            "Allow Full Access" is needed so the keyboard can use your microphone and send audio to our server for translation. Your voice data is never stored.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  hamburger: { paddingRight: 12, paddingVertical: 4 },
  hamburgerText: { fontSize: 24, color: COLORS.ink },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink },

  content: { paddingHorizontal: 20, paddingTop: 24 },

  hero: { alignItems: 'center', marginBottom: 32 },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.ink, textAlign: 'center' },
  heroDesc: {
    fontSize: 14, color: COLORS.muted, textAlign: 'center',
    marginTop: 8, lineHeight: 20, paddingHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.ink,
    marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1,
  },

  stepCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  stepNumber: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.saffronLight, alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { fontSize: 14, fontWeight: '800', color: COLORS.saffron },
  stepContent: { flex: 1 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  stepIcon: { fontSize: 18 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  stepDesc: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },

  settingsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.saffron, borderRadius: 16, paddingVertical: 16,
    marginTop: 20, marginBottom: 20,
  },
  settingsBtnIcon: { fontSize: 20 },
  settingsBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  infoBox: {
    flexDirection: 'row', gap: 10, padding: 16,
    backgroundColor: COLORS.blueBg, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(26,68,128,0.15)',
  },
  infoIcon: { fontSize: 18, marginTop: 1 },
  infoText: { flex: 1, fontSize: 12, color: COLORS.blueSoft, lineHeight: 18 },
});
