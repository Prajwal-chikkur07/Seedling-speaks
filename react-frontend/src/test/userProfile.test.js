import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeProfile,
  getProfileInitials,
  getProfileFirstName,
  saveUserProfile,
  loadUserProfile,
  mergeAuthProfile,
} from '../services/userProfile';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('normalizeProfile', () => {
  it('uses fullName when present', () => {
    const p = normalizeProfile({ fullName: 'Priya Sharma', email: 'priya@example.com' });
    expect(p.fullName).toBe('Priya Sharma');
    expect(p.name).toBe('Priya Sharma');
  });

  it('falls back to name field when fullName missing', () => {
    const p = normalizeProfile({ name: 'Ravi Kumar' });
    expect(p.fullName).toBe('Ravi Kumar');
  });

  it('normalises avatarUrl from avatar_url', () => {
    const p = normalizeProfile({ avatar_url: 'https://example.com/pic.jpg' });
    expect(p.avatarUrl).toBe('https://example.com/pic.jpg');
  });

  it('normalises uid from id', () => {
    const p = normalizeProfile({ id: 'user_123' });
    expect(p.uid).toBe('user_123');
  });

  it('returns defaults for empty input', () => {
    const p = normalizeProfile({});
    expect(p.fullName).toBe('');
    expect(p.email).toBe('');
    expect(p.avatarUrl).toBe('');
    expect(p.uid).toBe('');
  });
});

describe('getProfileInitials', () => {
  it('returns two-letter initials for a full name', () => {
    expect(getProfileInitials({ fullName: 'Priya Sharma' })).toBe('PS');
  });

  it('returns single letter for a single name', () => {
    expect(getProfileInitials({ fullName: 'Ravi' })).toBe('R');
  });

  it('derives initials from email prefix when no name', () => {
    expect(getProfileInitials({ email: 'ravi@example.com' })).toBe('R');
  });

  it('returns "U" for empty profile', () => {
    expect(getProfileInitials({})).toBe('U');
  });
});

describe('getProfileFirstName', () => {
  it('returns first word of fullName', () => {
    expect(getProfileFirstName({ fullName: 'Priya Sharma' })).toBe('Priya');
  });

  it('returns username part of email when no name', () => {
    expect(getProfileFirstName({ email: 'ravi.kumar@example.com' })).toBe('Ravi.kumar');
  });

  it('returns empty string for empty profile', () => {
    expect(getProfileFirstName({})).toBe('');
  });
});

describe('saveUserProfile / loadUserProfile', () => {
  it('persists and retrieves profile from localStorage', () => {
    saveUserProfile({ fullName: 'Ananya Bhat', email: 'ananya@example.com' });
    const loaded = loadUserProfile();
    expect(loaded.fullName).toBe('Ananya Bhat');
    expect(loaded.email).toBe('ananya@example.com');
  });

  it('returns empty object when localStorage is empty', () => {
    expect(loadUserProfile()).toEqual({});
  });
});

describe('mergeAuthProfile', () => {
  it('merges auth data onto an empty stored profile', () => {
    const result = mergeAuthProfile({ fullName: 'Kavya Reddy', email: 'kavya@example.com', uid: 'u1' });
    expect(result.fullName).toBe('Kavya Reddy');
    expect(result.uid).toBe('u1');
  });

  it('keeps existing fullName and does not overwrite with auth data', () => {
    saveUserProfile({ fullName: 'Local Name', email: 'local@example.com' });
    const result = mergeAuthProfile({ fullName: 'Auth Name', email: 'auth@example.com' });
    expect(result.fullName).toBe('Local Name');
  });
});
