/**
 * Modul Pembersih Tanda Air AI & Karakter Tak Kasat Mata (Layer A Provenance Cleaner)
 * Berdasarkan spesifikasi remove-ai-marks (guillaumemeyer/watermarks-remover).
 */

export interface CleanMarksResult {
  cleanedText: string;
  marksFound: number;
  detectedTypes: string[];
}

// Regex pola karakter tersembunyi/invisible Unicode yang biasa disisipkan AI watermark
const ZWJ_FAMILY = /[\u200B\u200C\u200D\u2060\uFEFF]/g;
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069\u200E\u200F]/g;
const TAG_CHARS = /[\u{E0001}-\u{E007F}]/gu;
const VARIATION_SELECTORS = /[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;
const INVISIBLE_IGNORABLES = /[\u00AD\u2061-\u2065\uFFF0-\uFFF8]/gu;
const EXOTIC_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

/**
 * Mendeteksi dan membersihkan tanda air AI tak kasat mata dari teks.
 */
export function cleanAiMarks(text: string, options: { normalizeSpaces?: boolean; nfkc?: boolean } = {}): CleanMarksResult {
  if (!text) {
    return { cleanedText: '', marksFound: 0, detectedTypes: [] };
  }

  let marksFound = 0;
  const detectedTypes: string[] = [];

  const checkAndCount = (regex: RegExp, type: string) => {
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      marksFound += matches.length;
      detectedTypes.push(`${type} (${matches.length})`);
    }
  };

  checkAndCount(ZWJ_FAMILY, 'Zero-Width Characters');
  checkAndCount(BIDI_CONTROLS, 'Bidi Directional Overrides');
  checkAndCount(TAG_CHARS, 'Invisible Tag Characters');
  checkAndCount(VARIATION_SELECTORS, 'Variation Selectors');
  checkAndCount(INVISIBLE_IGNORABLES, 'Ignorable Format Marks');
  if (options.normalizeSpaces) {
    checkAndCount(EXOTIC_SPACES, 'Exotic Spaces');
  }

  // Bersihkan karakter tak kasat mata
  let cleaned = text
    .replace(ZWJ_FAMILY, '')
    .replace(BIDI_CONTROLS, '')
    .replace(TAG_CHARS, '')
    .replace(VARIATION_SELECTORS, '')
    .replace(INVISIBLE_IGNORABLES, '');

  if (options.normalizeSpaces) {
    cleaned = cleaned.replace(EXOTIC_SPACES, ' ');
  }

  // Normalisasi bentuk kanonik Unicode (NFKC)
  if (options.nfkc !== false) {
    cleaned = cleaned.normalize('NFKC');
  }

  return {
    cleanedText: cleaned,
    marksFound,
    detectedTypes,
  };
}

