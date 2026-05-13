import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { COLORS, CONFIDENCE_COLOR } from '../../src/constants/colors';
import { TARGET_LANGUAGES, TONES } from '../../src/constants/languages';
import { useApp } from '../../src/context/AppContext';
import { useDrawer } from '../../src/context/DrawerContext';
import api from '../../src/services/api';

const { width } = Dimensions.get('window');
const MODES = ['Transcript', 'Retoned', 'Translated'];

export default function NativeToEnglishScreen() {
  const insets = useSafeAreaInsets();
  const { state, setField, setFields, addHistory, incrementUsage, showError } = useApp();
  const { openDrawer } = useDrawer();

  const [recording,    setRecording]    = useState(null);
  const [isRecording,  setIsRecording]  = useState(false);
  const [timer,        setTimer]        = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [retoning,     setRetoning]     = useState(false);
  const [translating,  setTranslating]  = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [mode,         setMode]         = useState('Transcript');
  const [showTones,    setShowTones]    = useState(false);
  const [showLangs,    setShowLangs]    = useState(false);

  const timerRef  = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const {
    englishText, nativeTranscript, rewrittenText,
    nativeTranslation, confidenceScore,
    selectedLanguage, selectedLanguageName, selectedTone,
  } = state;

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }

  function stopPulse() {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }

  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Microphone access is required.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
      setTimer(0);
      startPulse();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } catch (e) {
      showError('Failed to start recording: ' + e.message);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    clearInterval(timerRef.current);
    setIsRecording(false);
    stopPulse();
    setTranscribing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      const result = await api.translateAudioFromBlob(uri, selectedLanguage);
      incrementUsage('sarvamCalls');
      setFields({
        englishText: result.transcript || '',
        nativeTranscript: result.native_transcript || '',
        confidenceScore: result.confidence ? Math.round(result.confidence * 100) : null,
      });
      if (result.transcript) {
        addHistory({
          id: Date.now().toString(),
          text: result.transcript || '',
          native: result.native_transcript || '',
          language: selectedLanguageName,
          confidence: result.confidence ? Math.round(result.confidence * 100) : null,
          timestamp: new Date().toISOString(),
        });
      }
      setMode('Transcript');
    } catch (e) {
      const detail = e.response?.data?.detail || e.response?.data?.error || e.message;
      Alert.alert('Transcription Failed', String(detail));
    } finally {
      setTranscribing(false);
    }
  }

  async function handleRetone(tone) {
    if (!englishText) return;
    setShowTones(false);
    setField('selectedTone', tone);
    setRetoning(true);
    try {
      const result = await api.rewriteTone(englishText, tone);
      incrementUsage('geminiCalls');
      setField('rewrittenText', result.rewritten_text);
      setMode('Retoned');
    } catch (e) {
      showError('Retoning failed: ' + e.message);
    } finally {
      setRetoning(false);
    }
  }

  async function handleTranslate() {
    const text = rewrittenText || englishText;
    if (!text) return;
    setTranslating(true);
    try {
      const result = await api.translateText(text, selectedLanguage);
      incrementUsage('sarvamCalls');
      setField('nativeTranslation', result.translated_text);
      setMode('Translated');
    } catch (e) {
      showError('Translation failed: ' + e.message);
    } finally {
      setTranslating(false);
    }
  }

  async function handleCopy() {
    const text = activeText;
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClear() {
    setFields({ englishText: '', nativeTranscript: '', rewrittenText: '', nativeTranslation: '', confidenceScore: null, selectedTone: '' });
    setMode('Transcript');
  }

  const activeText = mode === 'Translated' ? nativeTranslation
    : mode === 'Retoned' ? rewrittenText
    : englishText;
  const wordCount = activeText ? activeText.trim().split(/\s+/).filter(Boolean).length : 0;
  const fmtTime   = `${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`;

  const isLoading = transcribing || retoning || translating;
  const loadingMsg = transcribing ? 'Transcribing audio…' : retoning ? 'Shaping message…' : 'Translating…';

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={st.header}>
        <TouchableOpacity onPress={openDrawer} style={st.menuBtn} activeOpacity={0.7}>
          <View style={st.menuLine} />
          <View style={[st.menuLine, { width: 16 }]} />
          <View style={st.menuLine} />
        </TouchableOpacity>
        <View>
          <Text style={st.headerTitle}>Speech to Text</Text>
          <Text style={st.headerSub}>
            {selectedLanguageName} → English
          </Text>
        </View>
        <TouchableOpacity
          style={st.langBtn}
          onPress={() => { setShowLangs(!showLangs); setShowTones(false); }}
          activeOpacity={0.8}
        >
          <Text style={st.langBtnText} numberOfLines={1}>
            {selectedLanguageName || 'Hindi'}
          </Text>
          <Text style={{ fontSize: 10, color: COLORS.saffron }}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* ── Language picker dropdown ── */}
      {showLangs && (
        <View style={st.dropdown}>
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {Object.entries(TARGET_LANGUAGES).map(([name, code]) => (
              <TouchableOpacity
                key={code}
                style={[st.dropItem, selectedLanguage === code && st.dropItemActive]}
                onPress={() => {
                  setFields({ selectedLanguage: code, selectedLanguageName: name });
                  setShowLangs(false);
                }}
              >
                <Text style={[st.dropText, selectedLanguage === code && { color: COLORS.saffron, fontWeight: '700' }]}>
                  {name}
                </Text>
                {selectedLanguage === code && <Text style={{ color: COLORS.saffron }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Loading state ── */}
        {isLoading ? (
          <View style={st.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.saffron} />
            <Text style={st.loadingText}>{loadingMsg}</Text>
          </View>
        ) : englishText ? (
          <>
            {/* ── Mode tabs ── */}
            <View style={st.tabs}>
              {MODES.map((m) => {
                const disabled = (m === 'Retoned' && !rewrittenText) || (m === 'Translated' && !nativeTranslation);
                return (
                  <TouchableOpacity
                    key={m}
                    style={[st.tab, mode === m && st.tabActive, disabled && st.tabDisabled]}
                    onPress={() => !disabled && setMode(m)}
                    activeOpacity={disabled ? 1 : 0.8}
                  >
                    <Text style={[st.tabText, mode === m && st.tabTextActive, disabled && st.tabTextDisabled]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Output card ── */}
            <View style={st.outputCard}>
              <View style={st.outputTop}>
                <Text style={st.outputLabel}>{mode}</Text>
                {confidenceScore != null && mode === 'Transcript' && (
                  <View style={[st.confidenceBadge, { backgroundColor: CONFIDENCE_COLOR(confidenceScore) + '18' }]}>
                    <View style={[st.confidenceDot, { backgroundColor: CONFIDENCE_COLOR(confidenceScore) }]} />
                    <Text style={[st.confidenceText, { color: CONFIDENCE_COLOR(confidenceScore) }]}>
                      {confidenceScore}% confidence
                    </Text>
                  </View>
                )}
              </View>

              <TextInput
                style={st.outputText}
                value={activeText}
                onChangeText={(t) => { if (mode === 'Transcript') setField('englishText', t); }}
                multiline
                editable={mode === 'Transcript'}
                textAlignVertical="top"
                placeholder="Your transcript will appear here…"
                placeholderTextColor={COLORS.faded}
              />

              <View style={st.outputFooter}>
                <Text style={st.wordCount}>{wordCount} words</Text>
                <View style={st.outputActions}>
                  <TouchableOpacity style={[st.actionChip, copied && st.actionChipSuccess]} onPress={handleCopy}>
                    <Text style={[st.actionChipText, copied && { color: COLORS.greenSoft }]}>
                      {copied ? '✓ Copied' : '📋 Copy'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.actionChip, { borderColor: 'rgba(192,57,43,0.2)' }]} onPress={handleClear}>
                    <Text style={[st.actionChipText, { color: COLORS.redSoft }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── Action buttons ── */}
            <View style={st.actionRow}>
              <TouchableOpacity
                style={[st.actionBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
                onPress={() => { setShowTones(!showTones); setShowLangs(false); }}
                activeOpacity={0.8}
              >
                <Text style={st.actionBtnLabel}>
                  {selectedTone ? `✦ ${selectedTone}` : '✦ Retone'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.actionBtn, { backgroundColor: COLORS.ink }]}
                onPress={handleTranslate}
                disabled={translating}
                activeOpacity={0.85}
              >
                {translating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[st.actionBtnLabel, { color: '#fff' }]}>🌐 Translate</Text>
                }
              </TouchableOpacity>
            </View>

            {/* ── Tone picker ── */}
            {showTones && (
              <View style={st.dropdown}>
                {TONES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[st.dropItem, selectedTone === t && st.dropItemActive]}
                    onPress={() => handleRetone(t)}
                  >
                    <Text style={[st.dropText, selectedTone === t && { color: COLORS.saffron, fontWeight: '700' }]}>
                      {t}
                    </Text>
                    {selectedTone === t && <Text style={{ color: COLORS.saffron }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : (
          /* ── Empty / ready state ── */
          <View style={st.emptyState}>
            <View style={st.emptyIconWrap}>
              <Text style={{ fontSize: 40 }}>🎙️</Text>
            </View>
            <Text style={st.emptyTitle}>Ready to listen</Text>
            <Text style={st.emptyDesc}>
              Press the mic button below and speak in{' '}
              <Text style={{ fontWeight: '700', color: COLORS.saffron }}>{selectedLanguageName || 'Hindi'}</Text>
            </Text>

            <View style={st.tipsRow}>
              {['Speak clearly', 'Good microphone', 'Quiet room'].map((tip) => (
                <View key={tip} style={st.tipChip}>
                  <Text style={st.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Recording bar ── */}
      <View style={[st.recordBar, { paddingBottom: insets.bottom + 16 }]}>
        {isRecording ? (
          <View style={st.recordingRow}>
            <View style={st.timerDisplay}>
              <Animated.View style={[st.recDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={st.timerText}>{fmtTime}</Text>
            </View>
            <TouchableOpacity style={st.stopBtn} onPress={stopRecording} activeOpacity={0.85}>
              <View style={st.stopIcon} />
              <Text style={st.stopBtnText}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[st.micBtn, transcribing && { opacity: 0.6 }]}
            onPress={startRecording}
            disabled={transcribing}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 20 }}>🎙</Text>
            <Text style={st.micBtnText}>Start Speaking</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 12,
  },
  menuBtn: { padding: 4, gap: 4, justifyContent: 'center' },
  menuLine: { width: 22, height: 2, borderRadius: 2, backgroundColor: COLORS.ink, marginVertical: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink },
  headerSub: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  langBtn: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.saffronLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(232,130,12,0.2)',
  },
  langBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.saffronHover, maxWidth: 80 },

  // Dropdown
  dropdown: {
    marginHorizontal: 20, marginTop: 0,
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
    zIndex: 10, overflow: 'hidden',
  },
  dropItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dropItemActive: { backgroundColor: COLORS.saffronLight },
  dropText: { fontSize: 14, color: COLORS.warm, fontWeight: '500' },

  // Content
  content: { paddingHorizontal: 20, paddingTop: 20 },

  // Loading
  loadingCard: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, gap: 16,
  },
  loadingText: { fontSize: 15, color: COLORS.muted, fontWeight: '600' },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  tabActive: { backgroundColor: COLORS.ink },
  tabDisabled: { opacity: 0.35 },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  tabTextActive: { color: '#fff' },
  tabTextDisabled: { color: COLORS.faded },

  // Output card
  outputCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  outputTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  outputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  confidenceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  confidenceDot: { width: 6, height: 6, borderRadius: 3 },
  confidenceText: { fontSize: 11, fontWeight: '700' },
  outputText: {
    fontSize: 15, color: COLORS.ink, lineHeight: 23,
    minHeight: 120, textAlignVertical: 'top',
  },
  outputFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  wordCount: { fontSize: 12, color: COLORS.faded, fontWeight: '500' },
  outputActions: { flexDirection: 'row', gap: 8 },
  actionChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
  },
  actionChipSuccess: { borderColor: 'rgba(45,106,79,0.25)', backgroundColor: '#EAF4EE' },
  actionChipText: { fontSize: 12, fontWeight: '600', color: COLORS.warm },

  // Action row
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 14,
    borderWidth: 1, gap: 6,
  },
  actionBtnLabel: { fontSize: 14, fontWeight: '700', color: COLORS.ink },

  // Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.saffronLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(232,130,12,0.2)',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  tipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  tipChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  tipText: { fontSize: 12, color: COLORS.warm, fontWeight: '600' },

  // Record bar
  recordBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  recordingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  timerDisplay: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  recDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53E3E',
  },
  timerText: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontVariant: ['tabular-nums'] },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E53E3E', borderRadius: 14,
    paddingHorizontal: 22, paddingVertical: 14,
  },
  stopIcon: { width: 12, height: 12, borderRadius: 2, backgroundColor: '#fff' },
  stopBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  micBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: COLORS.saffron, borderRadius: 16,
    paddingVertical: 16,
    shadowColor: COLORS.saffron, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  micBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});
