// Centralized logging utility

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    let message = `[${timestamp}] ${level}: ${entry.message}`;
    
    if (entry.context) {
      message += ` | Context: ${JSON.stringify(entry.context)}`;
    }
    
    return message;
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.addLog(entry);
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage(entry));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.addLog(entry);
    
    console.info(this.formatMessage(entry));
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.addLog(entry);
    
    console.warn(this.formatMessage(entry));
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.addLog(entry);
    
    console.error(this.formatMessage(entry), error);
    
    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry);
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // TODO: Implement external logging service integration
    // Example: Sentry, LogRocket, DataDog, etc.
    console.log('Would send to external logging service:', entry);
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }

  // Set log level
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  // Export logs for debugging
  exportLogs(): string {
    return this.logs.map(entry => this.formatMessage(entry)).join('\n');
  }
}

// Create singleton logger instance
export const logger = new Logger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

// Convenience functions
export const log = {
  debug: (message: string, context?: Record<string, any>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, any>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, any>) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: Record<string, any>) => logger.error(message, error, context),
};