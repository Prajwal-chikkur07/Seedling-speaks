import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../src/constants/colors';
import { TARGET_LANGUAGES } from '../src/constants/languages';
import { useApp } from '../src/context/AppContext';
import api from '../src/services/api';

const LANG_ENTRIES = Object.entries(TARGET_LANGUAGES);
const POLL_MS = 3000;
const MAX_POLLS = 200;          // ~10 minutes
const MAX_POLL_ERRORS = 5;      // consecutive network errors before giving up

export default function VideoScreen() {
  const insets = useSafeAreaInsets();
  const { state, addHistory, incrementUsage, showError } = useApp();

  const [step, setStep] = useState(0); // 0=upload, 1=configure, 2=processing, 3=results
  const [videoUri, setVideoUri] = useState(null);
  const [videoName, setVideoName] = useState('');
  const [targetLang, setTargetLang] = useState(state.selectedLanguage);
  const [targetLangName, setTargetLangName] = useState(state.selectedLanguageName);
  const [showPicker, setShowPicker] = useState(false);
  const [result, setResult] = useState(null);
  const pollRef = useRef(null);
  const pollGenRef = useRef(0); // bumped to cancel an in-flight polling loop

  function stopPolling() {
    pollGenRef.current += 1;
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = null;
  }

  useEffect(() => stopPolling, []);

  async function pickVideo() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
      if (!res.canceled && res.assets[0]) {
        setVideoUri(res.assets[0].uri);
        setVideoName(res.assets[0].fileName || res.assets[0].uri.split('/').pop() || 'video.mp4');
        setStep(1);
      }
    } catch (e) {
      showError('Could not open video library: ' + e.message);
    }
  }

  // Poll with a setTimeout chain so requests never overlap, and give up after
  // MAX_POLLS attempts or MAX_POLL_ERRORS consecutive failures.
  function pollStatus(id) {
    stopPolling();
    const gen = pollGenRef.current;
    let attempts = 0;
    let errors = 0;

    const tick = async () => {
      attempts += 1;
      try {
        const status = await api.getVideoStatus(id);
        if (gen !== pollGenRef.current) return;
        errors = 0;
        if (status.status === 'completed') {
          setResult(status);
          setStep(3);
          addHistory({
            id: Date.now().toString(),
            text: status.transcript || '',
            native: status.translated_text || '',
            language: targetLangName,
            type: 'video',
            timestamp: new Date().toISOString(),
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
        if (status.status === 'error') {
          showError(status.error || 'Video subtitles failed');
          setStep(1);
          return;
        }
      } catch (e) {
        if (gen !== pollGenRef.current) return;
        errors += 1;
        if (errors >= MAX_POLL_ERRORS) {
          showError('Lost connection while checking video status: ' + e.message);
          setStep(1);
          return;
        }
      }
      if (attempts >= MAX_POLLS) {
        showError('Video processing is taking too long. Please try again later.');
        setStep(1);
        return;
      }
      pollRef.current = setTimeout(tick, POLL_MS);
    };

    pollRef.current = setTimeout(tick, POLL_MS);
  }

  async function handleUploadAndTranslate() {
    setStep(2);
    try {
      const uploadRes = await api.uploadVideo(videoUri, videoName);
      await api.translateVideo(uploadRes.video_id, targetLang);
      incrementUsage('geminiCalls');
      pollStatus(uploadRes.video_id);
    } catch (e) {
      showError('Upload failed: ' + e.message);
      setStep(1);
    }
  }

  function handleReset() {
    stopPolling();
    setStep(0);
    setVideoUri(null);
    setVideoName('');
    setResult(null);
  }

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={st.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>Video Subtitles</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 40 }]}>
        {step === 0 && (
          <View style={st.uploadZone}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎬</Text>
            <Text style={st.uploadTitle}>Upload a video</Text>
            <Text style={st.uploadSubtext}>MP4, MOV, AVI, WEBM up to 200MB</Text>
            <TouchableOpacity style={st.uploadBtn} onPress={pickVideo}>
              <Text style={st.uploadBtnText}>📁 Choose Video</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <>
            <View style={st.previewCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🎬</Text>
              <Text style={st.fileName}>{videoName}</Text>
            </View>

            <TouchableOpacity style={st.langBtn} onPress={() => setShowPicker(!showPicker)}>
              <Text style={st.langBtnText}>Translate to: {targetLangName}</Text>
              <Text>{showPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showPicker && (
              <View style={st.pickerDrop}>
                {LANG_ENTRIES.map(([name, code]) => (
                  <TouchableOpacity key={code} style={[st.pickerItem, code === targetLang && { backgroundColor: COLORS.saffronLight }]} onPress={() => { setTargetLang(code); setTargetLangName(name); setShowPicker(false); }}>
                    <Text style={[st.pickerText, code === targetLang && { color: COLORS.saffron, fontWeight: '700' }]}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity style={st.translateBtn} onPress={handleUploadAndTranslate}>
              <Text style={st.translateBtnText}>🚀 Upload & Translate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.secondaryBtn} onPress={handleReset}>
              <Text style={st.secondaryBtnText}>← Choose different video</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <View style={st.processingState}>
            <ActivityIndicator size="large" color={COLORS.saffron} />
            <Text style={st.processingTitle}>Processing video...</Text>
            <Text style={st.processingSubtext}>This may take a few minutes depending on video length</Text>
          </View>
        )}

        {step === 3 && result && (
          <>
            <View style={st.successBanner}>
              <Text style={{ fontSize: 24 }}>✅</Text>
              <Text style={st.successText}>Translation complete!</Text>
            </View>

            <Text style={st.sectionTitle}>Original Transcript</Text>
            <View style={st.textCard}>
              <Text style={st.cardText}>{result.transcript || 'No transcript available'}</Text>
            </View>

            <Text style={st.sectionTitle}>Translated Text</Text>
            <View style={[st.textCard, { borderColor: COLORS.borderAccent }]}>
              <Text style={[st.cardText, { fontWeight: '600' }]}>{result.translated_text || 'No translation available'}</Text>
            </View>

            <TouchableOpacity style={st.translateBtn} onPress={handleReset}>
              <Text style={st.translateBtnText}>🔄 Translate Another Video</Text>
            </TouchableOpacity>
          </>
        )}
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
  uploadZone: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: 20, padding: 40, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed' },
  uploadTitle: { fontSize: 16, fontWeight: '600', color: COLORS.ink, marginBottom: 4 },
  uploadSubtext: { fontSize: 13, color: COLORS.muted, marginBottom: 20 },
  uploadBtn: { backgroundColor: COLORS.ink, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  uploadBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  previewCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  fileName: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  langBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  langBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  pickerDrop: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, overflow: 'hidden' },
  pickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerText: { fontSize: 14, color: COLORS.warm },
  translateBtn: { backgroundColor: COLORS.ink, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  translateBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.muted },
  processingState: { alignItems: 'center', paddingVertical: 60 },
  processingTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginTop: 16 },
  processingSubtext: { fontSize: 13, color: COLORS.muted, marginTop: 4, textAlign: 'center' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.greenBg, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.greenSoft + '30' },
  successText: { fontSize: 15, fontWeight: '700', color: COLORS.greenSoft },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  textCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  cardText: { fontSize: 14, color: COLORS.ink, lineHeight: 22 },
});
