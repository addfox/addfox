/**
 * Shared types and interfaces
 */

/** Logger interface (base interface for logging) */
export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/** @deprecated Use ILogger instead */
export type Logger = ILogger;

/** Result type for operations that can fail */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/** Validation error */
export interface ValidationError {
  code: string;
  message: string;
  path?: string;
}

/** Validation warning */
export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}

/** Cache entry */
export interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

/** Strategy pattern interface */
export interface Strategy<TInput, TOutput> {
  name: string;
  execute(input: TInput): TOutput | Promise<TOutput>;
  canExecute(input: TInput): boolean;
}

/** Builder function type */
export type Builder<TInput, TOutput, TContext = unknown> = (
  input: TInput,
  context: TContext
) => TOutput | Promise<TOutput>;

/** Resolver function type */
export type Resolver<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

/** Middleware function type */
export type Middleware<T> = (value: T, next: () => T | Promise<T>) => T | Promise<T>;

/** Pipeline function type */
export type Pipeline<TInput, TOutput> = (input: TInput) => Promise<TOutput>;
