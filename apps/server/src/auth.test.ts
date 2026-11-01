import { describe, expect, it } from 'vitest';
import {
  checkAdminPassword,
  hashPassword,
  isSetupCompleted,
  SessionManager,
  setAdminPassword,
  verifyPassword,
} from './auth.js';

describe('Auth Utilities', () => {
  it('hashes password and verifies successfully', () => {
    const password = 'mySecretAdminPassword123';
    const hash = hashPassword(password);
    expect(hash).toContain(':');
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('wrongPassword', hash)).toBe(false);
  });

  it('handles invalid hash format gracefully', () => {
    expect(verifyPassword('pass', 'invalid')).toBe(false);
    expect(verifyPassword('pass', '')).toBe(false);
  });

  it('manages sessions correctly', () => {
    const sm = new SessionManager();
    const token = sm.createSession();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes hex
    expect(sm.isValidSession(token)).toBe(true);
    expect(sm.isValidSession('unknown-token')).toBe(false);
    expect(sm.isValidSession('')).toBe(false);

    sm.revokeSession(token);
    expect(sm.isValidSession(token)).toBe(false);
  });

  it('handles setup completed flag and password verification via mock context', () => {
    const settingsMap = new Map<string, string>();
    const mockContext = {
      stores: {
        settings: {
          get: (key: string) => settingsMap.get(key),
          set: (key: string, value: string) => settingsMap.set(key, value),
        },
      },
    } as any;

    expect(isSetupCompleted(mockContext)).toBe(false);
    setAdminPassword(mockContext, 'superSecret123');
    expect(isSetupCompleted(mockContext)).toBe(true);
    expect(checkAdminPassword(mockContext, 'superSecret123')).toBe(true);
    expect(checkAdminPassword(mockContext, 'wrongPass')).toBe(false);
  });
});
