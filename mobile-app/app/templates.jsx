import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../src/constants/colors';
import { TONES } from '../src/constants/languages';
import { useApp } from '../src/context/AppContext';

const TONE_COLORS = {
  'Email Formal': '#3D4F8A',
  'Email Casual': '#2D6A4F',
  Slack: '#E8820C',
  LinkedIn: '#1A4480',
  'WhatsApp Business': '#2D6A4F',
  'User Override': '#8C7B6B',
};

export default function TemplatesScreen() {
  const insets = useSafeAreaInsets();
  const { state, deleteTemplate, clearTemplates } = useApp();
  const [search, setSearch] = useState('');
  const [filterTone, setFilterTone] = useState('All');

  const { savedTemplates } = state;

  const filtered = savedTemplates.filter((t) => {
    if (filterTone !== 'All' && t.tone !== filterTone) return false;
    if (search && !t.text?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={st.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>Templates</Text>
        <Text style={st.countBadge}>{savedTemplates.length}</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <TextInput style={st.searchInput} placeholder="Search templates..." placeholderTextColor={COLORS.faded} value={search} onChangeText={setSearch} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginBottom: 8 }}>
          {['All', ...TONES.filter((t) => t !== 'User Override')].map((tone) => (
            <TouchableOpacity key={tone} style={[st.toneChip, filterTone === tone && st.toneChipActive]} onPress={() => setFilterTone(tone)}>
              <Text style={[st.toneChipText, filterTone === tone && { color: COLORS.saffron }]}>{tone}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 40 }]}>
        {filtered.length === 0 ? (
          <View style={st.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📑</Text>
            <Text style={st.emptyTitle}>No templates yet</Text>
            <Text style={st.emptySubtext}>Templates are saved when you retone text</Text>
          </View>
        ) : (
          filtered.map((t, i) => {
            const color = TONE_COLORS[t.tone] || COLORS.muted;
            return (
              <View key={i} style={st.card}>
                <View style={st.cardHeader}>
                  <View style={[st.toneBadge, { backgroundColor: color + '15' }]}>
                    <Text style={[st.toneBadgeText, { color }]}>{t.tone}</Text>
                  </View>
                  <Text style={st.dateText}>{t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</Text>
                </View>
                <Text style={st.templateText} numberOfLines={4}>{t.text}</Text>
                <View style={st.cardActions}>
                  <TouchableOpacity onPress={() => Clipboard.setStringAsync(t.text)}>
                    <Text style={st.actionText}>📋 Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteTemplate(i)}>
                    <Text style={[st.actionText, { color: COLORS.redSoft }]}>🗑 Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  backBtn: { fontSize: 15, fontWeight: '600', color: COLORS.saffron },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.ink },
  countBadge: { fontSize: 13, fontWeight: '700', color: COLORS.saffron, backgroundColor: COLORS.saffronLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  searchInput: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.ink, borderWidth: 1, borderColor: COLORS.border },
  toneChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  toneChipActive: { backgroundColor: COLORS.saffronLight, borderColor: COLORS.borderAccent },
  toneChipText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.warm },
  emptySubtext: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  toneBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  toneBadgeText: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 11, color: COLORS.faded },
  templateText: { fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: 20, paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.saffron },
});
