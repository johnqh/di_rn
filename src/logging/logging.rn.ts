import type { Logger, LoggerProvider, LogType } from '@sudobility/di';

/**
 * React Native Logger implementation.
 * Uses console logging in development, can be extended for crash reporting.
 */
export class RNLogger implements Logger {
  readonly type: LogType;
  private prefix: string;

  constructor(
    type: LogType = 'console' as LogType,
    prefix: string = '[SignaEmail]'
  ) {
    this.type = type;
    this.prefix = prefix;
  }

  log(...args: unknown[]): void {
    if (this.type === 'none') return;

    if (__DEV__) {
      console.log(this.prefix, ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.type === 'none') return;

    if (__DEV__) {
      console.info(this.prefix, '[INFO]', ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.type === 'none') return;

    if (__DEV__) {
      console.warn(this.prefix, '[WARN]', ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.type === 'none') return;

    // Always log errors, even in production (for crash reporting)
    console.error(this.prefix, '[ERROR]', ...args);
  }

  debug(...args: unknown[]): void {
    if (this.type === 'none') return;

    if (__DEV__) {
      console.debug(this.prefix, '[DEBUG]', ...args);
    }
  }

  /**
   * Create a child logger with a specific tag.
   */
  child(tag: string): RNLogger {
    return new RNLogger(this.type, `${this.prefix}[${tag}]`);
  }
}

/**
 * React Native Logger Provider.
 */
export class RNLoggerProvider implements LoggerProvider {
  private logType: LogType;
  private logger: RNLogger;

  constructor(logType: LogType = 'console' as LogType) {
    this.logType = logType;
    this.logger = new RNLogger(logType);
  }

  getLogger(): RNLogger {
    return this.logger;
  }

  setLogType(type: LogType): void {
    this.logType = type;
    this.logger = new RNLogger(type);
  }

  getLogType(): LogType {
    return this.logType;
  }
}

// Singleton instances
let loggerProvider: RNLoggerProvider | null = null;

export function getLoggerProvider(): RNLoggerProvider {
  if (!loggerProvider) {
    loggerProvider = new RNLoggerProvider();
  }
  return loggerProvider;
}

export function getLogger(): RNLogger {
  return getLoggerProvider().getLogger();
}

export function initializeLoggerProvider(type?: LogType): RNLoggerProvider {
  loggerProvider = new RNLoggerProvider(type);
  return loggerProvider;
}

export function resetLoggerProvider(): void {
  loggerProvider = null;
}

export const rnLogger = new RNLogger();
export const rnLoggerProvider = new RNLoggerProvider();
