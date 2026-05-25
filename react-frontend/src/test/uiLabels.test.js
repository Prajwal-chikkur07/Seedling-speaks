import { describe, it, expect } from 'vitest';
import { getLabels } from '../services/uiLabels';

describe('getLabels', () => {
  it('returns English labels for "en"', () => {
    const L = getLabels('en');
    expect(L.home).toBe('Home');
    expect(L.translate).toBe('Translate');
  });

  it('returns Hindi labels for "hi-IN"', () => {
    const L = getLabels('hi-IN');
    expect(L.home).toBe('होम');
  });

  it('returns Kannada labels for "kn-IN"', () => {
    const L = getLabels('kn-IN');
    expect(L.home).toBe('ಹೋಮ್');
  });

  it('falls back to English for unknown language code', () => {
    const L = getLabels('xx-XX');
    expect(L.home).toBe('Home');
  });

  it('falls back to English for undefined', () => {
    const L = getLabels(undefined);
    expect(L.home).toBe('Home');
  });

  it('every supported language has the required core keys', () => {
    const coreCodes = ['hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'kn-IN', 'pa-IN', 'or-IN'];
    const coreKeys = ['home', 'translate', 'history', 'profile', 'settings', 'logout'];
    for (const code of coreCodes) {
      const L = getLabels(code);
      for (const key of coreKeys) {
        expect(L[key], `${code} missing key "${key}"`).toBeTruthy();
      }
    }
  });
});
