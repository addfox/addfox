import { describe, it, expect } from '@rstest/core';
import {
  ADDFOX_ERROR_CODES,
  AddfoxError,
  exitWithError,
  createError,
  formatError,
  isAddfoxError,
} from '../src/errors/index.js';

describe('ADDFOX_ERROR_CODES', () => {
  it('contains all expected error codes', () => {
    expect(ADDFOX_ERROR_CODES.CONFIG_NOT_FOUND).toBe('ADDFOX_CONFIG_NOT_FOUND');
    expect(ADDFOX_ERROR_CODES.CONFIG_LOAD_FAILED).toBe('ADDFOX_CONFIG_LOAD_FAILED');
    expect(ADDFOX_ERROR_CODES.MANIFEST_MISSING).toBe('ADDFOX_MANIFEST_MISSING');
    expect(ADDFOX_ERROR_CODES.APP_DIR_MISSING).toBe('ADDFOX_APP_DIR_MISSING');
    expect(ADDFOX_ERROR_CODES.NO_ENTRIES).toBe('ADDFOX_NO_ENTRIES');
    expect(ADDFOX_ERROR_CODES.INVALID_BROWSER).toBe('ADDFOX_INVALID_BROWSER');
    expect(ADDFOX_ERROR_CODES.UNKNOWN_COMMAND).toBe('ADDFOX_UNKNOWN_COMMAND');
  });
});

describe('AddfoxError', () => {
  it('creates error with basic message', () => {
    const error = new AddfoxError({
      message: 'Test message',
      code: ADDFOX_ERROR_CODES.CONFIG_NOT_FOUND,
    });
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('ADDFOX_CONFIG_NOT_FOUND');
    expect(error.name).toBe('AddfoxError');
  });

  it('creates error with details and hint', () => {
    const error = new AddfoxError({
      message: 'Test message',
      code: ADDFOX_ERROR_CODES.CONFIG_LOAD_FAILED,
      details: 'Detailed info',
      hint: 'Try this',
    });
    expect(error.details).toBe('Detailed info');
    expect(error.hint).toBe('Try this');
  });

  it('creates error with cause', () => {
    const cause = new Error('Original error');
    const error = new AddfoxError({
      message: 'Test message',
      code: ADDFOX_ERROR_CODES.BUILD_ERROR,
      cause,
    });
    expect(error.cause).toBe(cause);
  });

  it('formats error correctly', () => {
    const error = new AddfoxError({
      message: 'Test message',
      code: 'TEST_CODE',
      details: 'Detailed info',
      hint: 'Try this',
    });
    const formatted = error.format();
    expect(formatted).toContain('[TEST_CODE]');
    expect(formatted).toContain('Test message');
    expect(formatted).toContain('Detailed info');
    expect(formatted).toContain('Try this');
  });

  it('returns correct JSON representation', () => {
    const cause = new Error('Cause');
    const error = new AddfoxError({
      message: 'Test message',
      code: 'JSON_TEST',
      details: 'Details',
      hint: 'Hint',
      cause,
    });
    const json = error.toJSON();
    expect(json.name).toBe('AddfoxError');
    expect(json.code).toBe('JSON_TEST');
    expect(json.message).toBe('Test message');
    expect(json.details).toBe('Details');
    expect(json.hint).toBe('Hint');
    expect(json.cause).toBe(cause);
  });
});

describe('createError', () => {
  it('creates error with code and message', () => {
    const error = createError('CODE_1', 'Message 1');
    expect(error.code).toBe('CODE_1');
    expect(error.message).toBe('Message 1');
  });

  it('creates error with additional options', () => {
    const cause = new Error('Cause');
    const error = createError('CODE_2', 'Message 2', {
      details: 'Details',
      hint: 'Hint',
      cause,
    });
    expect(error.details).toBe('Details');
    expect(error.hint).toBe('Hint');
    expect(error.cause).toBe(cause);
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

describe('exitWithError', () => {
  it('throws never-return type', () => {
    // exitWithError calls process.exit, so we just verify it throws
    expect(() => {
      try {
        exitWithError(new Error('test'), 1);
      } catch (e) {
        // Expected to throw/exit
        throw e;
      }
    }).toThrow();
  });
});
