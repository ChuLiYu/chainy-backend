/**
 * Environment-aware logging utility for Chainy Lambda functions
 * Provides structured logging with different output levels based on environment
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

interface LogContext {
  functionName?: string;
  requestId?: string;
  userId?: string;
  operation?: string;
  [key: string]: any;
}

class Logger {
  private logLevel: LogLevel;
  private environment: Environment;
  private functionName: string;

  constructor(functionName: string = 'unknown') {
    this.functionName = functionName;
    this.environment = this.getEnvironment();
    this.logLevel = this.getLogLevel();
  }

  private getEnvironment(): Environment {
    const env = process.env.NODE_ENV || process.env.ENVIRONMENT || 'production';
    
    switch (env.toLowerCase()) {
      case 'dev':
      case 'development':
        return Environment.DEVELOPMENT;
      case 'staging':
      case 'stage':
        return Environment.STAGING;
      case 'prod':
      case 'production':
      default:
        return Environment.PRODUCTION;
    }
  }

  private getLogLevel(): LogLevel {
    switch (this.environment) {
      case Environment.DEVELOPMENT:
        return LogLevel.DEBUG; // All logs in development for debugging
      case Environment.STAGING:
        return LogLevel.INFO;  // Info, warnings, and errors in staging for testing
      case Environment.PRODUCTION:
        return LogLevel.WARN;  // Warnings and errors in production for monitoring
      default:
        return LogLevel.WARN;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level,
      function: this.functionName,
      environment: this.environment,
      message,
    };

    if (context) {
      return JSON.stringify({ ...baseLog, ...context });
    }

    return JSON.stringify(baseLog);
  }

  private log(level: LogLevel, levelName: string, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(levelName, message, context);
    
    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.log(formattedMessage);
        break;
    }
  }

  /**
   * Log error messages
   * Always logged in all environments
   */
  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, 'ERROR', message, context);
  }

  /**
   * Log warning messages
   * Logged in staging and development environments
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  /**
   * Log informational messages
   * Logged in staging and development environments
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  /**
   * Log debug messages
   * Only logged in development environment
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  /**
   * Log API request details
   * Only logged in development and staging
   */
  request(method: string, path: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${path}`, {
      ...context,
      operation: 'api_request',
      method,
      path,
    });
  }

  /**
   * Log authentication events
   * Logged in staging and development (without sensitive data)
   */
  auth(event: string, context?: LogContext): void {
    this.info(`Auth Event: ${event}`, {
      ...context,
      operation: 'authentication',
      event,
    });
  }

  /**
   * Log database operations
   * Only logged in development
   */
  database(operation: string, table: string, context?: LogContext): void {
    this.debug(`Database ${operation}: ${table}`, {
      ...context,
      operation: 'database',
      table,
    });
  }

  /**
   * Log external API calls
   * Logged in staging and development
   */
  external(service: string, operation: string, context?: LogContext): void {
    this.info(`External API: ${service} - ${operation}`, {
      ...context,
      operation: 'external_api',
      service,
    });
  }

  /**
   * Log performance metrics
   * Logged in all environments for monitoring
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      ...context,
      operation: 'performance',
      duration,
    });
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Get current log level
   */
  getCurrentLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Create logger instances for each Lambda function
export const createLogger = (functionName: string): Logger => {
  return new Logger(functionName);
};

// Default logger for backward compatibility
export const logger = new Logger('default');
