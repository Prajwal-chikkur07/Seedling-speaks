import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../src/constants/colors';
import { useApp } from '../src/context/AppContext';

export default function DictionaryScreen() {
  const insets = useSafeAreaInsets();
  const { state, saveDictionary } = useApp();
  const [native, setNative] = useState('');
  const [english, setEnglish] = useState('');
  const [search, setSearch] = useState('');

  const { customDictionary } = state;

  function handleAdd() {
    if (!native.trim() || !english.trim()) return;
    saveDictionary([...customDictionary, { native: native.trim(), english: english.trim() }]);
    setNative('');
    setEnglish('');
  }

  function handleDelete(index) {
    saveDictionary(customDictionary.filter((_, i) => i !== index));
  }

  function handleClearAll() {
    Alert.alert('Clear Dictionary', 'Remove all custom terms?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => saveDictionary([]) },
    ]);
  }

  const filtered = customDictionary.filter((entry) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return entry.native.toLowerCase().includes(q) || entry.english.toLowerCase().includes(q);
  });

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={st.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>Dictionary</Text>
        <Text style={st.countBadge}>{customDictionary.length} terms</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        {/* Add Form */}
        <View style={st.addForm}>
          <Text style={st.formLabel}>Add Custom Term</Text>
          <View style={st.inputRow}>
            <TextInput style={[st.input, { flex: 1 }]} placeholder="Original term" placeholderTextColor={COLORS.faded} value={native} onChangeText={setNative} />
            <TextInput style={[st.input, { flex: 1 }]} placeholder="Keep as (English)" placeholderTextColor={COLORS.faded} value={english} onChangeText={setEnglish} />
            <TouchableOpacity style={[st.addBtn, (!native.trim() || !english.trim()) && { opacity: 0.5 }]} onPress={handleAdd} disabled={!native.trim() || !english.trim()}>
              <Text style={st.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <TextInput style={st.searchInput} placeholder="Search terms..." placeholderTextColor={COLORS.faded} value={search} onChangeText={setSearch} />

        {/* Clear All */}
        {customDictionary.length > 0 && (
          <TouchableOpacity style={st.clearBtn} onPress={handleClearAll}>
            <Text style={st.clearBtnText}>🗑 Clear All</Text>
          </TouchableOpacity>
        )}

        {/* Term List */}
        {filtered.length === 0 ? (
          <View style={st.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📖</Text>
            <Text style={st.emptyTitle}>{search ? 'No matching terms' : 'No custom terms yet'}</Text>
            <Text style={st.emptySubtext}>Add terms that should be preserved during tone rewriting</Text>
          </View>
        ) : (
          <View style={st.table}>
            <View style={st.tableHeader}>
              <Text style={[st.tableHeaderText, { flex: 1 }]}>Original</Text>
              <Text style={[st.tableHeaderText, { flex: 1 }]}>Keep as</Text>
              <Text style={[st.tableHeaderText, { width: 40 }]} />
            </View>
            {filtered.map((entry, i) => (
              <View key={i} style={st.tableRow}>
                <Text style={[st.cellText, { flex: 1 }]}>{entry.native}</Text>
                <Text style={[st.cellText, { flex: 1, fontWeight: '600' }]}>{entry.english}</Text>
                <TouchableOpacity style={{ width: 40, alignItems: 'center' }} onPress={() => handleDelete(customDictionary.indexOf(entry))}>
                  <Text style={{ color: COLORS.redSoft }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
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
  countBadge: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  addForm: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  formLabel: { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, fontSize: 13, color: COLORS.ink, borderWidth: 1, borderColor: COLORS.border },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.saffron, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  searchInput: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.ink, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  clearBtn: { alignSelf: 'flex-end', marginBottom: 12 },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.redSoft },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.warm },
  emptySubtext: { fontSize: 13, color: COLORS.muted, marginTop: 4, textAlign: 'center' },
  table: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 12, backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  cellText: { fontSize: 14, color: COLORS.ink },
});
