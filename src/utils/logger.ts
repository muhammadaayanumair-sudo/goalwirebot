type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const colors: Record<LogLevel, string> = {
  INFO: '\x1b[36m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
  DEBUG: '\x1b[90m',
};

const reset = '\x1b[0m';

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, ...args: unknown[]): void {
  const prefix = `${colors[level]}[${timestamp()}] [${level}]${reset}`;
  if (level === 'ERROR') {
    console.error(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

export const logger = {
  info: (...args: unknown[]) => log('INFO', ...args),
  warn: (...args: unknown[]) => log('WARN', ...args),
  error: (...args: unknown[]) => log('ERROR', ...args),
  debug: (...args: unknown[]) => log('DEBUG', ...args),
};
