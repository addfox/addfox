/**
 * @addfox/common
 * Shared utilities and types for Addfox packages
 */

// Logger
export * from './logger/index.js';

// Errors
export * from './errors/index.js';

// Utilities
export * from './utils/index.js';

// Interfaces (explicitly re-export to avoid Logger naming conflict)
export type {
  ILogger,
  Logger,
  Result,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CacheEntry,
  Strategy,
  Builder,
  Resolver,
  Middleware,
  Pipeline,
} from './interfaces/index.js';

// Hooks system
export * from './hooks/index.js';

// Process output origin (web-ext embedded run)
export * from './webExtStdoutOrigin.js';
