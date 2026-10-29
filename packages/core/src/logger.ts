import { pino, type Logger } from 'pino';

export type { Logger };

export interface LoggerOptions {
  level?: string;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return pino({
    level: options.level ?? 'info',
    base: { app: 'arkzormd' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.apiKey',
        '*.token',
        '*.secret',
        '*.password',
      ],
      censor: '[redacted]',
    },
  });
}
