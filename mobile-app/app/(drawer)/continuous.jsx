import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../src/constants/colors';
import { TARGET_LANGUAGES } from '../../src/constants/languages';
import { useApp } from '../../src/context/AppContext';
import api from '../../src/services/api';
import { ensureMicPermission, startRecordingSession, stopRecordingSafely, resetAudioMode } from '../../src/services/recording';
import { useDrawer } from '../../src/context/DrawerContext';

const LANG_ENTRIES = Object.entries(TARGET_LANGUAGES);
const CHUNK_MS = 5000;

export default function ContinuousScreen() {
  const insets = useSafeAreaInsets();
  const { state, addHistory, showError, incrementUsage } = useApp();
  const { openDrawer } = useDrawer();

  const [sessionState, setSessionState] = useState('idle'); // idle | listening | paused | ended
  const [lines, setLines] = useState([]);
  const [selectedLang, setSelectedLang] = useState(state.selectedLanguage);
  const [selectedLangName, setSelectedLangName] = useState(state.selectedLanguageName);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [timer, setTimer] = useState(0);

  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const chunkRef = useRef(null);        // setTimeout handle for the next chunk
  const scrollRef = useRef(null);
  const activeRef = useRef(false);      // true while the session should keep recording
  const cycleRef = useRef(null);        // in-flight recordChunk promise (prevents overlap)
  const pendingRef = useRef(new Set()); // in-flight processChunk promises
  const stopRef = useRef(null);         // in-flight stopListening promise
  const linesRef = useRef([]);
  const langRef = useRef(selectedLang);
  langRef.current = selectedLang;

  function updateLines(fn) {
    linesRef.current = fn(linesRef.current);
    setLines(linesRef.current);
  }

  // Stop, unload and queue the current recording for transcription.
  async function flushRecording() {
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) return;
    const uri = await stopRecordingSafely(rec);
    if (uri) {
      const p = processChunk(uri);
      pendingRef.current.add(p);
      p.finally(() => pendingRef.current.delete(p));
    }
  }

  // One chunk cycle: flush the previous recording, start the next, then
  // schedule the following cycle. A setTimeout chain (not setInterval) so
  // cycles never overlap even when stop/start is slow.
  function recordChunk() {
    if (!activeRef.current || cycleRef.current) return cycleRef.current;
    cycleRef.current = (async () => {
      try {
        await flushRecording();
        if (!activeRef.current) return;
        recordingRef.current = await startRecordingSession();
        // Paused/ended while the recorder was starting: stop it right away.
        if (!activeRef.current) await flushRecording();
      } catch (e) {
        if (__DEV__) console.warn('[continuous] chunk error', e?.message || e);
      } finally {
        cycleRef.current = null;
      }
      if (activeRef.current) chunkRef.current = setTimeout(recordChunk, CHUNK_MS);
    })();
    return cycleRef.current;
  }

  // Stop recording (used by pause, end and when leaving the screen).
  function stopListening() {
    activeRef.current = false;
    clearTimeout(chunkRef.current);
    clearInterval(timerRef.current);
    stopRef.current = (async () => {
      await cycleRef.current;
      await flushRecording();
      await resetAudioMode();
    })();
    return stopRef.current;
  }

  // Drawer screens stay mounted, so stop the mic when the screen loses focus
  // (and on unmount) instead of recording in the background.
  useFocusEffect(useCallback(() => () => {
    if (activeRef.current || recordingRef.current) {
      stopListening();
      setSessionState((s) => (s === 'listening' ? 'paused' : s));
    }
  }, []));

  async function beginListening() {
    await stopRef.current; // let a pending pause/stop finish first
    activeRef.current = true;
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    recordChunk();
  }

  async function startSession() {
    try {
      if (!(await ensureMicPermission())) return;
      setSessionState('listening');
      updateLines(() => []);
      setTimer(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await beginListening();
    } catch (e) {
      showError('Failed to start session: ' + e.message);
    }
  }

  async function processChunk(uri) {
    const lineId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    updateLines((prev) => [...prev, { id: lineId, text: '', processing: true }]);
    try {
      const result = await api.translateAudioFromBlob(uri, langRef.current);
      incrementUsage('sarvamCalls');
      if (result.transcript && result.transcript.trim()) {
        updateLines((prev) => prev.map((l) => l.id === lineId ? { ...l, text: result.transcript, native: result.native_transcript, processing: false } : l));
      } else {
        updateLines((prev) => prev.filter((l) => l.id !== lineId));
      }
    } catch (e) {
      if (__DEV__) console.warn('[continuous] chunk transcription failed', e?.message || e);
      updateLines((prev) => prev.filter((l) => l.id !== lineId));
    }
  }

  async function pauseSession() {
    setSessionState('paused');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await stopListening();
  }

  function resumeSession() {
    setSessionState('listening');
    beginListening();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function endSession() {
    setSessionState('ended');
    await stopListening();
    // Wait for the final chunk(s) to come back before saving.
    await Promise.allSettled([...pendingRef.current]);

    const finished = linesRef.current.filter((l) => !l.processing && l.text?.trim());
    if (finished.length > 0) {
      addHistory({
        id: Date.now().toString(),
        text: finished.map((l) => l.text).join('\n'),
        native: finished.map((l) => l.native).filter(Boolean).join('\n'),
        language: selectedLangName,
        type: 'continuous',
        timestamp: new Date().toISOString(),
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function clearSession() {
    setSessionState('idle');
    updateLines(() => []);
    setTimer(0);
  }

  const fmtTime = `${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`;

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={openDrawer} style={st.hamburger}>
            <Text style={st.hamburgerText}>☰</Text>
          </TouchableOpacity>
          <View>
            <Text style={st.headerTitle}>Continuous Listening</Text>
            <Text style={st.headerSub}>
              {sessionState === 'idle' ? 'Ready to start' : sessionState === 'listening' ? 'Listening...' : sessionState === 'paused' ? 'Paused' : 'Session ended'}
            </Text>
          </View>
        </View>
        <View style={[st.statusDot, { backgroundColor: sessionState === 'listening' ? '#10B981' : sessionState === 'paused' ? '#F59E0B' : COLORS.faded }]} />
      </View>

      {/* Language Picker */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <TouchableOpacity style={st.langBtn} onPress={() => setShowLangPicker(!showLangPicker)}>
          <Text style={st.langBtnText}>{selectedLangName}</Text>
          <Text>{showLangPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showLangPicker && (
          <View style={st.pickerDrop}>
            {LANG_ENTRIES.map(([name, code]) => (
              <TouchableOpacity key={code} style={[st.pickerItem, code === selectedLang && { backgroundColor: COLORS.saffronLight }]} onPress={() => { setSelectedLang(code); setSelectedLangName(name); setShowLangPicker(false); }}>
                <Text style={[st.pickerText, code === selectedLang && { color: COLORS.saffron, fontWeight: '700' }]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Conversation */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={[st.conversation, { paddingBottom: insets.bottom + 20 }]} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {sessionState === 'idle' ? (
          <View style={st.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>👂</Text>
            <Text style={st.emptyTitle}>Hands-free listening</Text>
            <Text style={st.emptySubtext}>Start a session and speak naturally. Audio is captured in 5-second chunks and transcribed in real time.</Text>
          </View>
        ) : lines.length === 0 && sessionState === 'listening' ? (
          <View style={st.emptyState}>
            <ActivityIndicator size="large" color={COLORS.saffron} />
            <Text style={st.emptySubtext}>Listening for speech...</Text>
          </View>
        ) : (
          lines.map((line) => {
            // No speaker diarization yet, so lines aren't attributed to speakers.
            return (
              <View key={line.id} style={[st.bubble, st.bubbleLeft]}>
                {line.processing ? (
                  <ActivityIndicator size="small" color={COLORS.saffron} style={{ marginTop: 8 }} />
                ) : (
                  <>
                    <Text style={st.bubbleText}>{line.text}</Text>
                    {line.native && <Text style={st.bubbleNative}>{line.native}</Text>}
                  </>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Controls */}
      <View style={[st.controlBar, { paddingBottom: insets.bottom + 20 }]}>
        {sessionState === 'listening' && <Text style={st.timerText}>{fmtTime}</Text>}
        <View style={st.controlRow}>
          {sessionState === 'idle' && (
            <TouchableOpacity style={st.primaryBtn} onPress={startSession}>
              <Text style={st.primaryBtnText}>▶ Start Listening</Text>
            </TouchableOpacity>
          )}
          {sessionState === 'listening' && (
            <>
              <TouchableOpacity style={[st.secondaryBtn, { flex: 1 }]} onPress={pauseSession}>
                <Text style={st.secondaryBtnText}>⏸ Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.dangerBtn, { flex: 1 }]} onPress={endSession}>
                <Text style={st.dangerBtnText}>⏹ End</Text>
              </TouchableOpacity>
            </>
          )}
          {sessionState === 'paused' && (
            <>
              <TouchableOpacity style={[st.primaryBtn, { flex: 1 }]} onPress={resumeSession}>
                <Text style={st.primaryBtnText}>▶ Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.dangerBtn, { flex: 1 }]} onPress={endSession}>
                <Text style={st.dangerBtnText}>⏹ End</Text>
              </TouchableOpacity>
            </>
          )}
          {sessionState === 'ended' && (
            <TouchableOpacity style={st.primaryBtn} onPress={clearSession}>
              <Text style={st.primaryBtnText}>🔄 New Session</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink },
  headerSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  hamburger: { paddingRight: 12, paddingVertical: 4 },
  hamburgerText: { fontSize: 24, color: COLORS.ink },
  langBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  langBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  pickerDrop: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, overflow: 'hidden' },
  pickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerText: { fontSize: 14, color: COLORS.warm },
  conversation: { paddingHorizontal: 20, paddingTop: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 12 },
  bubbleLeft: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  bubbleNative: { fontSize: 12, color: COLORS.muted, marginTop: 4, fontStyle: 'italic' },
  controlBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  timerText: { fontSize: 14, fontWeight: '700', color: COLORS.saffron, textAlign: 'center', marginBottom: 8, fontVariant: ['tabular-nums'] },
  controlRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flex: 1, backgroundColor: COLORS.ink, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  secondaryBtn: { backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  dangerBtn: { backgroundColor: '#E53E3E', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
