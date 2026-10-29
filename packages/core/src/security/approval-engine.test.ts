import { describe, expect, it, vi } from 'vitest';
import { AuditLog } from '../audit/audit-log.js';
import { openDatabase } from '../db/index.js';
import { createStores } from '../db/sqlite-stores.js';
import { ApprovalEngine } from './approval-engine.js';

const OWNER = '6281111111111@s.whatsapp.net';
const ADMIN = '6282222222222@s.whatsapp.net';

function setup(ttlMs = 60_000) {
  const db = openDatabase(':memory:');
  const stores = createStores(db);
  const audit = new AuditLog(stores.audit);
  const engine = new ApprovalEngine(stores.approvals, audit, {
    ownerJid: () => OWNER,
    ttlMs,
  });
  return { db, stores, audit, engine };
}

function input(overrides: Partial<Parameters<ApprovalEngine['create']>[0]> = {}) {
  return {
    requesterJid: ADMIN,
    requesterRole: 'admin' as const,
    toolName: 'send_message',
    params: { to: '6283333333333@s.whatsapp.net', text: 'halo' },
    chatId: 'chat-1',
    ...overrides,
  };
}

describe('ApprovalEngine', () => {
  it('membuat request dengan kode pendek dan status pending', async () => {
    const { engine, db } = setup();
    const request = await engine.create(input());
    expect(request.shortCode).toMatch(/^#[0-9A-F]{4}$/);
    expect(request.status).toBe('pending');
    expect(engine.pendingCount()).toBe(1);
    db.close();
  });

  it('menolak keputusan dari JID selain Owner', async () => {
    const { engine, db } = setup();
    const request = await engine.create(input());
    const result = await engine.decide({
      shortCode: request.shortCode,
      actorJid: ADMIN,
      decision: 'approve',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Owner');
    db.close();
  });

  it('menyetujui request dan menjalankan handler sekali', async () => {
    const { engine, db } = setup();
    const handler = vi.fn(async () => ({ ok: true, output: { sent: true } }));
    engine.setDecisionHandler(handler);
    const request = await engine.create(input());

    const result = await engine.decide({
      shortCode: request.shortCode.toLowerCase(),
      actorJid: OWNER,
      decision: 'approve',
    });

    expect(result.ok).toBe(true);
    expect(result.request?.status).toBe('approved');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(engine.pendingCount()).toBe(0);
    db.close();
  });

  it('tidak bisa memutuskan request yang sama dua kali', async () => {
    const { engine, db } = setup();
    const request = await engine.create(input());
    await engine.decide({ shortCode: request.shortCode, actorJid: OWNER, decision: 'reject' });
    const second = await engine.decide({
      shortCode: request.shortCode,
      actorJid: OWNER,
      decision: 'approve',
    });
    expect(second.ok).toBe(false);
    expect(second.reason).toContain('rejected');
    db.close();
  });

  it('setuju selalu membuat aturan yang bisa dicabut', async () => {
    const { engine, db } = setup();
    const request = await engine.create(input());
    const result = await engine.decide({
      shortCode: request.shortCode,
      actorJid: OWNER,
      decision: 'always',
    });

    expect(result.ok).toBe(true);
    expect(result.rule?.toolName).toBe('send_message');
    expect(engine.matchRule('send_message', '6283333333333@s.whatsapp.net')).toBe(true);

    const ruleId = result.rule?.id ?? '';
    expect(engine.revokeRule(ruleId)).toBe(true);
    expect(engine.matchRule('send_message', '6283333333333@s.whatsapp.net')).toBe(false);
    db.close();
  });

  it('menandai request kedaluwarsa', async () => {
    const { engine, db } = setup(0);
    const request = await engine.create(input());
    const result = await engine.decide({
      shortCode: request.shortCode,
      actorJid: OWNER,
      decision: 'approve',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('kedaluwarsa');
    db.close();
  });

  it('mencatat audit untuk request dan keputusan', async () => {
    const { engine, audit, db } = setup();
    const request = await engine.create(input());
    await engine.decide({ shortCode: request.shortCode, actorJid: OWNER, decision: 'reject' });
    const actions = audit.list(20).map((entry) => entry.action);
    expect(actions).toContain('approval.requested');
    expect(actions).toContain('approval.decided');
    db.close();
  });
});
