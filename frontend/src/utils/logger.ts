/**
 * Server-side error logger.
 * Writes timestamped entries to /logs/error.log (relative to project root).
 * Safe to import in server components, API routes, and server actions.
 * Falls back to console.error in environments where fs is unavailable.
 */

import fs from 'fs';
import path from 'path';

type LogLevel = 'ERROR' | 'WARN' | 'INFO';

function getLogPath(): string {
  // In production (Vercel/Docker), write to /tmp since the filesystem is read-only
  const logsDir =
    process.env.LOG_DIR ||
    (process.env.VERCEL || process.env.NODE_ENV === 'production'
      ? '/tmp/logs'
      : path.join(process.cwd(), 'logs'));
  return path.join(logsDir, 'error.log');
}

function ensureLogDir(logPath: string) {
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const ctx = context ? ` | ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${ctx}\n`;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>) {
  try {
    const logPath = getLogPath();
    ensureLogDir(logPath);
    const entry = formatEntry(level, message, context);
    fs.appendFileSync(logPath, entry, { encoding: 'utf8' });
  } catch {
    // Last-resort fallback — never let logging crash the app
    console.error('[logger] Failed to write to log file:', message, context);
  }
}

export const logger = {
  error(message: string, context?: Record<string, unknown>) {
    console.error(`[ERROR] ${message}`, context ?? '');
    write('ERROR', message, context);
  },
  warn(message: string, context?: Record<string, unknown>) {
    console.warn(`[WARN] ${message}`, context ?? '');
    write('WARN', message, context);
  },
  info(message: string, context?: Record<string, unknown>) {
    console.info(`[INFO] ${message}`, context ?? '');
    write('INFO', message, context);
  },
};
