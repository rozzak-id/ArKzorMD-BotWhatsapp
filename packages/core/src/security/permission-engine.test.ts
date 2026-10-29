import { describe, expect, it } from 'vitest';
import type { ToolSchema } from '../types.js';
import { PermissionEngine } from './permission-engine.js';

function tool(
  risk: ToolSchema['risk'],
  allowedRoles: ToolSchema['allowedRoles'] = ['owner', 'admin', 'member'],
  name = 'demo',
): ToolSchema {
  return { name, description: '', parameters: {}, risk, allowedRoles };
}

function engine(options: { killSwitch?: boolean; rule?: boolean } = {}): PermissionEngine {
  return new PermissionEngine({
    isKillSwitchOn: () => options.killSwitch ?? false,
    hasRule: () => options.rule ?? false,
  });
}

describe('PermissionEngine', () => {
  it('mengizinkan aksi L0 untuk semua role', () => {
    expect(engine().evaluate({ role: 'member', tool: tool('L0') }).outcome).toBe('allow');
    expect(engine().evaluate({ role: 'owner', tool: tool('L0') }).outcome).toBe('allow');
  });

  it('L0 tetap jalan saat kill switch aktif', () => {
    expect(
      engine({ killSwitch: true }).evaluate({ role: 'member', tool: tool('L0') }).outcome,
    ).toBe('allow');
  });

  it('Admin memicu approval untuk L1', () => {
    const decision = engine().evaluate({ role: 'admin', tool: tool('L1', ['owner', 'admin']) });
    expect(decision.outcome).toBe('approval');
    expect(decision.reason).toContain('persetujuan Owner');
  });

  it('Owner memakai konfirmasi satu ketuk untuk L1', () => {
    const decision = engine().evaluate({ role: 'owner', tool: tool('L1', ['owner']) });
    expect(decision.outcome).toBe('approval');
    expect(decision.reason).toContain('konfirmasi');
  });

  it('Member ditolak untuk L1', () => {
    expect(
      engine().evaluate({ role: 'member', tool: tool('L1', ['owner', 'admin']) }).outcome,
    ).toBe('deny');
  });

  it('kill switch memblokir semua L1', () => {
    const decision = engine({ killSwitch: true }).evaluate({
      role: 'admin',
      tool: tool('L1', ['owner', 'admin']),
    });
    expect(decision.outcome).toBe('deny');
    expect(decision.reason).toContain('Kill switch');
  });

  it('aturan setuju selalu mengizinkan L1', () => {
    expect(
      engine({ rule: true }).evaluate({ role: 'admin', tool: tool('L1', ['owner', 'admin']) })
        .outcome,
    ).toBe('allow');
  });

  it('L2 selalu ditolak, termasuk untuk Owner', () => {
    const decision = engine().evaluate({ role: 'owner', tool: tool('L2', ['owner']) });
    expect(decision.outcome).toBe('deny');
    expect(decision.reason).toContain('Web UI');
  });

  it('role yang tidak diizinkan ditolak sebelum cek risiko', () => {
    const decision = engine().evaluate({ role: 'member', tool: tool('L0', ['owner']) });
    expect(decision.outcome).toBe('deny');
  });
});
