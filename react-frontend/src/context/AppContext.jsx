import { createContext, useContext, useReducer, useCallback, useEffect, useMemo, useRef } from 'react';
import { TARGET_LANGUAGES } from '../constants/languages';
import { RECORDING_MODES, TONES, PERSISTED_FIELDS, createInitialState, reducer } from './appReducer';

const AppContext = createContext();

// Keys holding user data outside the reducer; removed on logout.
const EXTRA_USER_STORAGE_KEYS = ['userProfile', 'vt_video_history'];

function writeStorage(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch { /* storage full or unavailable */ }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const persistedRef = useRef({});

  // Mirror persisted fields to localStorage, only writing the ones that changed
  useEffect(() => {
    for (const [field, key] of Object.entries(PERSISTED_FIELDS)) {
      if (persistedRef.current[field] === state[field]) continue;
      persistedRef.current[field] = state[field];
      writeStorage(key, state[field]);
    }
  }, [state]);

  const setField = useCallback((field, value) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const setFields = useCallback((fields) => {
    dispatch({ type: 'SET_FIELDS', fields });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const showError = useCallback((msg) => {
    dispatch({ type: 'SET_FIELD', field: 'error', value: msg });
    setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 5000);
  }, []);

  const showSuccess = useCallback((msg) => {
    dispatch({ type: 'SET_FIELD', field: 'success', value: msg });
    setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 4000);
  }, []);

  const setLoading = useCallback((msg) => {
    dispatch({ type: 'SET_FIELD', field: 'loading', value: msg });
  }, []);

  const saveCredentials = useCallback((credentials) => {
    dispatch({ type: 'SAVE_CREDENTIALS', credentials });
  }, []);

  const addHistory = useCallback((entry) => {
    dispatch({ type: 'ADD_HISTORY', entry });
  }, []);

  const deleteHistory = useCallback((id) => {
    dispatch({ type: 'DELETE_HISTORY', id });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  const saveDictionary = useCallback((dictionary) => {
    dispatch({ type: 'SAVE_DICTIONARY', dictionary });
  }, []);

  const saveTemplates = useCallback((templates) => {
    dispatch({ type: 'SAVE_TEMPLATES', templates });
  }, []);

  const incrementUsage = useCallback((key) => {
    dispatch({ type: 'INCREMENT_USAGE', key });
  }, []);

  const toggleDark = useCallback(() => dispatch({ type: 'TOGGLE_DARK' }), []);
  const setUiLanguage = useCallback((value) => dispatch({ type: 'SET_UI_LANGUAGE', value }), []);
  const setOnboardingDone = useCallback(() => dispatch({ type: 'SET_ONBOARDING_DONE' }), []);
  const setWidgetSetupDone = useCallback(() => dispatch({ type: 'SET_WIDGET_SETUP_DONE' }), []);
  const setWidgetEnabled = useCallback((value) => dispatch({ type: 'SET_WIDGET_ENABLED', value }), []);
  const setWidgetLanguages = useCallback((value) => dispatch({ type: 'SET_WIDGET_LANGUAGES', value }), []);
  const setWidgetMode = useCallback((value) => dispatch({ type: 'SET_WIDGET_MODE', value }), []);
  const toggleStar = useCallback((id) => dispatch({ type: 'TOGGLE_STAR', id }), []);
  const togglePinTemplate = useCallback((id) => dispatch({ type: 'TOGGLE_PIN_TEMPLATE', id }), []);
  const setHistoryTags = useCallback((entryId, tags) => dispatch({ type: 'SET_HISTORY_TAGS', entryId, tags }), []);
  const addNotificationLog = useCallback((msg, notifType = 'info') => dispatch({ type: 'ADD_NOTIFICATION_LOG', msg, notifType }), []);
  const clearNotificationLog = useCallback(() => dispatch({ type: 'CLEAR_NOTIFICATION_LOG' }), []);
  const toggleFocusMode = useCallback(() => dispatch({ type: 'TOGGLE_FOCUS_MODE' }), []);
  const setOnline = useCallback((value) => dispatch({ type: 'SET_ONLINE', value }), []);
  const login = useCallback((user) => dispatch({ type: 'LOGIN', user }), []);
  const logout = useCallback(() => {
    EXTRA_USER_STORAGE_KEYS.forEach((key) => writeStorage(key, null));
    dispatch({ type: 'LOGOUT' });
  }, []);

  const value = useMemo(() => ({
    state,
    setField,
    setFields,
    clearAll,
    showError,
    showSuccess,
    setLoading,
    saveCredentials,
    addHistory,
    deleteHistory,
    clearHistory,
    saveDictionary,
    saveTemplates,
    incrementUsage,
    toggleDark,
    setUiLanguage,
    setOnboardingDone,
    setWidgetSetupDone,
    setWidgetEnabled,
    setWidgetLanguages,
    setWidgetMode,
    toggleStar,
    togglePinTemplate,
    setHistoryTags,
    addNotificationLog,
    clearNotificationLog,
    toggleFocusMode,
    setOnline,
    login,
    logout,
    RECORDING_MODES,
    TARGET_LANGUAGES,
    TONES,
  }), [
    state, setField, setFields, clearAll, showError, showSuccess, setLoading, saveCredentials,
    addHistory, deleteHistory, clearHistory, saveDictionary, saveTemplates, incrementUsage,
    toggleDark, setUiLanguage, setOnboardingDone, setWidgetSetupDone, setWidgetEnabled,
    setWidgetLanguages, setWidgetMode, toggleStar, togglePinTemplate, setHistoryTags,
    addNotificationLog, clearNotificationLog, toggleFocusMode, setOnline, login, logout,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
