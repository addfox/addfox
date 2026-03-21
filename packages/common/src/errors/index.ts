/**
 * @addfox/common/errors
 * Unified error system with error codes and formatting
 */

// ============================================================================
// Error Codes
// ============================================================================

export const ADDFOX_ERROR_CODES = {
  CONFIG_NOT_FOUND: "ADDFOX_CONFIG_NOT_FOUND",
  CONFIG_LOAD_FAILED: "ADDFOX_CONFIG_LOAD_FAILED",
  MANIFEST_MISSING: "ADDFOX_MANIFEST_MISSING",
  APP_DIR_MISSING: "ADDFOX_APP_DIR_MISSING",
  NO_ENTRIES: "ADDFOX_NO_ENTRIES",
  ENTRY_SCRIPT_FROM_HTML: "ADDFOX_ENTRY_SCRIPT_FROM_HTML",
  INVALID_BROWSER: "ADDFOX_INVALID_BROWSER",
  UNKNOWN_COMMAND: "ADDFOX_UNKNOWN_COMMAND",
  RSTEST_CONFIG_NOT_FOUND: "ADDFOX_RSTEST_CONFIG_NOT_FOUND",
  RSDOCTOR_NOT_INSTALLED: "ADDFOX_RSDOCTOR_NOT_INSTALLED",
  RSBUILD_CONFIG_ERROR: "ADDFOX_RSBUILD_CONFIG_ERROR",
  BUILD_ERROR: "ADDFOX_BUILD_ERROR",
  ZIP_OUTPUT: "ADDFOX_ZIP_OUTPUT",
  ZIP_ARCHIVE: "ADDFOX_ZIP_ARCHIVE",
} as const;

export type AddfoxErrorCode = (typeof ADDFOX_ERROR_CODES)[keyof typeof ADDFOX_ERROR_CODES];

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ErrorOptions {
  code: string;
  message: string;
  details?: string;
  hint?: string;
  cause?: unknown;
}

export interface ErrorJSON {
  name: string;
  code: string;
  message: string;
  details?: string;
  hint?: string;
  stack?: string;
  cause?: unknown;
}

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Addfox base error class
 *
 * Provides:
 * - Error code for programmatic handling
 * - Details and hint for user guidance
 * - JSON serialization
 * - Formatted string output
 */
export class AddfoxError extends Error {
  readonly code: string;
  readonly details?: string;
  readonly hint?: string;
  readonly cause?: unknown;

  constructor(options: ErrorOptions) {
    super(options.message);
    this.name = "AddfoxError";
    this.code = options.code;
    this.details = options.details;
    this.hint = options.hint;
    this.cause = options.cause;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serialize error to JSON
   */
  toJSON(): ErrorJSON {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      hint: this.hint,
      stack: this.stack,
      cause: this.cause,
    };
  }

  /**
   * Format error for display
   */
  format(): string {
    const parts: string[] = [`[${this.code}] ${this.message}`];
    if (this.details) parts.push(`  Details: ${this.details}`);
    if (this.hint) parts.push(`  Hint: ${this.hint}`);
    return parts.join("\n");
  }

  /**
   * String representation
   */
  toString(): string {
    return this.format();
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create a generic AddfoxError
 */
export function createError(
  code: string,
  message: string,
  options?: Omit<ErrorOptions, "code" | "message">
): AddfoxError {
  return new AddfoxError({ code, message, ...options });
}

/**
 * Check if value is an AddfoxError
 */
export function isAddfoxError(error: unknown): error is AddfoxError {
  return error instanceof AddfoxError;
}

/**
 * Format any error for display
 */
export function formatError(error: unknown): string {
  if (isAddfoxError(error)) {
    return error.format();
  }
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

/**
 * Print error to stderr and exit process.
 * Used in CLI top-level catch for clear error reporting.
 *
 * Note: This function should be called from CLI only, as it exits the process.
 * The error display is handled by the caller (CLI) using logger.error().
 */
export function exitWithError(_err: unknown, exitCode = 1): never {
  // Format error for display and exit
  // The actual output should be done by the caller using logger.error()
  process.exit(exitCode);
}
