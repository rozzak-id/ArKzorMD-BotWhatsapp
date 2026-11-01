import type { CommandDefinition } from '../../router/command-registry.js';
import { orderCommand } from './order.js';
import { faqCommand } from './faq.js';
import { komplainCommand } from './komplain.js';
import { broadcastCommand } from './broadcast.js';
import { bcgcCommand } from './bcgc.js';

export const csCommands: CommandDefinition[] = [
  orderCommand,
  faqCommand,
  komplainCommand,
  broadcastCommand,
  bcgcCommand,
];
