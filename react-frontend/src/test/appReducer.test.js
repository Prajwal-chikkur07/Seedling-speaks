import { describe, it, expect, beforeEach } from 'vitest';
import { reducer, createInitialState } from '../context/appReducer';

beforeEach(() => {
  localStorage.clear();
});

describe('appReducer', () => {
  it('CLEAR_ALL resets the transcript and n2eSessionId', () => {
    const state = { ...createInitialState(), englishText: 'hello', n2eSessionId: 'sess-1' };
    const next = reducer(state, { type: 'CLEAR_ALL' });
    expect(next.englishText).toBe('');
    expect(next.n2eSessionId).toBeNull();
  });

  it('LOGOUT clears user data but keeps preferences', () => {
    let state = { ...createInitialState(), darkMode: true, uiLanguage: 'hi' };
    state = reducer(state, { type: 'LOGIN', user: { id: 'u1' } });
    state = reducer(state, { type: 'ADD_HISTORY', entry: { text: 'hi' } });
    state = reducer(state, { type: 'SAVE_CREDENTIALS', credentials: { slackWebhook: 'x' } });
    state = reducer(state, { type: 'SET_HISTORY_TAGS', entryId: 1, tags: ['a'] });
    state = reducer(state, { type: 'ADD_NOTIFICATION_LOG', msg: 'm' });

    const next = reducer(state, { type: 'LOGOUT' });
    expect(next.authUser).toBeNull();
    expect(next.transcriptHistory).toEqual([]);
    expect(next.channelCredentials).toEqual({});
    expect(next.historyTags).toEqual({});
    expect(next.notificationLog).toEqual([]);
    expect(next.darkMode).toBe(true);
    expect(next.uiLanguage).toBe('hi');
  });

  it('falls back to defaults when localStorage holds corrupt JSON', () => {
    localStorage.setItem('transcriptHistory', '{not json');
    localStorage.setItem('usageStats', 'undefined');
    localStorage.setItem('starredIds', '{"wrong":"type"}');
    localStorage.setItem('defaultLanguage', 'ta-IN');

    const state = createInitialState();
    expect(state.transcriptHistory).toEqual([]);
    expect(state.usageStats).toEqual({ sarvamCalls: 0, geminiCalls: 0, cacheHits: 0 });
    expect(state.starredIds).toEqual([]);
    expect(state.selectedLanguage).toBe('ta-IN');
  });

  it('reducer does not write to localStorage', () => {
    reducer(createInitialState(), { type: 'ADD_HISTORY', entry: { text: 'hi' } });
    expect(localStorage.getItem('transcriptHistory')).toBeNull();
  });
});
