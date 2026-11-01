import type { InternalMessage, PlatformAdapter, Role } from '../types.js';
import type { ChatStore, MessageStore, PersonaStore, SettingsStore, UserStore } from '../stores.js';
import type { AuditLog } from '../audit/audit-log.js';
import type { ConnectionStatus } from '../types.js';
import type { DecideInput, DecideResult } from '../security/approval-engine.js';

export interface CommandRuntimeStatus {
  uptimeSec: number;
  platformStatus: ConnectionStatus;
  pendingApprovals: number;
  killSwitch: boolean;
  aiProvider: string;
}

export interface CommandServices {
  adapter: PlatformAdapter;
  users: UserStore;
  personas: PersonaStore;
  messages: MessageStore;
  settings: SettingsStore;
  chats?: ChatStore;
  config?: { ownerJid?: string | null; prefix?: string; botNames?: string[] };
  audit: AuditLog;
  menuFor(role: Role): Array<{ name: string; description: string; category?: string }>;
  getStatus(): CommandRuntimeStatus;
  setKillSwitch(enabled: boolean): void;
  decideApproval(input: DecideInput): Promise<DecideResult>;
}

export interface CommandContext {
  message: InternalMessage;
  role: Role;
  args: string[];
  raw: string;
  services: CommandServices;
}

export type CommandHandler = (context: CommandContext) => Promise<string> | string;

export interface CommandDefinition {
  name: string;
  description: string;
  roles: Role[];
  aliases?: string[];
  category?: string;
  handler: CommandHandler;
}

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();
  private readonly aliasMap = new Map<string, CommandDefinition>();

  register(definition: CommandDefinition): void {
    const name = definition.name.toLowerCase().replace(/^\./, '');
    if (this.commands.has(name)) {
      throw new Error(`Command .${name} sudah terdaftar.`);
    }
    const def = { ...definition, name };
    this.commands.set(name, def);

    if (definition.aliases) {
      for (const alias of definition.aliases) {
        const clean = alias.toLowerCase().replace(/^\./, '');
        if (!this.commands.has(clean) && !this.aliasMap.has(clean)) {
          this.aliasMap.set(clean, def);
        }
      }
    }
  }

  registerAll(definitions: CommandDefinition[]): void {
    for (const definition of definitions) this.register(definition);
  }

  get(name: string): CommandDefinition | undefined {
    const clean = name.toLowerCase().replace(/^\./, '');
    return this.commands.get(clean) ?? this.aliasMap.get(clean);
  }

  list(): CommandDefinition[] {
    return [...this.commands.values()];
  }

  listFor(role: Role): CommandDefinition[] {
    return this.list().filter((command) => command.roles.includes(role));
  }
}
