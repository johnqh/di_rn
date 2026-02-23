import type {
  Logger,
  LoggerProvider,
  LogType,
} from '@sudobility/di/interfaces';

/**
 * React Native Logger implementation.
 *
 * Uses `console` logging in development (gated by `__DEV__`), with errors
 * always logged in production for crash reporting. Supports child loggers
 * with tagged prefixes.
 *
 * @example
 * ```ts
 * const logger = new RNLogger('console', '[MyApp]');
 * logger.info('App started');
 * logger.error('Something went wrong', error);
 *
 * const child = logger.child('Network');
 * child.debug('Request sent'); // prefix: [MyApp][Network] [DEBUG]
 * ```
 */
export class RNLogger implements Logger {
  readonly type: LogType;
  private prefix: string;

  /**
   * Create a new RNLogger.
   *
   * @param type - The log type. Use `'none'` to suppress all output.
   * @param prefix - A string prefix prepended to all log messages.
   */
  constructor(
    type: LogType = 'console' as LogType,
    prefix: string = '[SignaEmail]'
  ) {
    this.type = type;
    this.prefix = prefix;
  }

  /**
   * Log a general message (development only).
   *
   * @param args - Arguments to log.
   */
  log(...args: unknown[]): void {
    if (this.type === 'none') return;

    if (__DEV__) {
      console.log(this.prefix, ...args);
    }
  }

  /**
   * Log an informational message (development only).
   *
   * @param args - Arguments to log.
   */
  info(...args: unknown[]): void {
    if (this.type === 'none') return;

    if (__DEV__) {
      console.info(this.prefix, '[INFO]', ...args);
    }
  }

  /**
   * Log a warning message (development only).
   *
   * @param args - Arguments to log.
   */
  warn(...args: unknown[]): void {
    if (this.type === 'none') return;

    if (__DEV__) {
      console.warn(this.prefix, '[WARN]', ...args);
    }
  }

  /**
   * Log an error message (always, even in production).
   *
   * @param args - Arguments to log.
   */
  error(...args: unknown[]): void {
    if (this.type === 'none') return;

    // Always log errors, even in production (for crash reporting)
    console.error(this.prefix, '[ERROR]', ...args);
  }

  /**
   * Log a debug message (development only).
   *
   * @param args - Arguments to log.
   */
  debug(...args: unknown[]): void {
    if (this.type === 'none') return;

    if (__DEV__) {
      console.debug(this.prefix, '[DEBUG]', ...args);
    }
  }

  /**
   * Create a child logger with a specific tag appended to the prefix.
   *
   * @param tag - The tag to append (e.g., `'Network'` becomes `[prefix][Network]`).
   * @returns A new `RNLogger` with the extended prefix.
   *
   * @example
   * ```ts
   * const child = logger.child('Storage');
   * child.info('Item saved'); // [SignaEmail][Storage] [INFO] Item saved
   * ```
   */
  child(tag: string): RNLogger {
    return new RNLogger(this.type, `${this.prefix}[${tag}]`);
  }
}

/**
 * React Native Logger Provider.
 *
 * Creates and manages `RNLogger` instances. Implements `LoggerProvider`
 * from `@sudobility/di/interfaces`.
 *
 * @example
 * ```ts
 * const provider = new RNLoggerProvider('console');
 * const logger = provider.getLogger();
 * logger.info('Hello');
 * ```
 */
export class RNLoggerProvider implements LoggerProvider {
  private logType: LogType;
  private logger: RNLogger;

  /**
   * Create a new RNLoggerProvider.
   *
   * @param logType - The log type for all loggers created by this provider.
   */
  constructor(logType: LogType = 'console' as LogType) {
    this.logType = logType;
    this.logger = new RNLogger(logType);
  }

  /**
   * Get the logger instance managed by this provider.
   *
   * @returns The `RNLogger` instance.
   */
  getLogger(): RNLogger {
    return this.logger;
  }

  /**
   * Change the log type, recreating the internal logger.
   *
   * @param type - The new log type.
   */
  setLogType(type: LogType): void {
    this.logType = type;
    this.logger = new RNLogger(type);
  }

  /**
   * Get the current log type.
   *
   * @returns The current `LogType`.
   */
  getLogType(): LogType {
    return this.logType;
  }
}

// Singleton instances
let loggerProvider: RNLoggerProvider | null = null;

/**
 * Get the logger provider singleton, auto-creating one if not yet initialized.
 *
 * @returns The `RNLoggerProvider` singleton instance.
 *
 * @example
 * ```ts
 * const provider = getLoggerProvider();
 * const logger = provider.getLogger();
 * ```
 */
export function getLoggerProvider(): RNLoggerProvider {
  if (!loggerProvider) {
    loggerProvider = new RNLoggerProvider();
  }
  return loggerProvider;
}

/**
 * Get the logger from the singleton provider.
 *
 * Convenience function equivalent to `getLoggerProvider().getLogger()`.
 *
 * @returns The `RNLogger` from the singleton provider.
 *
 * @example
 * ```ts
 * const logger = getLogger();
 * logger.info('App started');
 * ```
 */
export function getLogger(): RNLogger {
  return getLoggerProvider().getLogger();
}

/**
 * Initialize the logger provider singleton with an optional log type.
 *
 * @param type - Optional `LogType` for the logger provider.
 * @returns The initialized `RNLoggerProvider` singleton.
 *
 * @example
 * ```ts
 * initializeLoggerProvider('console');
 * ```
 */
export function initializeLoggerProvider(type?: LogType): RNLoggerProvider {
  loggerProvider = new RNLoggerProvider(type);
  return loggerProvider;
}

/**
 * Reset the logger provider singleton to `null`.
 *
 * @example
 * ```ts
 * resetLoggerProvider();
 * ```
 */
export function resetLoggerProvider(): void {
  loggerProvider = null;
}

export const rnLogger = new RNLogger();
export const rnLoggerProvider = new RNLoggerProvider();
