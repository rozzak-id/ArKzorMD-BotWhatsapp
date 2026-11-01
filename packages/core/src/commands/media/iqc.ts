import type { CommandDefinition } from '../../router/command-registry.js';

export const iqcCommand: CommandDefinition = {
 name: 'iqc',
 aliases: ['iphonequote', 'qciphone', 'ioschat'],
 category: 'media',
 description: 'Menghasilkan gambar tangkapan layar kutipan chat bubble iPhone iOS',
 roles: ['member', 'admin', 'owner'],
 handler: (context) => {
 const text = context.args.join(' ').trim();
 if (!text) {
 return 'Ketik teks untuk kutipan chat iPhone, contoh: `.iqc Selamat pagi dunia`';
 }
 return ` Membuat gelembung chat iPhone iOS untuk: "${text}"...`;
 },
};

