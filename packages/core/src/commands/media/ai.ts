import type { CommandDefinition } from '../../router/command-registry.js';

export const aiCommand: CommandDefinition = {
 name: 'ai',
 aliases: ['azusa', 'azu', 'bot', 'agent', 'tanya', 'chatgpt', 'gemini', 'groq', 'ask'],
 category: 'media',
 description: 'Asisten cerdas multimodal AI untuk obrolan santai, coding, dan tanya jawab',
 roles: ['member', 'admin', 'owner'],
 handler: (context) => {
 const question = context.args.join(' ').trim();
 if (!question) {
 return 'Ketik pertanyaan atau perintah Anda, contoh: `.ai Jelaskan apa itu WhatsApp E2EE`';
 }
 return ` _Memproses pertanyaan via AI Engine..._\n\nKetik langsung tanpa prefix untuk bercakap-cakap santai dengan AI persona.`;
 },
};

