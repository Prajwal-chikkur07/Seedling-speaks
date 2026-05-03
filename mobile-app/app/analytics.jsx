import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { COLORS } from '../src/constants/colors';
import { useApp } from '../src/context/AppContext';

const LANG_COLORS = {
  Hindi: '#E8820C', Bengali: '#3D4F8A', Tamil: '#2D6A4F', Telugu: '#C0392B',
  Malayalam: '#7C3AED', Marathi: '#0EA5E9', Gujarati: '#D4A017', Kannada: '#F43F5E',
  Punjabi: '#10B981', Odia: '#1A4480',
};

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const { transcriptHistory, starredIds, usageStats } = state;

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = transcriptHistory.filter((h) => new Date(h.timestamp) > weekAgo).length;

    const confs = transcriptHistory.filter((h) => h.confidence != null).map((h) => h.confidence);
    const avgConf = confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : 0;

    const langCounts = {};
    transcriptHistory.forEach((h) => {
      const lang = h.language || 'Unknown';
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    const dailyCounts = Array(7).fill(0);
    transcriptHistory.forEach((h) => {
      const d = new Date(h.timestamp);
      const diff = Math.floor((now - d) / (24 * 60 * 60 * 1000));
      if (diff >= 0 && diff < 7) dailyCounts[6 - diff]++;
    });

    return { thisWeek, avgConf, langCounts, dailyCounts };
  }, [transcriptHistory]);

  const maxDaily = Math.max(...stats.dailyCounts, 1);
  const dayLabels = Array(7).fill(0).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-IN', { weekday: 'short' });
  });

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={st.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>Analytics</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 40 }]}>
        {/* Stat Cards */}
        <View style={st.statGrid}>
          {[
            { val: transcriptHistory.length, label: 'Total Transcripts', icon: '📝' },
            { val: stats.thisWeek, label: 'This Week', icon: '📅' },
            { val: `${stats.avgConf}%`, label: 'Avg Confidence', icon: '🎯' },
            { val: starredIds.length, label: 'Starred', icon: '⭐' },
          ].map((s2) => (
            <View key={s2.label} style={st.statCard}>
              <Text style={{ fontSize: 20 }}>{s2.icon}</Text>
              <Text style={st.statVal}>{s2.val}</Text>
              <Text style={st.statLabel}>{s2.label}</Text>
            </View>
          ))}
        </View>

        {/* API Calls */}
        <Text style={st.sectionTitle}>API Usage</Text>
        <View style={st.apiRow}>
          {[
            { label: 'Sarvam', val: usageStats.sarvamCalls, color: COLORS.saffron },
            { label: 'Gemini', val: usageStats.geminiCalls, color: COLORS.indigo },
            { label: 'Cache Hits', val: usageStats.cacheHits, color: COLORS.greenSoft },
          ].map((a) => (
            <View key={a.label} style={st.apiCard}>
              <Text style={[st.apiVal, { color: a.color }]}>{a.val}</Text>
              <Text style={st.apiLabel}>{a.label}</Text>
            </View>
          ))}
        </View>

        {/* Daily Activity */}
        <Text style={st.sectionTitle}>Daily Activity (7 days)</Text>
        <View style={st.chartCard}>
          <View style={st.barChart}>
            {stats.dailyCounts.map((count, i) => (
              <View key={i} style={st.barCol}>
                <View style={[st.bar, { height: Math.max((count / maxDaily) * 100, 4), backgroundColor: count > 0 ? COLORS.saffron : COLORS.border }]} />
                <Text style={st.barLabel}>{dayLabels[i]}</Text>
                <Text style={st.barCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Language Usage */}
        <Text style={st.sectionTitle}>Language Usage</Text>
        <View style={st.langCard}>
          {Object.entries(stats.langCounts).length === 0 ? (
            <Text style={st.emptyText}>No data yet</Text>
          ) : (
            Object.entries(stats.langCounts).sort((a, b) => b[1] - a[1]).map(([lang, count]) => {
              const total = transcriptHistory.length || 1;
              const pct = Math.round((count / total) * 100);
              const color = LANG_COLORS[lang] || COLORS.muted;
              return (
                <View key={lang} style={st.langRow}>
                  <Text style={st.langName}>{lang}</Text>
                  <View style={st.langBarBg}>
                    <View style={[st.langBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={st.langCount}>{count}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { fontSize: 15, fontWeight: '600', color: COLORS.saffron },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '800', color: COLORS.ink, marginTop: 4 },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2, fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 12 },
  apiRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  apiCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  apiVal: { fontSize: 20, fontWeight: '800' },
  apiLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2, fontWeight: '500' },
  chartCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140 },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 20, borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 10, color: COLORS.faded, marginTop: 6 },
  barCount: { fontSize: 10, color: COLORS.muted, fontWeight: '600', marginTop: 2 },
  langCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  langRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  langName: { width: 80, fontSize: 13, fontWeight: '600', color: COLORS.ink },
  langBarBg: { flex: 1, height: 8, backgroundColor: COLORS.bg, borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  langBarFill: { height: '100%', borderRadius: 4 },
  langCount: { width: 30, fontSize: 12, fontWeight: '700', color: COLORS.muted, textAlign: 'right' },
  emptyText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingVertical: 20 },
});
