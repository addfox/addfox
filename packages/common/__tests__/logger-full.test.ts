import { describe, it, expect, beforeEach } from '@rstest/core';
import { Logger, ANSI_COLORS } from '../src/logger/index.js';

describe('Logger full branch coverage', () => {
  let logs: { stdout: string[]; stderr: string[] };

  beforeEach(() => {
    logs = { stdout: [], stderr: [] };
  });

  function createLogger(options: { 
    useColors?: boolean; 
    showTimestamp?: boolean;
    prefix?: string;
  } = {}) {
    return new Logger({
      useColors: options.useColors ?? true,
      showTimestamp: options.showTimestamp ?? false,
      prefix: options.prefix ?? '[Test]',
      rawWrites: {
        stdout: (chunk: string) => {
          logs.stdout.push(chunk);
          return true;
        },
        stderr: (chunk: string) => {
          logs.stderr.push(chunk);
          return true;
        },
      },
    });
  }

  describe('formatPrefix', () => {
    it('should format prefix with colors when useColors is true', () => {
      const logger = createLogger({ useColors: true });
      logger.success('test');
      expect(logs.stdout.length).toBeGreaterThan(0);
    });

    it('should format prefix without colors when useColors is false', () => {
      const logger = createLogger({ useColors: false });
      logger.success('test');
      expect(logs.stdout[0]).toContain('[Test]');
    });
  });

  describe('formatTimestamp', () => {
    it('should return empty string when showTimestamp is false', () => {
      const logger = createLogger({ showTimestamp: false });
      logger.success('test');
      expect(logs.stdout.length).toBeGreaterThan(0);
    });

    it('should format timestamp with colors when useColors is true', () => {
      const logger = createLogger({ showTimestamp: true, useColors: true });
      logger.success('test');
      expect(logs.stdout.length).toBeGreaterThan(0);
    });

    it('should format timestamp without colors when useColors is false', () => {
      const logger = createLogger({ showTimestamp: true, useColors: false });
      logger.success('test');
      expect(logs.stdout.length).toBeGreaterThan(0);
    });
  });

  describe('success', () => {
    it('should format with colors when useColors is true', () => {
      const logger = createLogger({ useColors: true });
      logger.success('completed');
      expect(logs.stdout.length).toBeGreaterThan(0);
    });

    it('should format without colors when useColors is false', () => {
      const logger = createLogger({ useColors: false });
      logger.success('completed');
      expect(logs.stdout[0]).toContain('●');
    });
  });

  describe('successWithValue', () => {
    it('should format with colors when useColors is true', () => {
      const logger = createLogger({ useColors: true });
      logger.successWithValue('Size', '1.5MB');
      expect(logs.stdout.length).toBeGreaterThan(0);
    });

    it('should format without colors when useColors is false', () => {
      const logger = createLogger({ useColors: false });
      logger.successWithValue('Size', '1.5MB');
      expect(logs.stdout[0]).toContain('Size');
      expect(logs.stdout[0]).toContain('1.5MB');
    });
  });

  describe('successWithDuration', () => {
    it('should format with colors when useColors is true', () => {
      const logger = createLogger({ useColors: true });
      logger.successWithDuration('operation', 1500);
      expect(logs.stdout.length).toBeGreaterThan(0);
    });

    it('should format without colors when useColors is false', () => {
      const logger = createLogger({ useColors: false });
      logger.successWithDuration('operation', 1500);
      expect(logs.stdout[0]).toContain('1.50s');
    });
  });

  describe('error', () => {
    it('should format with colors when useColors is true', () => {
      const logger = createLogger({ useColors: true });
      logger.error('something went wrong');
      expect(logs.stderr.length).toBeGreaterThan(0);
    });

    it('should format without colors when useColors is false', () => {
      const logger = createLogger({ useColors: false });
      logger.error('something went wrong');
      expect(logs.stderr.length).toBeGreaterThan(0);
    });

    it('should handle multiline errors with colors', () => {
      const logger = createLogger({ useColors: true });
      logger.error('line1\nline2\nline3');
      expect(logs.stderr.length).toBeGreaterThan(2);
    });

    it('should handle multiline errors without colors', () => {
      const logger = createLogger({ useColors: false });
      logger.error('line1\nline2\nline3');
      expect(logs.stderr.length).toBeGreaterThan(2);
    });

    it('should handle empty error with colors', () => {
      const logger = createLogger({ useColors: true });
      logger.error('');
      expect(logs.stderr.length).toBeGreaterThan(0);
    });

    it('should handle empty error without colors', () => {
      const logger = createLogger({ useColors: false });
      logger.error('');
      expect(logs.stderr.length).toBeGreaterThan(0);
    });
  });

  describe('writeErrorBlock', () => {
    it('should format with colors when useColors is true', () => {
      const logger = createLogger({ useColors: true });
      logger.writeErrorBlock(['Error line 1', 'Error line 2']);
      expect(logs.stderr.length).toBeGreaterThan(0);
    });

    it('should format without colors when useColors is false', () => {
      const logger = createLogger({ useColors: false });
      logger.writeErrorBlock(['Error line 1', 'Error line 2']);
      expect(logs.stderr.length).toBeGreaterThan(0);
    });

    it('should handle single line with colors', () => {
      const logger = createLogger({ useColors: true });
      logger.writeErrorBlock(['Single error']);
      expect(logs.stderr.length).toBeGreaterThan(0);
    });

    it('should handle single line without colors', () => {
      const logger = createLogger({ useColors: false });
      logger.writeErrorBlock(['Single error']);
      expect(logs.stderr.length).toBeGreaterThan(0);
    });
  });

  describe('logEntriesTable', () => {
    it('should return early when entries is empty', () => {
      const logger = createLogger();
      logger.logEntriesTable([]);
      expect(logs.stdout.length).toBe(0);
    });

    it('should format table with colors when useColors is true', () => {
      const logger = createLogger({ useColors: true });
      logger.logEntriesTable([
        { name: 'background', scriptPath: '/app/background.ts' },
      ]);
      expect(logs.stdout.length).toBeGreaterThan(0);
    });

    it('should format table without colors when useColors is false', () => {
      const logger = createLogger({ useColors: false });
      logger.logEntriesTable([
        { name: 'background', scriptPath: '/app/background.ts' },
      ]);
      expect(logs.stdout[0]).toContain('background');
    });

    it('should use relative path when root is provided', () => {
      const logger = createLogger();
      logger.logEntriesTable(
        [{ name: 'background', scriptPath: '/project/app/background.ts' }],
        { root: '/project' }
      );
      expect(logs.stdout[0]).toContain('app/background.ts');
    });

    it('should use absolute path when root is not provided', () => {
      const logger = createLogger();
      logger.logEntriesTable([
        { name: 'background', scriptPath: '/app/background.ts' },
      ]);
      expect(logs.stdout[0]).toContain('/app/background.ts');
    });

    it('should create clickable link with colors', () => {
      const logger = createLogger({ useColors: true });
      logger.logEntriesTable([
        { name: 'test', scriptPath: '/test.ts' },
      ]);
      expect(logs.stdout.length).toBeGreaterThan(0);
    });

    it('should return plain text without colors for link', () => {
      const logger = createLogger({ useColors: false });
      logger.logEntriesTable([
        { name: 'test', scriptPath: '/test.ts' },
      ]);
      expect(logs.stdout.length).toBeGreaterThan(0);
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds when < 1000', () => {
      const logger = createLogger();
      expect(logger.formatDuration(500)).toBe('500ms');
      expect(logger.formatDuration(0)).toBe('0ms');
      expect(logger.formatDuration(999)).toBe('999ms');
    });

    it('should format seconds when >= 1000', () => {
      const logger = createLogger();
      expect(logger.formatDuration(1000)).toBe('1.00s');
      expect(logger.formatDuration(1500)).toBe('1.50s');
      expect(logger.formatDuration(3500)).toBe('3.50s');
    });
  });

  describe('info and log', () => {
    it('should log info with prefix', () => {
      const logger = createLogger({ useColors: false });
      logger.info('test message');
      expect(logs.stdout[0]).toContain('[Test]');
      expect(logs.stdout[0]).toContain('test message');
    });

    it('should log is alias for info', () => {
      const logger = createLogger({ useColors: false });
      logger.log('test message');
      expect(logs.stdout[0]).toContain('[Test]');
      expect(logs.stdout[0]).toContain('test message');
    });
  });

  describe('warn', () => {
    it('should warn to stderr with prefix', () => {
      const logger = createLogger({ useColors: false });
      logger.warn('warning message');
      expect(logs.stderr[0]).toContain('[Test]');
      expect(logs.stderr[0]).toContain('warning message');
    });
  });
});
