import { describe, it, expect, beforeEach, afterEach } from '@rstest/core';
import {
  log,
  logDone,
  logDoneTimed,
  logDoneWithValue,
  warn,
  error,
  formatDuration,
  logEntriesTable,
  setAddfoxLoggerRawWrites,
  writeExtensionErrorBlock,
  type EntryTableRow,
} from '../src/logger/index.js';

describe('formatDuration', () => {
  it('formats milliseconds for values < 1000', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('formats seconds for values >= 1000', () => {
    expect(formatDuration(1000)).toBe('1.00s');
    expect(formatDuration(1500)).toBe('1.50s');
    expect(formatDuration(2000)).toBe('2.00s');
    expect(formatDuration(3500)).toBe('3.50s');
  });
});

describe('logger functions with mocked writes', () => {
  const captured: { stdout: string[]; stderr: string[] } = {
    stdout: [],
    stderr: [],
  };

  beforeEach(() => {
    captured.stdout = [];
    captured.stderr = [];
    setAddfoxLoggerRawWrites({
      stdout: (chunk: string) => {
        captured.stdout.push(chunk);
        return true;
      },
      stderr: (chunk: string) => {
        captured.stderr.push(chunk);
        return true;
      },
    });
  });

  afterEach(() => {
    setAddfoxLoggerRawWrites(null);
  });

  describe('log', () => {
    it('writes to stdout with prefix', () => {
      log('test message');
      expect(captured.stdout.length).toBeGreaterThan(0);
      expect(captured.stdout[0]).toContain('test message');
    });

    it('handles multiple arguments', () => {
      log('message', 123, { key: 'value' });
      expect(captured.stdout.length).toBeGreaterThan(0);
    });

    it('handles multiline strings', () => {
      log('line1\nline2\nline3');
      expect(captured.stdout.length).toBe(3);
    });
  });

  describe('logDone', () => {
    it('writes done message with prefix', () => {
      logDone('completed');
      expect(captured.stdout.length).toBeGreaterThan(0);
      expect(captured.stdout[0]).toContain('completed');
    });

    it('handles multiline done messages', () => {
      logDone('line1\nline2');
      expect(captured.stdout.length).toBe(2);
    });
  });

  describe('logDoneTimed', () => {
    it('writes timed message with duration', () => {
      logDoneTimed('operation', 500);
      expect(captured.stdout.length).toBeGreaterThan(0);
      expect(captured.stdout[0]).toContain('operation');
      expect(captured.stdout[0]).toContain('500ms');
    });

    it('writes seconds for longer durations', () => {
      logDoneTimed('operation', 1500);
      expect(captured.stdout.length).toBeGreaterThan(0);
      expect(captured.stdout[0]).toContain('1.50s');
    });
  });

  describe('logDoneWithValue', () => {
    it('writes message with highlighted value', () => {
      logDoneWithValue('size', '1.5MB');
      expect(captured.stdout.length).toBeGreaterThan(0);
      expect(captured.stdout[0]).toContain('size');
      expect(captured.stdout[0]).toContain('1.5MB');
    });
  });

  describe('warn', () => {
    it('writes to stderr with prefix', () => {
      warn('warning message');
      expect(captured.stderr.length).toBeGreaterThan(0);
      expect(captured.stderr[0]).toContain('warning message');
    });

    it('handles multiline warnings', () => {
      warn('warn1\nwarn2');
      expect(captured.stderr.length).toBe(2);
    });
  });

  describe('error', () => {
    it('writes error to stderr with badge', () => {
      error('error message');
      expect(captured.stderr.length).toBeGreaterThan(0);
      expect(captured.stderr[0]).toContain('\n');
    });

    it('handles multiline errors', () => {
      error('error1\nerror2\nerror3');
      expect(captured.stderr.length).toBe(5); // 1 leading newline + 3 lines + 1 trailing newline
    });

    it('handles empty error', () => {
      error('');
      expect(captured.stderr.length).toBeGreaterThan(0);
    });
  });

  describe('writeExtensionErrorBlock', () => {
    it('writes error block with multiple lines', () => {
      writeExtensionErrorBlock(['Error line 1', 'Error line 2']);
      expect(captured.stderr.length).toBe(4); // leading newline + 2 lines + trailing newline
    });

    it('handles single line', () => {
      writeExtensionErrorBlock(['Single error']);
      expect(captured.stderr.length).toBe(3);
    });

    it('handles empty lines array', () => {
      writeExtensionErrorBlock([]);
      expect(captured.stderr.length).toBe(2); // just newlines
    });
  });

  describe('logEntriesTable', () => {
    it('logs entries table without root', () => {
      const entries: EntryTableRow[] = [
        { name: 'popup', scriptPath: '/path/to/popup.ts' },
        { name: 'background', scriptPath: '/path/to/background.ts' },
      ];
      logEntriesTable(entries);
      expect(captured.stdout.length).toBeGreaterThan(0);
      expect(captured.stdout[0]).toContain('popup');
      expect(captured.stdout[0]).toContain('background');
    });

    it('logs entries table with root for relative paths', () => {
      const entries: EntryTableRow[] = [
        { name: 'popup', scriptPath: 'C:/project/app/popup/index.ts' },
      ];
      logEntriesTable(entries, { root: 'C:/project' });
      expect(captured.stdout.length).toBeGreaterThan(0);
      expect(captured.stdout[0]).toContain('app/popup/index.ts');
    });

    it('handles empty entries array', () => {
      const entries: EntryTableRow[] = [];
      logEntriesTable(entries);
      expect(captured.stdout.length).toBe(0);
    });
  });
});

describe('setAddfoxLoggerRawWrites', () => {
  it('accepts null to reset writes', () => {
    expect(() => setAddfoxLoggerRawWrites(null)).not.toThrow();
  });

  it('accepts custom write functions', () => {
    const mockWrites = {
      stdout: () => true,
      stderr: () => true,
    };
    expect(() => setAddfoxLoggerRawWrites(mockWrites)).not.toThrow();
    setAddfoxLoggerRawWrites(null);
  });
});
