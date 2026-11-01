import type { CommandDefinition } from '../../router/command-registry.js';
import { cleanAiMarks } from '../../utils/clean-marks.js';

export const cleanCommand: CommandDefinition = {
 name: 'clean',
 aliases: ['unmark', 'cleanmark', 'antidetect', 'stripmark', 'cleanaimarks'],
 category: 'media',
 description: 'Membersihkan tanda air AI tak kasat mata (invisible Unicode, zero-width, tag characters)',
 roles: ['member', 'admin', 'owner'],
 handler: (context) => {
 const textArg = context.args.join(' ').trim();
 const targetText = textArg || context.message.quoted?.text || '';

 if (!targetText) {
 return 'Format: `.clean <teks>` atau balas pesan yang berisi teks AI lalu ketik `.clean` untuk membersihkan watermark tak kasat mata.';
 }

 const result = cleanAiMarks(targetText, { normalizeSpaces: true, nfkc: true });

 if (result.marksFound === 0) {
 return `[] Teks sudah bersih dari tanda air AI tak kasat mata (0 watermark terdeteksi).\n\n${result.cleanedText}`;
 }

 const report = result.detectedTypes.join(', ');
 return (
 `[] Berhasil membersihkan ${result.marksFound} tanda air AI!\n` +
 `Deteksi: ${report}\n\n` +
 `Hasil Bersih:\n${result.cleanedText}`
 );
 },
};
