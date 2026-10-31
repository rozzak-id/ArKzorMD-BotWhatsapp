import { readFileSync } from 'node:fs';
import type { Persona, Role, ToolDefinition } from '../types.js';

export interface SystemPromptContext {
  botName?: string;
  botNumber?: string;
  persona: Persona;
  language?: string;
  now?: string;
  timezone?: string;
  chatType?: string;
  chatName?: string;
  chatId?: string;
  senderName?: string;
  senderRole?: Role;
  memoryNotes?: string;
  tools?: ToolDefinition[];
}

function loadTemplate(lang: string): string {
  const normalized = lang.toLowerCase().startsWith('en') ? 'en' : 'id';
  try {
    const url = new URL(`./templates/system-prompt.${normalized}.txt`, import.meta.url);
    return readFileSync(url, 'utf-8');
  } catch {
    // Fallback if template file is missing
    return 'Kamu adalah {{bot_name}}.\n{{persona}}\nTool:\n{{tool_list}}';
  }
}

function formatPersona(persona: Persona): string {
  const parts: string[] = [
    `Nama persona: ${persona.name}`,
    `Gaya bicara: ${persona.style}`,
  ];
  if (persona.greeting) parts.push(`Sapaan khas: ${persona.greeting}`);
  if (persona.forbiddenTopics && persona.forbiddenTopics.length > 0) {
    parts.push(`Topik terlarang: ${persona.forbiddenTopics.join(', ')}`);
  }
  if (persona.extraInstructions) {
    parts.push(`Instruksi khusus: ${persona.extraInstructions}`);
  }
  if (persona.examples && persona.examples.length > 0) {
    parts.push('Contoh:');
    for (const ex of persona.examples) {
      parts.push(`  User: ${ex.user}\n  Bot: ${ex.bot}`);
    }
  }
  return parts.join('\n');
}

function formatToolList(tools?: ToolDefinition[]): string {
  if (!tools || tools.length === 0) {
    return '(Tidak ada tool yang tersedia untuk role ini)';
  }
  return tools
    .map((t) => {
      const props = (t.params as any)?.properties ?? {};
      const required = ((t.params as any)?.required as string[]) ?? [];
      const paramKeys = Object.keys(props);
      const paramsList = paramKeys
        .map((k) => `${k}${required.includes(k) ? '' : '?'}`)
        .join(', ');
      return `- ${t.name}(${paramsList}): ${t.description}`;
    })
    .join('\n');
}

export function buildSystemPrompt(input: Persona | SystemPromptContext): string {
  const context: SystemPromptContext = 'persona' in input
    ? (input as SystemPromptContext)
    : { persona: input as Persona };

  const persona = context.persona;
  const lang = context.language ?? persona.language ?? 'id';
  const template = loadTemplate(lang);

  const botName = context.botName ?? persona.name ?? 'Arka';
  const botNumber = context.botNumber ?? 'akun resmi';
  const now = context.now ?? new Date().toLocaleString('id-ID');
  const timezone = context.timezone ?? 'Asia/Jakarta';
  const chatType = context.chatType ?? 'chat';
  const chatId = context.chatId ?? 'current';
  const chatName = context.chatName ?? chatId;
  const senderName = context.senderName ?? 'User';
  const senderRole = context.senderRole ?? 'member';
  const memoryNotes = context.memoryNotes && context.memoryNotes.trim()
    ? context.memoryNotes.trim()
    : 'Belum ada catatan memori tersimpan.';
  const toolList = formatToolList(context.tools);

  return template
    .replace(/\{\{bot_name\}\}/g, botName)
    .replace(/\{\{bot_number\}\}/g, botNumber)
    .replace(/\{\{persona\}\}/g, formatPersona(persona))
    .replace(/\{\{language\}\}/g, lang)
    .replace(/\{\{now\}\}/g, now)
    .replace(/\{\{timezone\}\}/g, timezone)
    .replace(/\{\{chat_type\}\}/g, chatType)
    .replace(/\{\{chat_name\}\}/g, chatName)
    .replace(/\{\{chat_id\}\}/g, chatId)
    .replace(/\{\{sender_name\}\}/g, senderName)
    .replace(/\{\{sender_role\}\}/g, senderRole)
    .replace(/\{\{memory_notes\}\}/g, memoryNotes)
    .replace(/\{\{tool_list\}\}/g, toolList);
}
