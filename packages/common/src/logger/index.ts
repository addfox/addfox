/**
 * @addfox/common/logger
 * Unified logging system with configurable output format
 */

import { format } from "node:util";
import path from "node:path";
import { pathToFileURL } from "node:url";
import Table from "cli-table3";

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Log level enumeration */
export type LogLevel = "info" | "success" | "warn" | "error" | "debug";

/** Output stream type */
export type LogStream = "stdout" | "stderr";

/** Log entry structure */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

/** Logger configuration options */
export interface LoggerOptions {
  /** Output prefix (default: "[Addfox]") */
  prefix?: string;
  /** Whether to include timestamp */
  showTimestamp?: boolean;
  /** Whether to enable colors */
  useColors?: boolean;
  /** Custom stream writes for testing */
  rawWrites?: { stdout: WriteFn; stderr: WriteFn } | null;
}

/** Write function type */
export type WriteFn = NodeJS.WriteStream["write"];

/** Base shape for entry rows: name + script path (shared by EntryTableRow, EntryInfo) */
export interface EntryRowBase {
  name: string;
  scriptPath: string;
}

/** Table row for entries display */
export type EntryTableRow = EntryRowBase;

/** Options for logEntriesTable */
export interface LogEntriesTableOptions {
  root?: string;
}

// ============================================================================
// ANSI Colors & Styles
// ============================================================================

/** ANSI color codes for terminal output styling */
export const ANSI_COLORS = {
  /** Orange (256 color 208) for prefix */
  ORANGE: "\x1b[38;5;208m",
  /** Bold + green for Done messages */
  DONE: "\x1b[1m\x1b[32m",
  /** Dim gray for time suffix */
  TIME: "\x1b[38;5;245m",
  /** Cyan for size/value highlight */
  VALUE: "\x1b[38;5;75m",
  /** Purple for table headers */
  PURPLE: "\x1b[38;5;141m",
  /** Red background + yellow text for error badge */
  ERROR_BADGE: "\x1b[41m\x1b[93m",
  /** Red foreground for error content */
  RED: "\x1b[31m",
  /** Reset all styles */
  RESET: "\x1b[0m",
} as const;

// ============================================================================
// Logger Class
// ============================================================================

/**
 * Unified Logger class for Addfox
 * 
 * Provides consistent output format with:
 * - Colored prefix ([Addfox])
 * - Multiple log levels
 * - Table formatting for entries
 * - Configurable output streams
 */
export class Logger {
  private prefix: string;
  private showTimestamp: boolean;
  private useColors: boolean;
  private rawWrites: { stdout: WriteFn; stderr: WriteFn } | null = null;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ?? "[Addfox]";
    this.showTimestamp = options.showTimestamp ?? false;
    this.useColors = options.useColors ?? true;
    this.rawWrites = options.rawWrites ?? null;
  }

  /**
   * Set raw stdout/stderr write functions for testing
   */
  setRawWrites(writes: { stdout: WriteFn; stderr: WriteFn } | null): void {
    this.rawWrites = writes;
  }

  /**
   * Get current write functions
   */
  private getWrites(): { stdout: WriteFn; stderr: WriteFn } {
    if (this.rawWrites) return this.rawWrites;
    return {
      stdout: process.stdout.write.bind(process.stdout),
      stderr: process.stderr.write.bind(process.stderr),
    };
  }

  /**
   * Format the prefix with ANSI colors
   */
  private formatPrefix(): string {
    if (!this.useColors) return `${this.prefix} `;
    return `${ANSI_COLORS.ORANGE}${this.prefix}${ANSI_COLORS.RESET} `;
  }

  /**
   * Format timestamp if enabled
   */
  private formatTimestamp(): string {
    if (!this.showTimestamp) return "";
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    return this.useColors 
      ? `${ANSI_COLORS.TIME}${timeStr}${ANSI_COLORS.RESET} `
      : `${timeStr} `;
  }

  /**
   * Write lines to stream with prefix
   */
  private writeLines(stream: LogStream, text: string): void {
    const w = this.getWrites()[stream];
    const prefix = this.formatPrefix() + this.formatTimestamp();
    for (const line of text.split("\n")) {
      w(prefix + line + "\n", "utf8");
    }
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Log general information
   */
  info(...args: unknown[]): void {
    this.writeLines("stdout", format(...args));
  }

  /**
   * Alias for info - general log
   */
  log(...args: unknown[]): void {
    this.info(...args);
  }

  /**
   * Log success message with Done prefix
   */
  success(...args: unknown[]): void {
    const text = format(...args);
    const w = this.getWrites().stdout;
    const prefix = this.formatPrefix() + this.formatTimestamp();
    const donePrefix = this.useColors
      ? `${ANSI_COLORS.DONE}●${ANSI_COLORS.RESET} `
      : "● ";
    for (const line of text.split("\n")) {
      w(prefix + donePrefix + line + "\n", "utf8");
    }
  }

  /**
   * Log success with a highlighted value (e.g., file size)
   */
  successWithValue(label: string, value: string): void {
    const w = this.getWrites().stdout;
    const prefix = this.formatPrefix() + this.formatTimestamp();
    const donePrefix = this.useColors
      ? `${ANSI_COLORS.DONE}●${ANSI_COLORS.RESET} `
      : "● ";
    const valueColored = this.useColors
      ? `${ANSI_COLORS.VALUE}${value}${ANSI_COLORS.RESET}`
      : value;
    const line = donePrefix + label + " " + valueColored;
    w(prefix + line + "\n", "utf8");
  }

  /**
   * Log success with duration
   */
  successWithDuration(message: string, ms: number): void {
    const timeStr = this.formatDuration(ms);
    const w = this.getWrites().stdout;
    const prefix = this.formatPrefix() + this.formatTimestamp();
    const donePrefix = this.useColors
      ? `${ANSI_COLORS.DONE}●${ANSI_COLORS.RESET} `
      : "● ";
    const timeColored = this.useColors
      ? `${ANSI_COLORS.TIME}${timeStr}${ANSI_COLORS.RESET}`
      : timeStr;
    const line = donePrefix + message + " " + timeColored;
    w(prefix + line + "\n", "utf8");
  }

  /**
   * Log warning to stderr
   */
  warn(...args: unknown[]): void {
    this.writeLines("stderr", format(...args));
  }

  /**
   * Log error (with error badge, no prefix)
   */
  error(...args: unknown[]): void {
    const text = format(...args);
    const w = this.getWrites().stderr;
    const lines = text.split("\n");
    const errorBadge = this.useColors
      ? `${ANSI_COLORS.ERROR_BADGE} error ${ANSI_COLORS.RESET} `
      : " error  ";
    const redPrefix = this.useColors ? ANSI_COLORS.RED : "";
    const resetSuffix = this.useColors ? ANSI_COLORS.RESET : "";

    w("\n", "utf8");
    if (lines.length > 0) {
      w(errorBadge + redPrefix + lines[0] + resetSuffix + "\n", "utf8");
      for (let i = 1; i < lines.length; i++) {
        w(redPrefix + lines[i] + resetSuffix + "\n", "utf8");
      }
    }
    w("\n", "utf8");
  }

  /**
   * Write extension error block (for detailed error display)
   */
  writeErrorBlock(lines: string[]): void {
    const w = this.getWrites().stderr;
    const errorBadge = this.useColors
      ? `${ANSI_COLORS.ERROR_BADGE} error ${ANSI_COLORS.RESET} `
      : " error  ";
    const redPrefix = this.useColors ? ANSI_COLORS.RED : "";
    const resetSuffix = this.useColors ? ANSI_COLORS.RESET : "";

    w("\n", "utf8");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0) {
        w(errorBadge + redPrefix + line + resetSuffix + "\n", "utf8");
      } else {
        w(redPrefix + line + resetSuffix + "\n", "utf8");
      }
    }
    w("\n", "utf8");
  }

  /**
   * Format duration: >= 1000ms as "X.XXs", else "Xms"
   */
  formatDuration(ms: number): string {
    if (ms >= 1000) return (ms / 1000).toFixed(2) + "s";
    return ms + "ms";
  }

  /**
   * Log entries table
   */
  logEntriesTable(
    entries: EntryTableRow[],
    options?: LogEntriesTableOptions
  ): void {
    if (entries.length === 0) return;
    
    const root = options?.root;
    const headColor = this.useColors ? ANSI_COLORS.PURPLE : "";
    const resetColor = this.useColors ? ANSI_COLORS.RESET : "";

    const table = new Table({
      head: [headColor + "Entry" + resetColor, headColor + "File" + resetColor],
      style: { head: [], border: [] },
      chars: {
        top: "╌",
        "top-mid": "┬",
        "top-left": "┌",
        "top-right": "┐",
        bottom: "╌",
        "bottom-mid": "┴",
        "bottom-left": "└",
        "bottom-right": "┘",
        left: "│",
        "left-mid": "├",
        mid: "╌",
        "mid-mid": "┼",
        right: "│",
        "right-mid": "┤",
        middle: "│",
      },
    });

    for (const e of entries) {
      const fileDisplay =
        root !== undefined
          ? this.fileLink(
              e.scriptPath,
              path.relative(root, e.scriptPath).replace(/\\/g, "/")
            )
          : e.scriptPath;
      table.push([e.name, fileDisplay]);
    }

    const w = this.getWrites().stdout;
    w(table.toString() + "\n", "utf8");
  }

  /**
   * Create OSC 8 hyperlink
   */
  private fileLink(absolutePath: string, displayText: string): string {
    const url = pathToFileURL(absolutePath).href;
    if (!this.useColors) return displayText;
    return "\x1b]8;;" + url + "\x07" + displayText + "\x1b]8;;\x07";
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/** Default logger instance */
export const logger = new Logger();

// ============================================================================
// Convenience Exports (for backward compatibility)
// ============================================================================

/** Log to stdout with [Addfox] prefix */
export function log(...args: unknown[]): void {
  logger.log(...args);
}

/** Log a completion step: [Addfox] + green "Done " + message */
export function logDone(...args: unknown[]): void {
  logger.success(...args);
}

/** Log a completion step with duration */
export function logDoneTimed(message: string, ms: number): void {
  logger.successWithDuration(message, ms);
}

/** Log a completion step with a highlighted value */
export function logDoneWithValue(label: string, value: string): void {
  logger.successWithValue(label, value);
}

/** Format duration helper */
export function formatDuration(ms: number): string {
  return logger.formatDuration(ms);
}

/** Warn to stderr with [Addfox] prefix */
export function warn(...args: unknown[]): void {
  logger.warn(...args);
}

/** Error to stderr (with error badge, no prefix) */
export function error(...args: unknown[]): void {
  logger.error(...args);
}

/** Write error block for extension errors */
export function writeExtensionErrorBlock(lines: string[]): void {
  logger.writeErrorBlock(lines);
}

/** Log entries table */
export function logEntriesTable(
  entries: EntryTableRow[],
  options?: LogEntriesTableOptions
): void {
  logger.logEntriesTable(entries, options);
}

/** Set raw writes for testing (e.g. capture stdout/stderr in unit tests). */
export function setAddfoxLoggerRawWrites(
  writes: { stdout: WriteFn; stderr: WriteFn } | null
): void {
  logger.setRawWrites(writes);
}

// Re-export types
export type { Table } from "cli-table3";
