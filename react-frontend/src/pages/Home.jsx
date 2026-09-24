import { useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import RecordingControls from '../components/RecordingControls';
import { useApp } from '../context/AppContext';
import {
  Mic, Copy, Check, Download, Volume2, Square, Loader2, ChevronDown, ChevronUp,
  Hash, Smile, Frown, Minus, Trash2, ArrowLeftRight,
} from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';
import * as api from '../services/api';
import { getLabels } from '../services/uiLabels';

const TONE_OPTIONS = ['Email Formal', 'Email Casual', 'Slack', 'LinkedIn', 'WhatsApp Business', 'Custom'];

const TONE_TO_CHANNELS = {
  'Email Formal':      ['email'],
  'Email Casual':      ['email'],
  'Slack':             ['slack'],
  'LinkedIn':          ['linkedin'],
  'WhatsApp Business': ['whatsapp'],
  'Custom':            ['email', 'slack', 'linkedin', 'whatsapp'],
};

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 text-[13px] font-medium transition-all">
      {copied ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
    </button>
  );
}

function SpeakBtn({ onClick, isPlaying, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
        isPlaying ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
                  : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:text-gray-800'}`}>
      {isPlaying ? <><Square className="w-3.5 h-3.5 fill-red-500" /> Stop</> : <><Volume2 className="w-3.5 h-3.5" /> Speak</>}
    </button>
  );
}

function SentimentBadge({ sentiment, score, summary }) {
  if (!sentiment) return null;
  const map = {
    positive: { icon: Smile,  color: 'text-green-600 bg-green-50 border-green-100' },
    neutral:  { icon: Minus,  color: 'text-gray-500 bg-gray-50 border-gray-200'   },
    negative: { icon: Frown,  color: 'text-red-500 bg-red-50 border-red-100'      },
  };
  const { icon: Icon, color } = map[sentiment] || map.neutral;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${color}`} title={summary}>
      <Icon className="w-3 h-3" />Sentiment: {sentiment} · {score}%
    </span>
  );
}

export default function Home() {
  const { user } = useUser();
  const { state, setField, setFields, TARGET_LANGUAGES, showError, showSuccess, addHistory, incrementUsage } = useApp();
  const L = getLabels(state.uiLanguage);
  const { isPlaying, speak } = useSpeech();
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedTone, setSelectedTone] = useState(null);
  const [rewrittenText, setRewrittenText] = useState('');
  const [customToneInput, setCustomToneInput] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState('');
  const [sentiment, setSentiment] = useState(null);
  // New UI changes - for comprehensive output box redesign
  const [showOriginalTranscript, setShowOriginalTranscript] = useState(true);
  const [showRetoneDropdown, setShowRetoneDropdown] = useState(false);
  const [translatedOriginal, setTranslatedOriginal] = useState('');
  const [translatedRetone, setTranslatedRetone] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);
  const prevEnglishText = useRef('');

  // Reset playback state on unmount to avoid stuck "playing" indicators
  useEffect(() => {
    return () => {
      setFields({ isPlayingEnglish: false, isPlayingRewritten: false, isPlayingNative: false });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync editable transcript when englishText changes from recording
  useEffect(() => {
    setEditableTranscript(state.englishText || '');
  }, [state.englishText]);

  // Auto-save to history when a new transcript arrives
  useEffect(() => {
    if (state.englishText?.trim() && state.englishText !== prevEnglishText.current) {
      prevEnglishText.current = state.englishText;
      addHistory({
        text: state.englishText,
        lang: state.selectedLanguage,
        timestamp: new Date().toISOString(),
        confidence: state.confidenceScore,
      });
      // Run sentiment analysis in background
      api.analyzeSentiment(state.englishText).then(setSentiment).catch(() => {});

      // Auto-save translation to database
      if (user?.id && !state.n2eSessionId) {
        api.saveNativeToEnglishSession({
          userId: user.id,
          originalLanguage: state.selectedLanguage || 'hi-IN',
          originalText: state.nativeTranscript || state.englishText || '',
          translatedText: state.englishText || ''
        }).then(data => {
          if (data?.session_id) {
            setField('n2eSessionId', data.session_id);
          }
        }).catch(console.error);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.englishText, state.nativeTranscript, user?.id, state.selectedLanguage]);

  const handleSpeakNative  = useCallback(() => speak(state.nativeTranslation, state.selectedLanguage), [speak, state.nativeTranslation, state.selectedLanguage]);

  const handleRewrite = useCallback(async (tone) => {
    const text = editableTranscript || state.englishText;
    if (!text?.trim()) return;
    setIsRewriting(true);
    setRewrittenText('');
    setShowOriginalTranscript(false);
    setShowTranslation(false);
    try {
      const result = await api.rewriteTone(
        text,
        tone === 'Custom' ? 'User Override' : tone,
        tone === 'Custom' ? customToneInput : null,
        state.customDictionary?.length ? state.customDictionary : null,
      );
      if (!result || !result.trim()) {
        showError('Retone returned empty. Please try again.');
        setShowOriginalTranscript(true);
        return;
      }
      setRewrittenText(result);
      incrementUsage('geminiCalls');

      // Add to Native to English DB seamlessly in background
        if (state.n2eSessionId) {
          api.saveNativeToEnglishTranscription({
            sessionId: state.n2eSessionId,
            originalTranscript: text,
            toneApplied: tone,
            rewrittenText: result,
            customToneDesc: tone === 'Custom' ? customToneInput : null,
            confidenceScore: state.confidenceScore || 0
          }).catch(console.error); // Fire and forget
        }

    } catch {
      // error toast is shown by the API client
      setShowOriginalTranscript(true);
    } finally {
      setIsRewriting(false);
    }
  }, [editableTranscript, state.englishText, state.customDictionary, customToneInput, showError, incrementUsage, state.n2eSessionId, state.confidenceScore]);

  const handleTranslate = useCallback(async () => {
    // Translate the currently displayed version (Original or Retoned)
    const textToTranslate = showOriginalTranscript ? editableTranscript : (rewrittenText || editableTranscript);
    if (!textToTranslate?.trim()) return;
    
    setIsTranslating(true);
    try {
      const translated = await api.translateText(textToTranslate, state.selectedLanguage);
      // Store translation in appropriate state based on current view
      if (showOriginalTranscript) {
        setTranslatedOriginal(translated);
      } else {
        setTranslatedRetone(translated);
      }
      setShowTranslation(true);
      incrementUsage('sarvamCalls');
    } catch {
      // error toast is shown by the API client
    } finally {
      setIsTranslating(false);
    }
  }, [editableTranscript, rewrittenText, showOriginalTranscript, state.selectedLanguage, incrementUsage]);

  // Keyboard shortcut: Cmd/Ctrl+Enter = translate. The ref keeps the listener
  // calling the latest handleTranslate without re-subscribing on every change.
  const handleTranslateRef = useRef(handleTranslate);
  useEffect(() => { handleTranslateRef.current = handleTranslate; }, [handleTranslate]);
  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      e.preventDefault();
      handleTranslateRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLangChange = useCallback((lang) => {
    setFields({ selectedLanguage: lang });
    // Clear translations when language changes
    setTranslatedOriginal('');
    setTranslatedRetone('');
    setShowTranslation(false);
  }, [setFields]);

  const handleClear = () => {
    setField('englishText', '');
    setField('nativeTranscript', '');
    setField('n2eSessionId', null);
    setEditableTranscript('');
    setRewrittenText('');
    setSelectedTone(null);
    setSentiment(null);
    setField('nativeTranslation', '');
    setTranslatedOriginal('');
    setTranslatedRetone('');
    setShowTranslation(false);
  };

  const shareText = rewrittenText || state.nativeTranslation || editableTranscript;

  const handleSendClick = useCallback(() => {
    if (!shareText?.trim()) return;
    const inferredChannelId = selectedTone ? (TONE_TO_CHANNELS[selectedTone]?.[0] || 'email') : 'email';
    const trimmedText = shareText.trim();

    if (inferredChannelId === 'email') {
      let subject = 'Message from SeedlingSpeaks';
      let body = trimmedText;
      const subjectMatch = trimmedText.match(/^Subject:\s*(.+?)[\r\n]/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        body = trimmedText.replace(/^Subject:\s*.+?[\r\n]+/i, '').trim();
      }
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        '_blank'
      );
      return;
    }

    if (inferredChannelId === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(trimmedText)}`, '_blank');
      return;
    }

    if (inferredChannelId === 'slack') {
      navigator.clipboard.writeText(trimmedText).catch(() => {});
      const slackWindow = window.open('slack://open', '_blank');
      if (!slackWindow) {
        window.open('https://app.slack.com/client', '_blank');
      }
      showSuccess('Message copied. Paste it into Slack.');
      return;
    }

    if (inferredChannelId === 'linkedin') {
      navigator.clipboard.writeText(trimmedText).catch(() => {});
      window.open('https://www.linkedin.com/feed/', '_blank');
      showSuccess('Post copied. Paste it into LinkedIn.');
      return;
    }
  }, [shareText, selectedTone, showSuccess]);

  // ── Confidence badge values ──
  const confPct = state.confidenceScore != null ? Math.round(state.confidenceScore * 100) : null;
  const confColor = confPct == null ? '' : confPct >= 85 ? 'bg-green-50 text-green-600 border-green-100' : confPct >= 60 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-500 border-red-100';

  // Unified mode state
  const activeMode = showTranslation ? 'translation' : (rewrittenText && !showOriginalTranscript) ? 'retoned' : 'transcript';
  
  const getModeTitle = () => {
    if (activeMode === 'translation') return `Translation · ${state.selectedLanguage}`;
    if (activeMode === 'retoned') return `Retoned · ${selectedTone || 'Select tone'}`;
    return 'Transcript';
  };

  const getModeContent = () => {
    if (activeMode === 'translation') return translatedRetone || translatedOriginal;
    if (activeMode === 'retoned') return rewrittenText;
    return editableTranscript;
  };

  const getModeWordCount = () => {
    const content = getModeContent();
    if (!content) return { words: 0, chars: 0 };
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    return { words, chars };
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--surface-ink)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Mic style={{ width: '24px', height: '24px', color: 'var(--saffron)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: 'var(--text-ink)', fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', fontSize: '1.05rem' }}>
              {L.speechToText || "Speech to Text"}
            </span>
            <span style={{ color: 'var(--text-faded)', fontSize: '0.82rem', fontWeight: 500 }}>
              {editableTranscript?.trim() ? 'Transcript ready to edit' : 'Ready to start'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-faded)', display: 'none' }}>⌘↵ translate</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--saffron-light)', color: 'var(--saffron)', borderRadius: 'var(--r-pill)', padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>
            SeedlingSpeaks v2.5
          </span>
        </div>
      </div>

      {/* Main content - REFACTORED: No max-width constraint, full workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', width: '100%', minHeight: 0 }}>

        {editableTranscript ? (
          <div className="animate-fade-in-blur" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', flex: 1, gap: '24px' }}>
            
            {/* ===== UNIFIED TOOLBAR (Language, Translate, Retone) ===== */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Language selector */}
              <div style={{ position: 'relative' }}>
                <select value={state.selectedLanguage} onChange={(e) => handleLangChange(e.target.value)}
                  style={{ appearance: 'none', background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', paddingLeft: '10px', paddingRight: '28px', paddingTop: '6px', paddingBottom: '6px', fontSize: '12px', fontWeight: 500, color: 'rgb(75, 85, 99)', cursor: 'pointer', outline: 'none', transition: 'all 0.2s' }}>
                  {Object.entries(TARGET_LANGUAGES).map(([name, code]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
                <ChevronDown style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: 'rgb(156, 163, 175)', pointerEvents: 'none' }} />
              </div>

              {/* Translate button */}
              <button onClick={handleTranslate} disabled={!(showOriginalTranscript ? editableTranscript?.trim() : (rewrittenText || editableTranscript)?.trim()) || isTranslating}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isTranslating ? 'rgb(107, 114, 128)' : 'rgb(17, 24, 39)', color: 'white', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: (showOriginalTranscript ? editableTranscript?.trim() : (rewrittenText || editableTranscript)?.trim()) && !isTranslating ? 'pointer' : 'not-allowed', opacity: !(showOriginalTranscript ? editableTranscript?.trim() : (rewrittenText || editableTranscript)?.trim()) || isTranslating ? 0.3 : 1, transition: 'all 0.2s' }}
                onMouseEnter={e => { if ((showOriginalTranscript ? editableTranscript?.trim() : (rewrittenText || editableTranscript)?.trim()) && !isTranslating) e.target.style.background = 'rgb(31, 41, 55)'; }}
                onMouseLeave={e => { e.target.style.background = isTranslating ? 'rgb(107, 114, 128)' : 'rgb(17, 24, 39)'; }}>
                {isTranslating ? <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> : <ArrowLeftRight style={{ width: '12px', height: '12px' }} />}
                Translate
              </button>

              {/* Retone dropdown button */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowRetoneDropdown(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(75, 85, 99)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', outline: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.target.style.borderColor = 'rgba(0,0,0,0.12)'}
                  onMouseLeave={e => e.target.style.borderColor = 'rgba(0,0,0,0.06)'}>
                  Retone
                  {showRetoneDropdown ? <ChevronUp style={{ width: '14px', height: '14px' }} /> : <ChevronDown style={{ width: '14px', height: '14px' }} />}
                </button>

                {/* Retone dropdown menu */}
                {showRetoneDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '180px' }}>
                    <div style={{ padding: '4px' }}>
                      {TONE_OPTIONS.map(t => (
                        <button key={t} onClick={() => { 
                            setSelectedTone(t); 
                            if (t !== 'Custom') {
                              handleRewrite(t);
                              setShowRetoneDropdown(false);
                            }
                          }} disabled={isRewriting}
                          style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', fontWeight: 500, color: selectedTone === t ? 'var(--saffron)' : 'rgb(75, 85, 99)', background: selectedTone === t ? 'rgba(232, 130, 12, 0.1)' : 'transparent', border: 'none', cursor: isRewriting ? 'not-allowed' : 'pointer', opacity: isRewriting ? 0.4 : 1, transition: 'all 0.2s', borderRadius: '4px' }}
                          onMouseEnter={e => { if (!isRewriting) e.target.style.background = 'rgba(0,0,0,0.03)'; }}
                          onMouseLeave={e => { if (selectedTone !== t) e.target.style.background = 'transparent'; }}>
                          {t}
                        </button>
                      ))}
                    </div>
                    {selectedTone === 'Custom' && (
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', padding: '8px' }}>
                        <input value={customToneInput} onChange={e => setCustomToneInput(e.target.value)}
                          placeholder="Describe tone..."
                          style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }} />
                        <button onClick={() => { handleRewrite('Custom'); setShowRetoneDropdown(false); }} disabled={!customToneInput.trim() || isRewriting}
                          style={{ width: '100%', padding: '6px 8px', fontSize: '12px', fontWeight: 600, background: 'rgb(17, 24, 39)', color: 'white', border: 'none', borderRadius: '4px', cursor: customToneInput.trim() && !isRewriting ? 'pointer' : 'not-allowed', opacity: !customToneInput.trim() || isRewriting ? 0.4 : 1, transition: 'all 0.2s' }}>
                          {isRewriting ? 'Applying...' : 'Apply'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ===== UNIFIED MODE TOGGLE (Transcript | Retoned | Translation) ===== */}
            {(rewrittenText || translatedOriginal || translatedRetone) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.06)' }}>
                <button onClick={() => {  setShowOriginalTranscript(true); setShowTranslation(false); }}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '12px', fontWeight: 600, background: activeMode === 'transcript' ? 'rgb(17, 24, 39)' : 'transparent', color: activeMode === 'transcript' ? 'white' : 'rgb(75, 85, 99)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  Transcript
                </button>
                {rewrittenText && (
                  <button onClick={() => { setShowOriginalTranscript(false); setShowTranslation(false); }}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', fontWeight: 600, background: activeMode === 'retoned' ? 'rgb(17, 24, 39)' : 'transparent', color: activeMode === 'retoned' ? 'white' : 'rgb(75, 85, 99)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    Retoned
                  </button>
                )}
                {(translatedOriginal || translatedRetone) && (
                  <button onClick={() => setShowTranslation(true)}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', fontWeight: 600, background: activeMode === 'translation' ? 'rgb(17, 24, 39)' : 'transparent', color: activeMode === 'translation' ? 'white' : 'rgb(75, 85, 99)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    Translation
                  </button>
                )}
              </div>
            )}

            {/* ===== OUTPUT PANEL (Structured: Header/Content/Footer) ===== */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--surface)', borderRadius: 'var(--r-xl)', border: '2px solid transparent', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', transition: 'border-color 0.2s', position: 'relative' }}
              onMouseEnter={e => e.target.style.borderColor = 'rgba(232, 130, 12, 0.2)'}
              onMouseLeave={e => e.target.style.borderColor = 'transparent'}>
              
              {/* Retoning overlay */}
              {isRewriting && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(253, 250, 244, 0.88)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 'var(--r-xl)', padding: '24px' }}>
                  <div style={{ width: 'min(320px, 100%)', background: '#FFFFFF', borderRadius: '24px', boxShadow: '0 14px 42px rgba(60,40,20,0.12)', border: '1px solid rgba(232,130,12,0.14)', padding: '26px 24px 22px', display: 'grid', justifyItems: 'center', gap: '12px', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', position: 'relative', display: 'grid', placeItems: 'center', background: 'rgba(232,130,12,0.06)' }}>
                      <div style={{ position: 'absolute', inset: '8px', borderRadius: '50%', border: '1px solid rgba(232,130,12,0.18)', animation: 'retoneOrbit 1.2s linear infinite' }}>
                        <span style={{ position: 'absolute', top: '-3px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--saffron)', boxShadow: '0 0 0 4px rgba(232,130,12,0.10)' }} />
                      </div>
                      <Loader2 style={{ width: '20px', height: '20px', color: 'var(--saffron)', opacity: 0.9 }} />
                    </div>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.12rem', fontWeight: 600, color: 'var(--text-ink)', letterSpacing: '-0.02em' }}>Shaping your message</span>
                      <span style={{ fontSize: '14px', color: 'var(--text-warm)', lineHeight: 1.55 }}>
                        Retoning for {selectedTone || 'your selected tone'}...
                      </span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginTop: '2px' }}>
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: index === 1 ? 'rgba(232,130,12,0.72)' : 'rgba(232,130,12,0.32)',
                            animation: `retoneDotPulse 1s ease-in-out ${index * 0.14}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* HEADER: Title, confidence, sentiment, and actions */}
              <div style={{ padding: '20px 20px 12px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Mode title with confidence badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-ink)' }}>{getModeTitle()}</span>
                    {confPct != null && activeMode !== 'translation' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', border: `1px solid currentColor`, fontSize: '11px', fontWeight: 600, color: confColor.includes('green') ? 'rgb(34, 197, 94)' : confColor.includes('amber') ? 'rgb(217, 119, 6)' : 'rgb(239, 68, 68)' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', opacity: 0.7 }} />
                        {confPct}%
                      </span>
                    )}
                  </div>
                  {sentiment && activeMode !== 'translation' && <SentimentBadge {...sentiment} />}
                </div>

                {/* Header actions: Speak, Copy, Save, Clear */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <SpeakBtn onClick={activeMode === 'translation' ? handleSpeakNative : () => speak(getModeContent())} isPlaying={isPlaying} disabled={!getModeContent()} />
                  <CopyBtn text={getModeContent()} />
                  <button onClick={() => { setField('englishText', editableTranscript); showSuccess('Saved to history'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', color: 'rgb(107, 114, 128)', fontSize: '12px', fontWeight: 500, background: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.target.style.background = 'rgba(0,0,0,0.03)'}
                    onMouseLeave={e => e.target.style.background = 'white'}>
                    <Download style={{ width: '12px', height: '12px' }} />
                    Save
                  </button>
                  <button onClick={handleClear}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', color: 'rgb(239, 68, 68)', fontSize: '12px', fontWeight: 500, background: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.target.style.background = 'rgba(239, 68, 68, 0.05)'}
                    onMouseLeave={e => e.target.style.background = 'white'}>
                    <Trash2 style={{ width: '12px', height: '12px' }} />
                    Clear
                  </button>
                </div>
              </div>

              {/* CONTENT: Textarea with text output */}
              <textarea
                value={getModeContent()}
                onChange={e => {
                  if (activeMode === 'retoned') setRewrittenText(e.target.value);
                  else if (activeMode === 'transcript') setEditableTranscript(e.target.value);
                }}
                readOnly={activeMode === 'translation'}
                style={{ flex: 1, width: '100%', fontSize: '16px', lineHeight: 1.8, color: 'var(--text-ink)', background: 'transparent', padding: '20px', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font)', overflow: 'auto', cursor: activeMode === 'translation' ? 'default' : 'text' }}
                spellCheck={false}
                placeholder="Your transcript will appear here..."
              />

              {/* FOOTER: Language, Translate link, Send button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <Hash style={{ width: '12px', height: '12px', color: 'var(--text-faded)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-faded)' }}>{getModeWordCount().words} words · {getModeWordCount().chars} chars</span>
                </div>

                {/* Send button (right-aligned) */}
                <button
                  onClick={handleSendClick}
                  disabled={!shareText?.trim()}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: 'var(--saffron)', color: 'white', border: 'none', cursor: shareText?.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s', flexShrink: 0, opacity: shareText?.trim() ? 1 : 0.45 }}
                  onMouseEnter={e => { if (shareText?.trim()) e.target.style.background = 'rgb(217, 119, 6)'; }}
                  onMouseLeave={e => { e.target.style.background = 'var(--saffron)'; }}
                  title="Send">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>

            {/* ===== SECONDARY ACTION: Record Again (Bottom center button) ===== */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '24px', paddingBottom: '24px' }}>
              <button onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '24px', background: 'rgb(17, 24, 39)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                onMouseEnter={e => { e.target.style.background = 'rgb(31, 41, 55)'; e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.target.style.background = 'rgb(17, 24, 39)'; e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}>
                <Mic style={{ width: '18px', height: '18px' }} />
                Record Again
              </button>
            </div>

          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '24px' }}>
            {/* Empty state content - centered vertically */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              {/* Empty state icon */}
              <div style={{ width: 72, height: 72, borderRadius: 20, background: state.isRecording ? 'var(--saffron-light)' : 'var(--surface)', boxShadow: state.isRecording ? '0 8px 24px rgba(232,130,12,0.18)' : 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic style={{ width: 28, height: 28, color: state.isRecording ? 'var(--saffron)' : 'var(--text-faded)' }} strokeWidth={1.8} />
              </div>

              {/* Empty state text */}
              <div style={{ textAlign: 'center' }}>
                {state.isRecording ? (
                  <>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-ink)', margin: 0 }}>
                      Your voice is turning into text in real time
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-faded)', margin: '6px 0 0 0', maxWidth: '360px', lineHeight: 1.6 }}>
                      Keep talking naturally. We are listening for the important parts and shaping a clean transcript for you.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-ink)', margin: 0 }}>Press <span style={{ color: 'var(--saffron)' }}>Start Speaking</span> to begin</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-faded)', margin: '4px 0 0 0' }}>Your transcript will appear here</p>
                  </>
                )}
              </div>
            </div>
            
            {/* Recording controls - bottom section */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <RecordingControls />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
