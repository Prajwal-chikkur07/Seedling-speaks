import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { COLORS } from '../../src/constants/colors';
import { TARGET_LANGUAGES } from '../../src/constants/languages';
import { useApp } from '../../src/context/AppContext';
import { useDrawer } from '../../src/context/DrawerContext';

const LANG_ENTRIES = Object.entries(TARGET_LANGUAGES);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { state, setFields } = useApp();
  const { signOut } = useAuth();
  const { user }    = useUser();
  const { openDrawer } = useDrawer();
  const [showLangPicker, setShowLangPicker] = useState(false);

  const { selectedLanguageName, selectedLanguage, transcriptHistory = [] } = state;

  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User' : 'User';
  const displayEmail = user?.primaryEmailAddress?.emailAddress || '';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const MENU_ROWS = [
    { icon: '🕐', label: 'History', sub: `${transcriptHistory.length} transcripts`, route: '/(drawer)/history' },
    { icon: '⚙️', label: 'Settings', sub: 'App preferences', route: '/(drawer)/settings' },
    { icon: '⌨️', label: 'Keyboard Setup', sub: 'Configure input', route: '/keyboard-setup' },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={openDrawer} style={s.menuBtn} activeOpacity={0.7}>
          <View style={s.menuLine} />
          <View style={[s.menuLine, { width: 16 }]} />
          <View style={s.menuLine} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar section */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.userName}>{displayName}</Text>
          <Text style={s.userEmail}>{displayEmail}</Text>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { borderRightWidth: 1, borderRightColor: COLORS.border }]}>
            <Text style={s.statVal}>{transcriptHistory.length}</Text>
            <Text style={s.statLabel}>Transcripts</Text>
          </View>
          <View style={[s.statCard, { borderRightWidth: 1, borderRightColor: COLORS.border }]}>
            <Text style={s.statVal}>10+</Text>
            <Text style={s.statLabel}>Languages</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>v2.5</Text>
            <Text style={s.statLabel}>Version</Text>
          </View>
        </View>

        {/* Language selector */}
        <Text style={s.sectionTitle}>Default Language</Text>
        <TouchableOpacity
          style={s.langSelector}
          onPress={() => setShowLangPicker(!showLangPicker)}
          activeOpacity={0.8}
        >
          <View style={s.langSelectorLeft}>
            <Text style={{ fontSize: 20 }}>🌐</Text>
            <View>
              <Text style={s.langSelectorLabel}>Input Language</Text>
              <Text style={s.langSelectorValue}>{selectedLanguageName || 'Hindi'}</Text>
            </View>
          </View>
          <Text style={{ color: COLORS.saffron, fontSize: 16 }}>{showLangPicker ? '▴' : '▾'}</Text>
        </TouchableOpacity>

        {showLangPicker && (
          <View style={s.langPicker}>
            {LANG_ENTRIES.map(([name, code]) => (
              <TouchableOpacity
                key={code}
                style={[s.langOption, selectedLanguage === code && s.langOptionActive]}
                onPress={() => { setFields({ selectedLanguage: code, selectedLanguageName: name }); setShowLangPicker(false); }}
              >
                <Text style={[s.langOptionText, selectedLanguage === code && { color: COLORS.saffron, fontWeight: '700' }]}>
                  {name}
                </Text>
                {selectedLanguage === code && <Text style={{ color: COLORS.saffron }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick nav */}
        <Text style={s.sectionTitle}>Quick Access</Text>
        <View style={s.menuCard}>
          {MENU_ROWS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.menuRow, i < MENU_ROWS.length - 1 && s.menuRowBorder]}
              onPress={() => router.push(item.route)}
              activeOpacity={0.7}
            >
              <View style={s.menuIconWrap}>
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Text style={{ color: COLORS.faded, fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.footer}>SeedlingSpeaks · Built by Seedlinglabs</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 14,
  },
  menuBtn: { padding: 4, justifyContent: 'center' },
  menuLine: { width: 22, height: 2, borderRadius: 2, backgroundColor: COLORS.ink, marginVertical: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink },

  content: { paddingHorizontal: 20, paddingTop: 28 },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.saffron,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: COLORS.saffron, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 22, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  userEmail: { fontSize: 14, color: COLORS.muted },

  statsRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 28, overflow: 'hidden',
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statVal: { fontSize: 22, fontWeight: '800', color: COLORS.saffron, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2, fontWeight: '600' },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.faded,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  langSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 8,
  },
  langSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langSelectorLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '600', marginBottom: 2 },
  langSelectorValue: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  langPicker: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 16, overflow: 'hidden',
  },
  langOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  langOptionActive: { backgroundColor: COLORS.saffronLight },
  langOptionText: { fontSize: 14, color: COLORS.warm, fontWeight: '500' },

  menuCard: {
    backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 24, overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, gap: 14,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: COLORS.ink, marginBottom: 1 },
  menuSub: { fontSize: 12, color: COLORS.muted },

  signOutBtn: {
    backgroundColor: '#FFF0EE', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.2)',
    marginBottom: 24,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: COLORS.redSoft },

  footer: { textAlign: 'center', fontSize: 12, color: COLORS.faded },
});
