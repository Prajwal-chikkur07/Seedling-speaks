export const RECORDING_MODES = {
  PUSH_TO_TALK: 'pushToTalk',
  CONTINUOUS: 'continuous',
  FILE_UPLOAD: 'fileUpload',
};

export const TONES = ['Email Formal', 'Email Casual', 'Slack', 'LinkedIn', 'WhatsApp Business', 'User Override'];

// state field → localStorage key. Written by AppProvider whenever the field changes.
export const PERSISTED_FIELDS = {
  selectedLanguage: 'defaultLanguage',
  selectedSarvamVoice: 'selectedSarvamVoice',
  channelCredentials: 'channelCredentials',
  transcriptHistory: 'transcriptHistory',
  customDictionary: 'customDictionary',
  savedTemplates: 'savedTemplates',
  usageStats: 'usageStats',
  darkMode: 'darkMode',
  uiLanguage: 'uiLanguage',
  onboardingDone: 'onboardingDone',
  widgetSetupDone: 'widgetSetupDone',
  widgetEnabled: 'widgetEnabled',
  widgetLanguages: 'widgetLanguages',
  widgetMode: 'widgetMode',
  starredIds: 'starredIds',
  pinnedTemplateIds: 'pinnedTemplateIds',
  historyTags: 'historyTags',
  notificationLog: 'notificationLog',
};

const DEFAULT_USAGE_STATS = { sarvamCalls: 0, geminiCalls: 0, cacheHits: 0 };

function readString(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; }
  catch { return fallback; }
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const value = JSON.parse(raw);
    if (value == null || typeof value !== typeof fallback || Array.isArray(value) !== Array.isArray(fallback)) return fallback;
    return value;
  } catch {
    return fallback;
  }
}

// Per-user data that must not survive a logout.
const USER_DATA_DEFAULTS = () => ({
  channelCredentials: {},
  transcriptHistory: [],   // [{ id, text, lang, timestamp, confidence }]
  customDictionary: [],    // [{ native, english }]
  savedTemplates: [],
  usageStats: { ...DEFAULT_USAGE_STATS },
  starredIds: [],
  pinnedTemplateIds: [],
  historyTags: {},         // { entryId: ['tag1','tag2'] }
  notificationLog: [],     // [{ id, msg, type, ts }]
});

const TRANSCRIPT_DEFAULTS = {
  englishText: '',
  nativeTranscript: '',
  rewrittenText: '',
  nativeTranslation: '',
  confidenceScore: null,       // 0-1 float from Sarvam
  n2eSessionId: null,
  isPlayingEnglish: false,
  isPlayingRewritten: false,
  isPlayingNative: false,
};

export function createInitialState() {
  return {
    authUser: null, // Managed by Clerk, not persisted to localStorage
    recordingMode: null,
    isRecording: false,
    isPushToTalkPressed: false,
    isSpeechDetected: false,
    currentAmplitude: 0,
    ...TRANSCRIPT_DEFAULTS,
    selectedTone: 'Email Formal',
    customTone: '',
    selectedLanguage: readString('defaultLanguage', 'hi-IN'),
    selectedVoice: null,
    selectedSarvamVoice: readString('selectedSarvamVoice', 'meera'),
    isSpeaking: false,
    loading: null,
    error: null,
    success: null,
    channelCredentials: readJSON('channelCredentials', {}),
    transcriptHistory: readJSON('transcriptHistory', []),
    customDictionary: readJSON('customDictionary', []),
    savedTemplates: readJSON('savedTemplates', []),
    usageStats: readJSON('usageStats', { ...DEFAULT_USAGE_STATS }),
    darkMode: readString('darkMode', 'false') === 'true',
    uiLanguage: readString('uiLanguage', 'en'),
    onboardingDone: readString('onboardingDone', 'false') === 'true',
    widgetSetupDone: readString('widgetSetupDone', 'false') === 'true',
    widgetEnabled: false, // always starts disabled — user must enable each session
    widgetLanguages: readJSON('widgetLanguages', []),
    widgetMode: readString('widgetMode', 'englishToNative'),
    starredIds: readJSON('starredIds', []),
    pinnedTemplateIds: readJSON('pinnedTemplateIds', []),
    historyTags: readJSON('historyTags', {}),
    notificationLog: readJSON('notificationLog', []),
    focusMode: false,
    isOnline: true,
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, authUser: action.user };
    case 'LOGOUT':
      return { ...state, authUser: null, ...TRANSCRIPT_DEFAULTS, ...USER_DATA_DEFAULTS() };
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_FIELDS':
      return { ...state, ...action.fields };
    case 'CLEAR_ALL':
      // Resetting n2eSessionId makes the next recording start a new backend session
      return { ...state, ...TRANSCRIPT_DEFAULTS };
    case 'SAVE_CREDENTIALS':
      return { ...state, channelCredentials: action.credentials };
    case 'ADD_HISTORY': {
      const entry = { id: Date.now(), ...action.entry };
      return { ...state, transcriptHistory: [entry, ...state.transcriptHistory].slice(0, 50) };
    }
    case 'DELETE_HISTORY':
      return { ...state, transcriptHistory: state.transcriptHistory.filter(h => h.id !== action.id) };
    case 'CLEAR_HISTORY':
      return { ...state, transcriptHistory: [] };
    case 'SAVE_DICTIONARY':
      return { ...state, customDictionary: action.dictionary };
    case 'SAVE_TEMPLATES':
      return { ...state, savedTemplates: action.templates };
    case 'INCREMENT_USAGE':
      return { ...state, usageStats: { ...state.usageStats, [action.key]: (state.usageStats[action.key] || 0) + 1 } };
    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode };
    case 'SET_UI_LANGUAGE':
      return { ...state, uiLanguage: action.value };
    case 'SET_ONBOARDING_DONE':
      return { ...state, onboardingDone: true };
    case 'SET_WIDGET_SETUP_DONE':
      return { ...state, widgetSetupDone: true };
    case 'SET_WIDGET_ENABLED':
      return { ...state, widgetEnabled: action.value };
    case 'SET_WIDGET_LANGUAGES':
      return { ...state, widgetLanguages: action.value };
    case 'SET_WIDGET_MODE':
      return { ...state, widgetMode: action.value };
    case 'TOGGLE_STAR': {
      const starred = state.starredIds.includes(action.id)
        ? state.starredIds.filter(i => i !== action.id)
        : [...state.starredIds, action.id];
      return { ...state, starredIds: starred };
    }
    case 'TOGGLE_PIN_TEMPLATE': {
      const pinned = state.pinnedTemplateIds.includes(action.id)
        ? state.pinnedTemplateIds.filter(i => i !== action.id)
        : [...state.pinnedTemplateIds, action.id].slice(0, 3); // max 3 pinned
      return { ...state, pinnedTemplateIds: pinned };
    }
    case 'SET_HISTORY_TAGS':
      return { ...state, historyTags: { ...state.historyTags, [action.entryId]: action.tags } };
    case 'ADD_NOTIFICATION_LOG': {
      const entry = { id: Date.now(), msg: action.msg, type: action.notifType || 'info', ts: new Date().toISOString() };
      return { ...state, notificationLog: [entry, ...state.notificationLog].slice(0, 50) };
    }
    case 'CLEAR_NOTIFICATION_LOG':
      return { ...state, notificationLog: [] };
    case 'TOGGLE_FOCUS_MODE':
      return { ...state, focusMode: !state.focusMode };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.value };
    case 'CLEAR_NOTIFICATION':
      return { ...state, error: null, success: null };
    default:
      return state;
  }
}
