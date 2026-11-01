import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppContext } from './context.js';

const SETTING_PASSWORD_HASH = 'admin_password_hash';
const SETTING_SETUP_COMPLETED = 'setup_completed';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  if (!salt || !key) return false;
  try {
    const derivedKey = scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    return keyBuffer.length === derivedKey.length && timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

interface Session {
  token: string;
  createdAt: number;
  expiresAt: number;
}

export class SessionManager {
  private sessions = new Map<string, Session>();

  createSession(): string {
    const token = randomBytes(32).toString('hex');
    const now = Date.now();
    this.sessions.set(token, {
      token,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });
    return token;
  }

  isValidSession(token?: string): boolean {
    if (!token) return false;
    const session = this.sessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }

  revokeSession(token: string): boolean {
    return this.sessions.delete(token);
  }

  cleanExpired(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }
}

export const sessionManager = new SessionManager();

export function isSetupCompleted(context: AppContext): boolean {
  const flag = context.stores.settings.get(SETTING_SETUP_COMPLETED);
  const hasHash = Boolean(context.stores.settings.get(SETTING_PASSWORD_HASH));
  return flag === 'true' && hasHash;
}

export function setAdminPassword(context: AppContext, password: string): void {
  const hash = hashPassword(password);
  context.stores.settings.set(SETTING_PASSWORD_HASH, hash);
  context.stores.settings.set(SETTING_SETUP_COMPLETED, 'true');
}

export function checkAdminPassword(context: AppContext, password: string): boolean {
  const storedHash = context.stores.settings.get(SETTING_PASSWORD_HASH);
  if (!storedHash) return false;
  return verifyPassword(password, storedHash);
}

function safeEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function extractToken(request: FastifyRequest): string | undefined {
  const adminHeader = request.headers['x-admin-token'];
  if (typeof adminHeader === 'string' && adminHeader.trim()) {
    return adminHeader.trim();
  }
  const sessionHeader = request.headers['x-session-token'];
  if (typeof sessionHeader === 'string' && sessionHeader.trim()) {
    return sessionHeader.trim();
  }
  const authHeader = request.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

export function isAuthenticated(context: AppContext, request: FastifyRequest): boolean {
  const token = extractToken(request);
  if (!token) return false;

  // 1. Cek ADMIN_TOKEN statis di config (.env)
  if (context.config.adminToken && safeEqual(context.config.adminToken, token)) {
    return true;
  }

  // 2. Cek session aktif dari login Web UI
  return sessionManager.isValidSession(token);
}

export function requireAdmin(
  context: AppContext,
  request: FastifyRequest,
  reply: FastifyReply,
): boolean {
  if (isAuthenticated(context, request)) {
    return true;
  }

  const hasConfigToken = Boolean(context.config.adminToken);
  const hasSetup = isSetupCompleted(context);

  if (!hasConfigToken && !hasSetup) {
    reply.code(503).send({
      error:
        'Sistem belum disetup atau ADMIN_TOKEN belum dikonfigurasi. ' +
        'Selesaikan setup wizard di Web UI terlebih dahulu.',
    });
    return false;
  }

  reply.code(401).send({ error: 'Sesi kedaluwarsa atau token admin tidak valid.' });
  return false;
}
