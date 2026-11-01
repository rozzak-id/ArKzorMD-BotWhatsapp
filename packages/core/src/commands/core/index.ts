import type { CommandDefinition } from '../../router/command-registry.js';
import { menuCommand } from './menu.js';
import { pingCommand } from './ping.js';
import { ownerCommand } from './owner.js';
import { roleCommand } from './role.js';
import { statusCommand } from './status.js';
import { resetCommand } from './reset.js';
import { personaCommand } from './persona.js';
import { alwaysCommand, approveCommand, rejectCommand } from './approval.js';
import { stopCommand } from './stop.js';
import { publicCommand } from './public.js';
import { selfCommand } from './self.js';
import { autoreadCommand } from './autoread.js';
import { mengetikCommand } from './mengetik.js';
import { forwardpcCommand } from './forwardpc.js';

export const coreCommands: CommandDefinition[] = [
  menuCommand,
  pingCommand,
  ownerCommand,
  roleCommand,
  statusCommand,
  resetCommand,
  personaCommand,
  approveCommand,
  rejectCommand,
  alwaysCommand,
  stopCommand,
  publicCommand,
  selfCommand,
  autoreadCommand,
  mengetikCommand,
  forwardpcCommand,
];
