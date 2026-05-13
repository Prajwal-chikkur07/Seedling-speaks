import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { COLORS, CONFIDENCE_COLOR } from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { useDrawer } from '../../src/context/DrawerContext';

export default function HistoryScreen() {
  const insets  = useSafeAreaInsets();
  const { state, deleteHistory, clearHistory, toggleStar, setFields } = useApp();
  const { openDrawer } = useDrawer();
  const [search,      setSearch]      = useState('');
  const [showStarred, setShowStarred] = useState(false);
  const [copiedId,    setCopiedId]    = useState(null);

  const { transcriptHistory = [], starredIds = [] } = state;

  const filtered = transcriptHistory.filter((entry) => {
    if (showStarred && !starredIds.includes(entry.id)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!entry.text?.toLowerCase().includes(q) && !entry.native?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function handleCopy(entry) {
    await Clipboard.setStringAsync(entry.text || '');
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleRestore(entry) {
    setFields({ englishText: entry.text || '', nativeTranscript: entry.native || '', confidenceScore: entry.confidence || null });
  }

  function handleClearAll() {
    Alert.alert('Clear History', 'Delete all transcripts? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearHistory },
    ]);
  }

  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={openDrawer} style={s.menuBtn} activeOpacity={0.7}>
          <View style={s.menuLine} />
          <View style={[s.menuLine, { width: 16 }]} />
          <View style={s.menuLine} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>History</Text>
          <Text style={s.headerSub}>{transcriptHistory.length} transcripts</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity
            style={[s.filterBtn, showStarred && s.filterBtnActive]}
            onPress={() => setShowStarred(!showStarred)}
          >
            <Text style={[s.filterBtnText, showStarred && { color: COLORS.saffron }]}>
              {showStarred ? '⭐ Starred' : '☆ Star'}
            </Text>
          </TouchableOpacity>
          {transcriptHistory.length > 0 && (
            <TouchableOpacity style={s.clearBtn} onPress={handleClearAll}>
              <Text style={{ fontSize: 15 }}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search transcripts…"
          placeholderTextColor={COLORS.faded}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 6 }}>
            <Text style={{ fontSize: 14, color: COLORS.faded }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 44, marginBottom: 14 }}>
              {search || showStarred ? '🔍' : '🕐'}
            </Text>
            <Text style={s.emptyTitle}>
              {search || showStarred ? 'No matches found' : 'No history yet'}
            </Text>
            <Text style={s.emptyDesc}>
              {search || showStarred
                ? 'Try a different search term'
                : 'Transcripts appear here after recording'}
            </Text>
          </View>
        ) : (
          filtered.map((entry, i) => {
            const starred = starredIds.includes(entry.id);
            const conf    = entry.confidence;
            return (
              <View key={entry.id || i} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.langTag}>
                    <Text style={s.langTagText}>{entry.language || 'Unknown'}</Text>
                  </View>
                  {conf != null && (
                    <View style={[s.confBadge, { backgroundColor: CONFIDENCE_COLOR(conf) + '15' }]}>
                      <View style={[s.confDot, { backgroundColor: CONFIDENCE_COLOR(conf) }]} />
                      <Text style={[s.confText, { color: CONFIDENCE_COLOR(conf) }]}>{conf}%</Text>
                    </View>
                  )}
                  <Text style={s.dateText}>{fmtDate(entry.timestamp)}</Text>
                </View>

                <Text style={s.englishText} numberOfLines={3}>{entry.text}</Text>

                {entry.native ? (
                  <Text style={s.nativeText} numberOfLines={2}>{entry.native}</Text>
                ) : null}

                <View style={s.cardActions}>
                  <TouchableOpacity style={[s.cardBtn, starred && s.cardBtnStar]} onPress={() => toggleStar(entry.id)}>
                    <Text style={{ fontSize: 12 }}>{starred ? '⭐' : '☆'}</Text>
                    <Text style={[s.cardBtnText, starred && { color: COLORS.turmeric }]}>
                      {starred ? 'Starred' : 'Star'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.cardBtn} onPress={() => handleCopy(entry)}>
                    <Text style={{ fontSize: 12 }}>{copiedId === entry.id ? '✓' : '📋'}</Text>
                    <Text style={[s.cardBtnText, copiedId === entry.id && { color: COLORS.greenSoft }]}>
                      {copiedId === entry.id ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.cardBtn} onPress={() => handleRestore(entry)}>
                    <Text style={{ fontSize: 12 }}>↩</Text>
                    <Text style={s.cardBtnText}>Restore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.cardBtn, s.cardBtnDelete]} onPress={() => deleteHistory(entry.id)}>
                    <Text style={{ fontSize: 12 }}>🗑</Text>
                    <Text style={[s.cardBtnText, { color: COLORS.redSoft }]}>Delete</Text>
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  menuBtn: { padding: 4, justifyContent: 'center' },
  menuLine: { width: 22, height: 2, borderRadius: 2, backgroundColor: COLORS.ink, marginVertical: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink },
  headerSub: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.saffronLight, borderColor: 'rgba(232,130,12,0.25)' },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.warm },
  clearBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.15)',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 14, marginBottom: 4,
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.ink, paddingVertical: 11 },
  list: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  langTag: {
    backgroundColor: COLORS.saffronLight, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(232,130,12,0.2)',
  },
  langTagText: { fontSize: 11, fontWeight: '700', color: COLORS.saffronHover },
  confBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  confDot: { width: 5, height: 5, borderRadius: 3 },
  confText: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 11, color: COLORS.faded, marginLeft: 'auto', fontWeight: '500' },
  englishText: { fontSize: 14, color: COLORS.ink, lineHeight: 21, fontWeight: '500', marginBottom: 6 },
  nativeText: {
    fontSize: 13, color: COLORS.muted, lineHeight: 19,
    fontStyle: 'italic', marginBottom: 12,
    paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: COLORS.border,
  },
  cardActions: {
    flexDirection: 'row', gap: 6, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  cardBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 7, borderRadius: 9,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
  },
  cardBtnStar: { borderColor: 'rgba(212,160,23,0.3)', backgroundColor: '#FFFBEE' },
  cardBtnDelete: { borderColor: 'rgba(192,57,43,0.2)', backgroundColor: '#FFF8F8' },
  cardBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.warm },
});
