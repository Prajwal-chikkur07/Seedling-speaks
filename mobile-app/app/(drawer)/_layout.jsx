import { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Image,
} from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/colors';
import { DrawerContext } from '../../src/context/DrawerContext';
import FloatingAssistant from '../../src/components/FloatingAssistant';

const DRAWER_WIDTH = 300;

const MENU_SECTIONS = [
  {
    title: null,
    items: [
      { name: 'index', label: 'Home', icon: '🏠', route: '/(drawer)' },
    ],
  },
  {
    title: 'Translate',
    items: [
      { name: 'native-to-english', label: 'Speech to Text',      icon: '🎙️', route: '/(drawer)/native-to-english' },
      { name: 'continuous',        label: 'Continuous Listening', icon: '👂', route: '/(drawer)/continuous'        },
      { name: 'english-to-native', label: 'English → Native',     icon: '🌐', route: '/english-to-native'          },
      { name: 'vision',            label: 'Vision Translate',      icon: '📷', route: '/vision'                    },
      { name: 'video',             label: 'Video Subtitles',       icon: '🎬', route: '/video'                     },
    ],
  },
  {
    title: 'Account',
    items: [
      { name: 'history',        label: 'History',  icon: '🕐', route: '/(drawer)/history'  },
      { name: 'keyboard-setup', label: 'Keyboard', icon: '⌨️', route: '/keyboard-setup'    },
      { name: 'profile',        label: 'Profile',  icon: '👤', route: '/(drawer)/profile'  },
      { name: 'settings',       label: 'Settings', icon: '⚙️', route: '/(drawer)/settings' },
    ],
  },
];

function DrawerContent({ closeDrawer }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const insets   = useSafeAreaInsets();

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User'
    : 'User';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const email    = user?.primaryEmailAddress?.emailAddress || '';

  function isActive(item) {
    if (item.name === 'index') return pathname === '/' || pathname === '/(drawer)';
    return pathname.includes(item.name);
  }

  return (
    <View style={[ds.container, { paddingTop: insets.top }]}>
      {/* Profile header */}
      <View style={ds.profileSection}>
        <View style={ds.avatar}>
          <Text style={ds.avatarText}>{initials}</Text>
        </View>
        <View style={ds.profileInfo}>
          <Text style={ds.profileName} numberOfLines={1}>{displayName}</Text>
          <Text style={ds.profileEmail} numberOfLines={1}>{email}</Text>
        </View>
      </View>

      <View style={ds.divider} />

      {/* Menu */}
      <ScrollView
        style={ds.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 8 }}
      >
        {MENU_SECTIONS.map((section, si) => (
          <View key={si}>
            {section.title && (
              <Text style={ds.sectionLabel}>{section.title.toUpperCase()}</Text>
            )}
            {section.items.map((item) => {
              const active = isActive(item);
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[ds.menuItem, active && ds.menuItemActive]}
                  activeOpacity={0.7}
                  onPress={() => { closeDrawer(); setTimeout(() => router.push(item.route), 180); }}
                >
                  <View style={[ds.menuIconWrap, active && ds.menuIconWrapActive]}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                  </View>
                  <Text style={[ds.menuLabel, active && ds.menuLabelActive]}>
                    {item.label}
                  </Text>
                  {active && <View style={ds.activeDot} />}
                </TouchableOpacity>
              );
            })}
            {si < MENU_SECTIONS.length - 1 && <View style={ds.sectionDivider} />}
          </View>
        ))}

        <View style={ds.footer}>
          <Image source={require('../../assets/logo.png')} style={ds.footerLogo} />
          <Text style={ds.footerText}>SeedlingSpeaks v2.5</Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default function DrawerLayout() {
  const translateX     = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  function openDrawer() {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 65, friction: 13 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.spring(translateX, { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 65, friction: 13 }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setIsOpen(false));
  }

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={{ flex: 1 }}>
        <Slot />
        <FloatingAssistant />

        {isOpen && (
          <Animated.View style={[ds.overlay, { opacity: overlayOpacity }]} pointerEvents="auto">
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
        )}

        <Animated.View
          style={[ds.drawer, { transform: [{ translateX }] }]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <DrawerContent closeDrawer={closeDrawer} />
        </Animated.View>
      </View>
    </DrawerContext.Provider>
  );
}

const ds = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: DRAWER_WIDTH, zIndex: 11,
    backgroundColor: COLORS.bg,
    shadowColor: '#000', shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 24,
  },
  container: { flex: 1, backgroundColor: COLORS.bg },

  profileSection: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20, gap: 14,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.saffron,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.saffron, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: COLORS.ink, marginBottom: 2 },
  profileEmail: { fontSize: 12, color: COLORS.muted, fontWeight: '500' },

  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20 },
  scroll: { flex: 1 },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: COLORS.faded,
    letterSpacing: 1.2, textTransform: 'uppercase',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 16,
    marginHorizontal: 10, borderRadius: 14, gap: 12,
  },
  menuItemActive: { backgroundColor: COLORS.saffronLight },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  menuIconWrapActive: {
    backgroundColor: 'rgba(232,130,12,0.12)',
    borderColor: 'rgba(232,130,12,0.3)',
  },
  menuLabel: { fontSize: 14, fontWeight: '500', color: COLORS.warm, flex: 1 },
  menuLabelActive: { fontWeight: '700', color: COLORS.saffronHover },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.saffron },

  sectionDivider: {
    height: 1, backgroundColor: COLORS.border,
    marginHorizontal: 24, marginVertical: 8,
  },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    marginTop: 28, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    marginHorizontal: 20,
  },
  footerLogo: { width: 18, height: 18, borderRadius: 4, opacity: 0.5 },
  footerText: { fontSize: 11, color: COLORS.faded, fontWeight: '600' },
});
