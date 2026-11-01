import { describe, expect, it } from 'vitest';
import { cleanAiMarks } from './clean-marks.js';

describe('cleanAiMarks (Layer A Provenance & AI Watermark Cleaner)', () => {
  it('membersihkan zero-width space dan joiner tersembunyi', () => {
    // Teks berisi ZWSP (\u200B), ZWNJ (\u200C), ZWJ (\u200D), BOM (\uFEFF)
    const dirtyText = 'Halo\u200B dunia\u200C ini\u200D teks\uFEFF rahasia';
    const result = cleanAiMarks(dirtyText);

    expect(result.marksFound).toBe(4);
    expect(result.cleanedText).toBe('Halo dunia ini teks rahasia');
    expect(result.detectedTypes.some((t) => t.includes('Zero-Width'))).toBe(true);
  });

  it('membersihkan tag characters dan bidi overrides', () => {
    const dirtyText = 'Teks\u{E0001}\u{E0020} normal\u202E terbalik\u202C';
    const result = cleanAiMarks(dirtyText);

    expect(result.marksFound).toBe(4);
    expect(result.cleanedText).toBe('Teks normal terbalik');
    expect(result.detectedTypes.some((t) => t.includes('Tag Characters'))).toBe(true);
  });

  it('mengembalikan teks bersih tanpa perubahan jika tidak ada watermark', () => {
    const clean = 'Teks ini 100% bersih tanpa watermark!';
    const result = cleanAiMarks(clean);

    expect(result.marksFound).toBe(0);
    expect(result.cleanedText).toBe(clean);
    expect(result.detectedTypes).toHaveLength(0);
  });
});
