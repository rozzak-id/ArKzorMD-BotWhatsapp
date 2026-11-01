import type { CommandDefinition } from '../../router/command-registry.js';
import { adminCommand } from './admin.js';
import { hidetagCommand } from './hidetag.js';
import { totagCommand } from './totag.js';
import { delCommand } from './del.js';
import { groupsetCommand } from './groupset.js';
import { groupmodifyCommand } from './groupmodify.js';
import { setppgrupCommand } from './setppgrup.js';
import { autogroupCommand } from './autogroup.js';
import { antilinkCommand } from './antilink.js';
import { badwordCommand } from './badword.js';
import { warnCommand } from './warn.js';
import { welcomeCommand } from './welcome.js';
import { listCommand } from './list.js';
import { groupinfoCommand } from './groupinfo.js';
import { sewaCommand } from './sewa.js';
import { afkCommand } from './afk.js';
import { daftargcCommand } from './daftargc.js';
import { gcCommand } from './gc.js';
import { upswgcCommand } from './upswgc.js';

export const groupCommands: CommandDefinition[] = [
  adminCommand,
  hidetagCommand,
  totagCommand,
  delCommand,
  groupsetCommand,
  groupmodifyCommand,
  setppgrupCommand,
  autogroupCommand,
  antilinkCommand,
  badwordCommand,
  warnCommand,
  welcomeCommand,
  listCommand,
  groupinfoCommand,
  sewaCommand,
  afkCommand,
  daftargcCommand,
  gcCommand,
  upswgcCommand,
];
