import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDrawer } from '../../src/context/DrawerContext';
import { useUser } from '@clerk/clerk-expo';
import { COLORS } from '../../src/constants/colors';

const { width } = Dimensions.get('window');
const CARD_W = (width - 52) / 2;

const FEATURES = [
  {
    id: 'n2e', title: 'Speech to Text',
    desc: 'Push-to-talk with instant English output',
    icon: '🎙️', bg: '#FDF4E8', accent: '#E8820C',
    route: '/(drawer)/native-to-english',
  },
  {
    id: 'cont', title: 'Continuous',
    desc: 'Hands-free with silence detection',
    icon: '👂', bg: '#EEF2FB', accent: '#3D4F8A',
    route: '/(drawer)/continuous',
  },
  {
    id: 'e2n', title: 'English → Native',
    desc: 'Translate to any Indian language',
    icon: '🌐', bg: '#E8F5EE', accent: '#2D6A4F',
    route: '/english-to-native',
  },
  {
    id: 'vis', title: 'Vision',
    desc: 'Translate text from camera',
    icon: '📷', bg: '#F3EEF8', accent: '#6B4FA8',
    route: '/vision',
  },
  {
    id: 'vid', title: 'Video Subtitles',
    desc: 'Upload video and get subtitles',
    icon: '🎬', bg: '#FDF4E3', accent: '#C96E08',
    route: '/video',
  },
];

const QUICK_STATS = [
  { val: '10+', label: 'Languages' },
  { val: '5', label: 'Features' },
  { val: '3', label: 'AI Tones' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { openDrawer } = useDrawer();
  const firstName = user?.firstName || '';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={openDrawer} style={s.menuBtn} activeOpacity={0.7}>
          <View style={s.menuLine} />
          <View style={[s.menuLine, { width: 16 }]} />
          <View style={s.menuLine} />
        </TouchableOpacity>
        <View style={s.headerBrand}>
          <Image source={require('../../assets/logo.png')} style={s.logo} />
          <Text style={s.brandName}>SeedlingSpeaks</Text>
        </View>
        <TouchableOpacity
          style={s.profileBtn}
          onPress={() => router.push('/(drawer)/profile')}
          activeOpacity={0.8}
        >
          <Text style={s.profileInitial}>
            {(user?.firstName?.[0] || 'U').toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <View style={s.hero}>
          <Text style={s.greeting}>{getGreeting()}{firstName ? `, ${firstName}` : ''} 👋</Text>
          <Text style={s.heroSub}>What would you like to translate today?</Text>

          {/* Stats strip */}
          <View style={s.statsStrip}>
            {QUICK_STATS.map((st2, i) => (
              <View key={st2.label} style={[s.statItem, i < QUICK_STATS.length - 1 && s.statDivider]}>
                <Text style={s.statVal}>{st2.val}</Text>
                <Text style={s.statLabel}>{st2.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={s.ctaBanner}
          activeOpacity={0.88}
          onPress={() => router.push('/(drawer)/native-to-english')}
        >
          <View style={s.ctaContent}>
            <View style={s.ctaIconWrap}>
              <Text style={{ fontSize: 22 }}>🎙️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ctaTitle}>Start Speaking</Text>
              <Text style={s.ctaSub}>Record in your language, get English instantly</Text>
            </View>
            <View style={s.ctaArrow}>
              <Text style={{ color: COLORS.saffron, fontSize: 18, fontWeight: '700' }}>→</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Features grid */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Features</Text>
          <Text style={s.sectionCount}>{FEATURES.length} tools</Text>
        </View>

        <View style={s.grid}>
          {FEATURES.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[s.featureCard, { backgroundColor: f.bg }]}
              activeOpacity={0.82}
              onPress={() => router.push(f.route)}
            >
              <View style={[s.featureIconWrap, { backgroundColor: f.accent + '18' }]}>
                <Text style={{ fontSize: 22 }}>{f.icon}</Text>
              </View>
              <Text style={s.featureTitle}>{f.title}</Text>
              <Text style={s.featureDesc}>{f.desc}</Text>
              <View style={s.featureFooter}>
                <Text style={[s.featureLink, { color: f.accent }]}>Open →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick access row */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick Access</Text>
        </View>
        <View style={s.quickRow}>
          {[
            { icon: '🕐', label: 'History', route: '/(drawer)/history' },
            { icon: '👤', label: 'Profile', route: '/(drawer)/profile' },
            { icon: '⚙️', label: 'Settings', route: '/(drawer)/settings' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={s.quickCard}
              activeOpacity={0.8}
              onPress={() => router.push(item.route)}
            >
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              <Text style={s.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.footer}>v2.5 · SeedlingSpeaks by Seedlinglabs</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuBtn: { padding: 4, gap: 4, justifyContent: 'center' },
  menuLine: { width: 22, height: 2, borderRadius: 2, backgroundColor: COLORS.ink, marginVertical: 2 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 30, height: 30, borderRadius: 8 },
  brandName: { fontSize: 17, fontWeight: '800', color: COLORS.ink, letterSpacing: -0.4 },
  profileBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.saffron,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInitial: { fontSize: 15, fontWeight: '800', color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },

  // Hero
  hero: { marginBottom: 24 },
  greeting: {
    fontSize: 28, fontWeight: '800', color: COLORS.ink,
    letterSpacing: -0.6, marginBottom: 6,
  },
  heroSub: { fontSize: 15, color: COLORS.muted, marginBottom: 20, lineHeight: 21 },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { borderRightWidth: 1, borderRightColor: COLORS.border },
  statVal: { fontSize: 22, fontWeight: '800', color: COLORS.saffron, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2, fontWeight: '600' },

  // CTA Banner
  ctaBanner: {
    backgroundColor: COLORS.ink,
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ctaIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 3 },
  ctaSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },
  ctaArrow: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(232,130,12,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink, letterSpacing: -0.3 },
  sectionCount: { fontSize: 12, color: COLORS.faded, fontWeight: '600' },

  // Feature cards
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  featureCard: {
    width: CARD_W, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(90,70,50,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  featureTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 5 },
  featureDesc: { fontSize: 12, color: COLORS.muted, lineHeight: 17, flex: 1 },
  featureFooter: { marginTop: 12 },
  featureLink: { fontSize: 12, fontWeight: '700' },

  // Quick row
  quickRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  quickCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  quickLabel: { fontSize: 12, fontWeight: '600', color: COLORS.warm },

  footer: { textAlign: 'center', fontSize: 11, color: COLORS.faded, marginTop: 4 },
});
