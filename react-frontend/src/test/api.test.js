import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../components/Toast', () => ({ toast: { error: vi.fn() } }));

import API, * as api from '../services/api';
import { toast } from '../components/Toast';

function respondWith(handler) {
  API.defaults.adapter = vi.fn(async (config) => handler(config));
  return API.defaults.adapter;
}

beforeEach(() => {
  api.setTokenGetter(null);
  vi.mocked(toast.error).mockClear();
});

describe('services/api', () => {
  it('exports the API helpers', () => {
    expect(typeof api.translateText).toBe('function');
    expect(typeof api.getVideoAsset).toBe('function');
    expect(api.API_BASE_URL).toBeTruthy();
  });

  it('fetches a fresh token for every request', async () => {
    let n = 0;
    api.setTokenGetter(async () => `token-${++n}`);
    respondWith((config) => ({ data: config.headers.Authorization, status: 200, statusText: 'OK', headers: {}, config }));

    expect((await API.get('/auth/me')).data).toBe('Bearer token-1');
    expect((await API.get('/auth/me')).data).toBe('Bearer token-2');
  });

  it('sends no Authorization header after the getter is cleared', async () => {
    api.setTokenGetter(async () => 'abc');
    api.setTokenGetter(null);
    respondWith((config) => ({ data: config.headers.Authorization ?? null, status: 200, statusText: 'OK', headers: {}, config }));

    expect((await API.get('/auth/me')).data).toBeNull();
  });

  it('does not retry non-idempotent requests, and toasts once', async () => {
    const adapter = respondWith((config) => {
      const err = new Error('boom');
      err.config = config;
      err.response = { status: 500, data: {}, config };
      throw err;
    });

    await expect(api.translateText('hi', 'hi-IN')).rejects.toThrow('boom');
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
