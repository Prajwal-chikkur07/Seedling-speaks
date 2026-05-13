import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../src/constants/colors';
import { TARGET_LANGUAGES } from '../src/constants/languages';
import { useApp } from '../src/context/AppContext';
import api from '../src/services/api';

const LANG_ENTRIES = Object.entries(TARGET_LANGUAGES);
const { width } = Dimensions.get('window');

const QUICK_LANGS = ['Hindi', 'Tamil', 'Telugu', 'Bengali', 'Kannada'];

export default function EnglishToNativeScreen() {
  const insets = useSafeAreaInsets();
  const { addHistory, incrementUsage } = useApp();

  const [inputText,     setInputText]     = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLang,    setTargetLang]    = useState('hi-IN');
  const [targetLangName, setTargetLangName] = useState('Hindi');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showAllLangs,  setShowAllLangs]  = useState(false);
  const [copied,        setCopied]        = useState(false);

  async function handleTranslate() {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    try {
      const result = await api.translateText(inputText, targetLang);
      incrementUsage('sarvamCalls');
      setTranslatedText(result.translated_text);
      addHistory({
        id: Date.now().toString(),
        text: inputText,
        native: result.translated_text,
        language: targetLangName,
        timestamp: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const detail = e.response?.data?.detail || e.response?.data?.error || e.message;
      Alert.alert('Translation Failed', String(detail));
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleCopy() {
    if (!translatedText) return;
    await Clipboard.setStringAsync(translatedText);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  }

  function selectLang(name, code) {
    setTargetLang(code);
    setTargetLangName(name);
    setTranslatedText('');
    setShowAllLangs(false);
  }

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backLabel}>Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>English → Native</Text>
          <Text style={s.headerSub}>Text translation</Text>
        </View>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Language selector ── */}
        <View style={s.langSection}>
          <Text style={s.langSectionLabel}>Translate to</Text>

          {/* Quick language chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.quickLangRow}
          >
            {QUICK_LANGS.map((name) => {
              const code = TARGET_LANGUAGES[name];
              const active = targetLang === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[s.langChip, active && s.langChipActive]}
                  onPress={() => selectLang(name, code)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.langChipText, active && s.langChipTextActive]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[s.langChip, s.langChipMore]}
              onPress={() => setShowAllLangs(!showAllLangs)}
              activeOpacity={0.8}
            >
              <Text style={s.langChipMoreText}>
                {showAllLangs ? 'Less ▴' : 'More ▾'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* All languages dropdown */}
          {showAllLangs && (
            <View style={s.allLangGrid}>
              {LANG_ENTRIES.map(([name, code]) => {
                const active = targetLang === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[s.allLangItem, active && s.allLangItemActive]}
                    onPress={() => selectLang(name, code)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.allLangText, active && s.allLangTextActive]}>
                      {name}
                    </Text>
                    {active && <Text style={{ color: COLORS.saffron, fontSize: 12 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Input card ── */}
        <View style={s.inputCard}>
          <View style={s.cardTopRow}>
            <View style={s.langBadge}>
              <View style={[s.langDot, { backgroundColor: COLORS.indigo }]} />
              <Text style={s.langBadgeText}>English</Text>
            </View>
            {inputText.length > 0 && (
              <TouchableOpacity onPress={() => { setInputText(''); setTranslatedText(''); }}>
                <Text style={s.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={s.textArea}
            placeholder="Type or paste English text here…"
            placeholderTextColor={COLORS.faded}
            value={inputText}
            onChangeText={(t) => { setInputText(t); if (!t) setTranslatedText(''); }}
            multiline
            textAlignVertical="top"
            autoCorrect={false}
          />

          <View style={s.inputFooter}>
            <Text style={s.countText}>
              {wordCount > 0 ? `${wordCount} word${wordCount !== 1 ? 's' : ''} · ` : ''}
              {inputText.length} chars
            </Text>
          </View>
        </View>

        {/* ── Translate button ── */}
        <TouchableOpacity
          style={[s.translateBtn, (!inputText.trim() || isTranslating) && s.translateBtnDisabled]}
          onPress={handleTranslate}
          disabled={!inputText.trim() || isTranslating}
          activeOpacity={0.88}
        >
          {isTranslating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={s.translateIcon}>🌐</Text>
              <Text style={s.translateBtnText}>Translate to {targetLangName}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Output card ── */}
        {isTranslating ? (
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.saffron} />
            <Text style={s.loadingText}>Translating to {targetLangName}…</Text>
          </View>
        ) : translatedText ? (
          <View style={s.outputCard}>
            <View style={s.cardTopRow}>
              <View style={s.langBadge}>
                <View style={[s.langDot, { backgroundColor: COLORS.saffron }]} />
                <Text style={s.langBadgeText}>{targetLangName}</Text>
              </View>
              <TouchableOpacity
                style={[s.copyBtn, copied && s.copyBtnSuccess]}
                onPress={handleCopy}
                activeOpacity={0.8}
              >
                <Text style={[s.copyBtnText, copied && { color: COLORS.greenSoft }]}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.outputText} selectable>{translatedText}</Text>

            <View style={s.outputActions}>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => { setInputText(''); setTranslatedText(''); }}
                activeOpacity={0.8}
              >
                <Text style={s.actionBtnText}>↺ New translation</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : inputText.trim() ? null : (
          /* ── Empty hint ── */
          <View style={s.hintCard}>
            <Text style={s.hintTitle}>How it works</Text>
            {[
              { icon: '1️⃣', text: 'Choose your target language above' },
              { icon: '2️⃣', text: 'Type or paste any English text' },
              { icon: '3️⃣', text: 'Tap Translate to get the result' },
            ].map((step) => (
              <View key={step.text} style={s.hintRow}>
                <Text style={{ fontSize: 16 }}>{step.icon}</Text>
                <Text style={s.hintText}>{step.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 64 },
  backArrow: { fontSize: 24, color: COLORS.saffron, lineHeight: 26, marginTop: -2 },
  backLabel: { fontSize: 15, fontWeight: '600', color: COLORS.saffron },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink },
  headerSub: { fontSize: 11, color: COLORS.muted, marginTop: 1 },

  content: { paddingHorizontal: 20, paddingTop: 20 },

  // Language selector
  langSection: { marginBottom: 20 },
  langSectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.faded,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  quickLangRow: { gap: 8, paddingRight: 4 },
  langChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  langChipActive: {
    backgroundColor: COLORS.saffron, borderColor: COLORS.saffron,
    shadowColor: COLORS.saffron, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  langChipText: { fontSize: 13, fontWeight: '600', color: COLORS.warm },
  langChipTextActive: { color: '#fff' },
  langChipMore: { backgroundColor: 'transparent', borderColor: COLORS.border, borderStyle: 'dashed' },
  langChipMoreText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },

  allLangGrid: {
    marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12,
  },
  allLangItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
  },
  allLangItemActive: {
    backgroundColor: COLORS.saffronLight,
    borderColor: 'rgba(232,130,12,0.35)',
  },
  allLangText: { fontSize: 13, fontWeight: '600', color: COLORS.warm },
  allLangTextActive: { color: COLORS.saffronHover },

  // Input card
  inputCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  langBadge: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  langDot: { width: 8, height: 8, borderRadius: 4 },
  langBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  clearText: { fontSize: 13, fontWeight: '600', color: COLORS.redSoft },
  textArea: {
    fontSize: 16, color: COLORS.ink, lineHeight: 24,
    minHeight: 130, textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  countText: { fontSize: 11, color: COLORS.faded, fontWeight: '500' },

  // Translate button
  translateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: COLORS.saffron, borderRadius: 16,
    paddingVertical: 16, marginBottom: 14,
    shadowColor: COLORS.saffron, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  translateBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  translateIcon: { fontSize: 18 },
  translateBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  // Loading card
  loadingCard: {
    alignItems: 'center', paddingVertical: 40, gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  loadingText: { fontSize: 15, color: COLORS.muted, fontWeight: '600' },

  // Output card
  outputCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(232,130,12,0.2)',
    padding: 16,
    shadowColor: COLORS.saffron, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  outputText: {
    fontSize: 18, color: COLORS.ink, lineHeight: 28,
    fontWeight: '500', marginVertical: 14,
  },
  copyBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 9, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  copyBtnSuccess: {
    borderColor: 'rgba(45,106,79,0.25)', backgroundColor: '#EAF4EE',
  },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.warm },
  outputActions: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: {
    alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },

  // Hint card
  hintCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 20, gap: 12,
  },
  hintTitle: {
    fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 4,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hintText: { fontSize: 14, color: COLORS.muted, lineHeight: 20, flex: 1 },
});
