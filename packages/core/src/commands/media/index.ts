import type { CommandDefinition } from '../../router/command-registry.js';
import { aiCommand } from './ai.js';
import { downloaderCommand } from './downloader.js';
import { musicCommand } from './music.js';
import { searchCommand } from './search.js';
import { stickerCommand } from './sticker.js';
import { toimgCommand } from './toimg.js';
import { tovidCommand } from './tovid.js';
import { smemeCommand } from './smeme.js';
import { bratCommand } from './brat.js';
import { makerCommand } from './maker.js';
import { iqcCommand } from './iqc.js';
import { gamecheckCommand } from './gamecheck.js';
import { qrisCommand } from './qris.js';
import { bypaslinkCommand } from './bypaslink.js';
import { toolsCommand } from './tools.js';
import { channelCommand } from './channel.js';
import { buttonCommand } from './button.js';
import { cleanCommand } from './clean.js';

export const mediaCommands: CommandDefinition[] = [
  aiCommand,
  downloaderCommand,
  musicCommand,
  searchCommand,
  stickerCommand,
  toimgCommand,
  tovidCommand,
  smemeCommand,
  bratCommand,
  makerCommand,
  iqcCommand,
  gamecheckCommand,
  qrisCommand,
  bypaslinkCommand,
  toolsCommand,
  channelCommand,
  buttonCommand,
  cleanCommand,
];

