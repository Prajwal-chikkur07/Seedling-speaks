import { useState, useEffect } from 'react';
import * as api from '../services/api';

const CHUNK_MS = 5000;

const AMPLITUDE_NOTIFY_MS = 100; // re-render listeners at most ~10x/s for the meter

const _session = {
  state: 'idle',   // idle | listening | paused | ended
  lines: [],
  targetLang: localStorage.getItem('defaultLanguage') || 'hi-IN',
  stream: null,
  audioCtx: null,
  mediaRecorder: null,
  chunkTimer: null,
  restartTimer: null,
  animFrame: null,
  amplitude: 0,
  starting: false,
  listeners: new Set(),
};

let lastAmplitudeNotify = 0;

function notify() {
  _session.listeners.forEach(fn => fn({ ..._session }));
}

// flush=true lets the recorder's onstop send the final partial chunk for transcription.
function stopMic({ flush }) {
  const mr = _session.mediaRecorder;
  if (mr?.state === 'recording') {
    if (!flush) mr.onstop = null;
    mr.stop();
  }
  _session.mediaRecorder = null;
  _session.stream?.getTracks().forEach(t => t.stop());
  _session.stream = null;
  clearInterval(_session.chunkTimer);
  _session.chunkTimer = null;
  clearTimeout(_session.restartTimer);
  _session.restartTimer = null;
  cancelAnimationFrame(_session.animFrame);
  _session.animFrame = null;
  _session.audioCtx?.close().catch(() => {});
  _session.audioCtx = null;
  _session.amplitude = 0;
}

async function processChunk(blob, incrementUsage) {
  if (blob.size < 800) return;
  const id = Date.now() + Math.random();
  _session.lines = [..._session.lines, { id, text: '', translation: '', processing: true }];
  notify();
  try {
    const stt  = await api.translateAudioFromBlob(blob, 'chunk.webm');
    const text = stt.transcript?.trim();
    if (!text) {
      _session.lines = _session.lines.filter(l => l.id !== id);
      notify();
      return;
    }
    let translation = text;
    if (_session.targetLang && _session.targetLang !== 'en-IN' && _session.targetLang !== 'en') {
      try {
        translation = await api.translateText(text, _session.targetLang);
      } catch (e) {
        console.warn('[session] translation failed:', e?.response?.data?.detail || e.message);
        translation = text;
      }
    }
    _session.lines = _session.lines.map(l =>
      l.id === id ? { id, text, translation, processing: false } : l
    );
    incrementUsage?.('sarvamCalls');
  } catch (e) {
    console.error('[session] chunk failed:', e?.response?.data?.detail || e.message);
    _session.lines = _session.lines.filter(l => l.id !== id);
  }
  notify();
}

function startChunkRecorder(stream, incrementUsage) {
  const chunks = [];
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
  const mr = new MediaRecorder(stream, { mimeType: mime });
  _session.mediaRecorder = mr;
  mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  mr.onstop = () => processChunk(new Blob(chunks, { type: 'audio/webm' }), incrementUsage);
  mr.start();
}

async function initMic() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  _session.stream = stream;
  const ctx = new AudioContext();
  _session.audioCtx = ctx;
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const tick = () => {
    analyser.getByteFrequencyData(data);
    _session.amplitude = data.reduce((a, b) => a + b, 0) / data.length;
    const now = performance.now();
    if (now - lastAmplitudeNotify >= AMPLITUDE_NOTIFY_MS) {
      lastAmplitudeNotify = now;
      notify();
    }
    _session.animFrame = requestAnimationFrame(tick);
  };
  _session.animFrame = requestAnimationFrame(tick);
  return stream;
}

function startChunking(stream, incrementUsage) {
  startChunkRecorder(stream, incrementUsage);
  _session.chunkTimer = setInterval(() => {
    if (_session.mediaRecorder?.state === 'recording') {
      _session.mediaRecorder.stop();
      _session.restartTimer = setTimeout(() => {
        if (_session.stream) startChunkRecorder(_session.stream, incrementUsage);
      }, 150);
    }
  }, CHUNK_MS);
}

// ── Public API ────────────────────────────────────────────────────────────────
async function startListening(incrementUsage) {
  if (_session.state === 'listening' || _session.starting) return;
  _session.starting = true;
  try {
    const stream = await initMic();
    startChunking(stream, incrementUsage);
    _session.state = 'listening';
  } catch (e) {
    stopMic({ flush: false });
    throw e;
  } finally {
    _session.starting = false;
  }
  notify();
}

export const sessionStart = startListening;
export const sessionResume = startListening;

export function sessionPause() {
  stopMic({ flush: true });
  _session.state = 'paused';
  notify();
}

export function sessionEnd() {
  stopMic({ flush: true });
  _session.state = 'ended';
  notify();
}

export function sessionClear() {
  stopMic({ flush: false });
  _session.state = 'idle';
  _session.lines = [];
  notify();
}

export function sessionSetLang(lang) {
  _session.targetLang = lang;
}

export function getSessionSnapshot() {
  return { ..._session };
}

export function useContinuousSession() {
  const [snap, setSnap] = useState(() => ({ ..._session }));

  useEffect(() => {
    const handler = (s) => setSnap({ ...s });
    _session.listeners.add(handler);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnap({ ..._session });
    return () => { _session.listeners.delete(handler); };
  }, []);

  return snap;
}
