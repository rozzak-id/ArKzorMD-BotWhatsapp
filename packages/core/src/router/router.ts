import type { InternalMessage } from '../types.js';
import type { CommandRegistry } from './command-registry.js';

export type RouteResult =
  | { kind: 'command'; name: string; args: string[]; raw: string; known: boolean }
  | { kind: 'agent' };

/**
 * Router hybrid: pesan berprefix masuk ke command handler tanpa AI,
 * pesan lain diteruskan ke AI Agent.
 */
export class MessageRouter {
  constructor(
    private readonly prefix: string,
    private readonly commands: CommandRegistry,
  ) {}

  route(message: InternalMessage): RouteResult {
    const text = message.text.trimStart();
    if (!this.prefix || !text.startsWith(this.prefix)) {
      return { kind: 'agent' };
    }

    const withoutPrefix = text.slice(this.prefix.length).trim();
    if (!withoutPrefix) {
      return { kind: 'command', name: '', args: [], raw: text, known: false };
    }

    const [name = '', ...args] = withoutPrefix.split(/\s+/);
    return {
      kind: 'command',
      name: name.toLowerCase(),
      args,
      raw: text,
      known: this.commands.get(name) !== undefined,
    };
  }

  getPrefix(): string {
    return this.prefix;
  }
}
