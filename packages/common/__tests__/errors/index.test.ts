import { describe, it, expect } from '@rstest/core';
import {
  AddfoxError,
  createError,
  isAddfoxError,
  formatError,
  type ErrorOptions,
} from '../../src/errors/index.js';

describe('AddfoxError', () => {
  it('creates error with basic options', () => {
    const options: ErrorOptions = {
      code: 'TEST_ERROR',
      message: 'Test error message',
    };
    const error = new AddfoxError(options);

    expect(error.name).toBe('AddfoxError');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test error message');
  });

  it('creates error with all options', () => {
    const cause = new Error('Original cause');
    const options: ErrorOptions = {
      code: 'FULL_ERROR',
      message: 'Full error message',
      details: 'Detailed information',
      hint: 'Try this to fix',
      cause,
    };
    const error = new AddfoxError(options);

    expect(error.code).toBe('FULL_ERROR');
    expect(error.message).toBe('Full error message');
    expect(error.details).toBe('Detailed information');
    expect(error.hint).toBe('Try this to fix');
    expect(error.cause).toBe(cause);
  });

  it('returns correct JSON representation', () => {
    const cause = new Error('Cause');
    const error = new AddfoxError({
      code: 'JSON_TEST',
      message: 'JSON test',
      details: 'Details',
      hint: 'Hint',
      cause,
    });

    const json = error.toJSON();
    expect(json.name).toBe('AddfoxError');
    expect(json.code).toBe('JSON_TEST');
    expect(json.message).toBe('JSON test');
    expect(json.details).toBe('Details');
    expect(json.hint).toBe('Hint');
    expect(json.cause).toBe(cause);
    expect(typeof json.stack).toBe('string');
  });

  it('formats error correctly without details and hint', () => {
    const error = new AddfoxError({
      code: 'SIMPLE',
      message: 'Simple error',
    });

    expect(error.format()).toBe('[SIMPLE] Simple error');
    expect(error.toString()).toBe('[SIMPLE] Simple error');
  });

  it('formats error with details and hint', () => {
    const error = new AddfoxError({
      code: 'COMPLEX',
      message: 'Complex error',
      details: 'Some details',
      hint: 'Some hint',
    });

    const formatted = error.format();
    expect(formatted).toContain('[COMPLEX] Complex error');
    expect(formatted).toContain('Details: Some details');
    expect(formatted).toContain('Hint: Some hint');
  });

  it('maintains prototype chain', () => {
    const error = new AddfoxError({
      code: 'PROTO',
      message: 'Proto test',
    });

    expect(error instanceof AddfoxError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('createError', () => {
  it('creates error with code and message', () => {
    const error = createError('CODE_1', 'Message 1');
    expect(error.code).toBe('CODE_1');
    expect(error.message).toBe('Message 1');
  });

  it('creates error with additional options', () => {
    const error = createError('CODE_2', 'Message 2', {
      details: 'Details',
      hint: 'Hint',
    });
    expect(error.details).toBe('Details');
    expect(error.hint).toBe('Hint');
  });
});

describe('isAddfoxError', () => {
  it('returns true for AddfoxError instances', () => {
    const error = new AddfoxError({ code: 'TEST', message: 'Test' });
    expect(isAddfoxError(error)).toBe(true);
  });

  it('returns false for regular Error', () => {
    expect(isAddfoxError(new Error('Regular'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAddfoxError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAddfoxError(undefined)).toBe(false);
  });

  it('returns false for plain object', () => {
    expect(isAddfoxError({ code: 'TEST', message: 'Test' })).toBe(false);
  });

  it('returns false for string', () => {
    expect(isAddfoxError('error')).toBe(false);
  });
});

describe('formatError', () => {
  it('formats AddfoxError using format()', () => {
    const error = new AddfoxError({
      code: 'FMT',
      message: 'Format test',
      details: 'Details',
    });
    const formatted = formatError(error);
    expect(formatted).toContain('[FMT] Format test');
    expect(formatted).toContain('Details');
  });

  it('formats regular Error using stack', () => {
    const error = new Error('Regular error');
    error.stack = 'Error: Regular error\n    at test.js:1:1';
    const formatted = formatError(error);
    expect(formatted).toBe(error.stack);
  });

  it('formats regular Error using message when stack is undefined', () => {
    const error = new Error('No stack');
    (error as Error & { stack?: string }).stack = undefined;
    const formatted = formatError(error);
    expect(formatted).toBe('No stack');
  });

  it('formats non-error values using String()', () => {
    expect(formatError('string error')).toBe('string error');
    expect(formatError(42)).toBe('42');
    expect(formatError(null)).toBe('null');
    expect(formatError(undefined)).toBe('undefined');
    expect(formatError({ key: 'value' })).toBe('[object Object]');
  });
});
