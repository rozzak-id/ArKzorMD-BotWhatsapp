import type { InternalMessage, PlatformAdapter, Role } from '../types.js';
import type { MessageStore, PersonaStore, SettingsStore, UserStore } from '../stores.js';
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
  audit: AuditLog;
  menuFor(role: Role): Array<{ name: string; description: string }>;
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
  handler: CommandHandler;
}

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();

  register(definition: CommandDefinition): void {
    const name = definition.name.toLowerCase().replace(/^\./, '');
    if (this.commands.has(name)) {
      throw new Error(`Command .${name} sudah terdaftar.`);
    }
    this.commands.set(name, { ...definition, name });
  }

  registerAll(definitions: CommandDefinition[]): void {
    for (const definition of definitions) this.register(definition);
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name.toLowerCase());
  }

  list(): CommandDefinition[] {
    return [...this.commands.values()];
  }

  listFor(role: Role): CommandDefinition[] {
    return this.list().filter((command) => command.roles.includes(role));
  }
}
