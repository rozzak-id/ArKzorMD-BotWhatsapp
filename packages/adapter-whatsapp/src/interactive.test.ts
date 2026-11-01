import { describe, expect, it } from 'vitest';
import { proto } from 'onigis';
import { buildNativeFlowButtons } from './interactive.js';

describe('buildNativeFlowButtons', () => {
  it('membangun 5 tipe tombol native flow dengan benar', () => {
    const buttons = buildNativeFlowButtons(proto, [
      { text: 'Menu Opsi', type: 'single_select', rows: [{ id: 'opt1', title: 'Pilihan 1' }] },
      { text: 'Kunjungi Web', type: 'cta_url', url: 'https://arkzormd.local' },
      { text: 'Hubungi Kami', type: 'cta_call', phone: '+628123456789' },
      { text: 'Salin Kode', type: 'cta_copy', copyCode: 'PROMO2026' },
      { text: 'Quick Action', id: '.ping' },
    ]);

    expect(buttons).toHaveLength(5);

    // single_select
    expect(buttons[0]?.name).toBe('single_select');
    const b0 = JSON.parse(buttons[0]?.buttonParamsJson || '{}');
    expect(b0.title).toBe('Menu Opsi');
    expect(b0.sections).toHaveLength(1);

    // cta_url
    expect(buttons[1]?.name).toBe('cta_url');
    const b1 = JSON.parse(buttons[1]?.buttonParamsJson || '{}');
    expect(b1.url).toBe('https://arkzormd.local');

    // cta_call
    expect(buttons[2]?.name).toBe('cta_call');
    const b2 = JSON.parse(buttons[2]?.buttonParamsJson || '{}');
    expect(b2.phone_number).toBe('+628123456789');

    // cta_copy
    expect(buttons[3]?.name).toBe('cta_copy');
    const b3 = JSON.parse(buttons[3]?.buttonParamsJson || '{}');
    expect(b3.copy_code).toBe('PROMO2026');

    // quick_reply
    expect(buttons[4]?.name).toBe('quick_reply');
    const b4 = JSON.parse(buttons[4]?.buttonParamsJson || '{}');
    expect(b4.id).toBe('.ping');
  });
});
