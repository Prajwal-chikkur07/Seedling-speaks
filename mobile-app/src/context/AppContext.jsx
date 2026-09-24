import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext(null);

const STORAGE_KEY = 'seedlingspeaks:state:v1';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function withId(item) {
  return item && item.id ? item : { ...item, id: makeId() };
}

// Only these slices are persisted. Secrets (e.g. the Slack webhook) stay in memory.
function pickPersisted(state) {
  const { slack, ...otherIntegrations } = state.integrationSettings;
  return {
    selectedLanguage: state.selectedLanguage,
    selectedLanguageName: state.selectedLanguageName,
    transcriptHistory: state.transcriptHistory,
    savedTemplates: state.savedTemplates,
    customDictionary: state.customDictionary,
    starredIds: state.starredIds,
    pinnedTemplateIds: state.pinnedTemplateIds,
    floatingAssistantEnabled: state.floatingAssistantEnabled,
    integrationSettings: { ...otherIntegrations, slack: { enabled: slack.enabled } },
  };
}

const initialState = {
  // Recording
  isRecording: false,
  recordingTime: 0,

  // Transcription / Translation
  englishText: '',
  nativeTranscript: '',
  rewrittenText: '',
  nativeTranslation: '',
  confidenceScore: null,

  // Tone / Language
  selectedTone: '',
  customTone: '',
  selectedLanguage: 'hi-IN',
  selectedLanguageName: 'Hindi',

  // Continuous
  continuousLines: [],
  continuousState: 'idle', // idle | listening | paused | ended

  // History & Templates
  transcriptHistory: [],
  savedTemplates: [],
  customDictionary: [],
  starredIds: [],
  pinnedTemplateIds: [],

  // Usage
  usageStats: { sarvamCalls: 0, geminiCalls: 0, cacheHits: 0 },

  // UI
  loading: false,
  error: null,
  success: null,
  floatingAssistantEnabled: false,
  integrationSettings: {
    slack: { enabled: true, webhook: '' },
    whatsapp: { enabled: true, phone: '' },
    linkedin: { enabled: true },
    email: { enabled: true, recipient: '' },
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.key]: action.value };
    case 'SET_FIELDS':
      return { ...state, ...action.fields };
    case 'CLEAR_ALL':
      return {
        ...state,
        englishText: '',
        nativeTranscript: '',
        rewrittenText: '',
        nativeTranslation: '',
        confidenceScore: null,
        selectedTone: '',
        customTone: '',
        isRecording: false,
        recordingTime: 0,
      };
    case 'HYDRATE': {
      const saved = action.saved || {};
      const next = { ...state, ...saved };
      if (Array.isArray(saved.transcriptHistory)) next.transcriptHistory = saved.transcriptHistory.map(withId);
      if (Array.isArray(saved.savedTemplates)) next.savedTemplates = saved.savedTemplates.map(withId);
      if (saved.integrationSettings) {
        next.integrationSettings = { ...state.integrationSettings };
        for (const [k, v] of Object.entries(saved.integrationSettings)) {
          next.integrationSettings[k] = { ...state.integrationSettings[k], ...v };
        }
        // Never restore secrets from storage; keep whatever is in memory.
        next.integrationSettings.slack = {
          ...next.integrationSettings.slack,
          webhook: state.integrationSettings.slack.webhook,
        };
      }
      return next;
    }
    case 'ADD_HISTORY': {
      const hist = [withId(action.entry), ...state.transcriptHistory].slice(0, 50);
      return { ...state, transcriptHistory: hist };
    }
    case 'DELETE_HISTORY':
      return {
        ...state,
        transcriptHistory: state.transcriptHistory.filter((e) => e.id !== action.id),
        starredIds: state.starredIds.filter((x) => x !== action.id),
      };
    case 'CLEAR_HISTORY':
      return { ...state, transcriptHistory: [] };
    case 'TOGGLE_STAR': {
      const ids = state.starredIds.includes(action.id)
        ? state.starredIds.filter((x) => x !== action.id)
        : [...state.starredIds, action.id];
      return { ...state, starredIds: ids };
    }
    case 'ADD_TEMPLATE': {
      const tmpl = [withId(action.template), ...state.savedTemplates];
      return { ...state, savedTemplates: tmpl };
    }
    case 'DELETE_TEMPLATE':
      return {
        ...state,
        savedTemplates: state.savedTemplates.filter((t) => t.id !== action.id),
      };
    case 'CLEAR_TEMPLATES':
      return { ...state, savedTemplates: [] };
    case 'SAVE_DICTIONARY':
      return { ...state, customDictionary: action.dictionary };
    case 'INCREMENT_USAGE':
      return {
        ...state,
        usageStats: {
          ...state.usageStats,
          [action.key]: (state.usageStats[action.key] || 0) + 1,
        },
      };
    case 'SET_LOADING':
      return { ...state, loading: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.value, loading: false };
    case 'SET_SUCCESS':
      return { ...state, success: action.value };
    case 'CLEAR_NOTIFICATION':
      return { ...state, error: null, success: null };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydratedRef = useRef(false);

  // Load persisted state once on start.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        hydratedRef.current = true;
        if (raw) dispatch({ type: 'HYDRATE', saved: JSON.parse(raw) });
      })
      .catch((e) => {
        hydratedRef.current = true;
        console.warn('[AppContext] failed to load saved state', e);
      });
    return () => { cancelled = true; };
  }, []);

  // Save persisted slices whenever they change (after the initial load).
  const persistedJson = JSON.stringify(pickPersisted(state));
  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, persistedJson)
      .catch((e) => console.warn('[AppContext] failed to save state', e));
  }, [persistedJson]);

  const setField = useCallback((key, value) => dispatch({ type: 'SET_FIELD', key, value }), []);
  const setFields = useCallback((fields) => dispatch({ type: 'SET_FIELDS', fields }), []);
  const clearAll = useCallback(() => dispatch({ type: 'CLEAR_ALL' }), []);
  const setLoading = useCallback((value) => dispatch({ type: 'SET_LOADING', value }), []);
  const showError = useCallback((msg) => dispatch({ type: 'SET_ERROR', value: msg }), []);
  const showSuccess = useCallback((msg) => dispatch({ type: 'SET_SUCCESS', value: msg }), []);
  const clearNotification = useCallback(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), []);
  const addHistory = useCallback((entry) => dispatch({ type: 'ADD_HISTORY', entry }), []);
  const deleteHistory = useCallback((id) => dispatch({ type: 'DELETE_HISTORY', id }), []);
  const clearHistory = useCallback(() => dispatch({ type: 'CLEAR_HISTORY' }), []);
  const toggleStar = useCallback((id) => dispatch({ type: 'TOGGLE_STAR', id }), []);
  const addTemplate = useCallback((template) => dispatch({ type: 'ADD_TEMPLATE', template }), []);
  const deleteTemplate = useCallback((id) => dispatch({ type: 'DELETE_TEMPLATE', id }), []);
  const clearTemplates = useCallback(() => dispatch({ type: 'CLEAR_TEMPLATES' }), []);
  const saveDictionary = useCallback((dictionary) => dispatch({ type: 'SAVE_DICTIONARY', dictionary }), []);
  const incrementUsage = useCallback((key) => dispatch({ type: 'INCREMENT_USAGE', key }), []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        setField,
        setFields,
        clearAll,
        setLoading,
        showError,
        showSuccess,
        clearNotification,
        addHistory,
        deleteHistory,
        clearHistory,
        toggleStar,
        addTemplate,
        deleteTemplate,
        clearTemplates,
        saveDictionary,
        incrementUsage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
