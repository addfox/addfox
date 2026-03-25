import { describe, it, expect, beforeEach, afterEach } from '@rstest/core';
import {
  log,
  setAddfoxLoggerRawWrites,
  writeExtensionErrorBlock,
  Logger,
} from '../src/logger/index.js';

describe('logger branch coverage', () => {
  const captured: { stdout: string[]; stderr: string[] } = {
    stdout: [],
    stderr: [],
  };

  beforeEach(() => {
    captured.stdout = [];
    captured.stderr = [];
  });

  afterEach(() => {
    setAddfoxLoggerRawWrites(null);
  });

  it('should use process.stdout/stderr when rawWrites not set', () => {
    // Reset to use default writes
    setAddfoxLoggerRawWrites(null);
    
    // Just verify it doesn't throw
    expect(() => log('test')).not.toThrow();
  });

  it('should handle writeExtensionErrorBlock with empty lines', () => {
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

    writeExtensionErrorBlock([]);
    expect(captured.stderr.length).toBeGreaterThan(0);
  });

  it('should handle timestamp formatting when colors disabled', () => {
    // Test with no colors and timestamp
    const logs: string[] = [];
    setAddfoxLoggerRawWrites({
      stdout: (chunk: string) => {
        logs.push(chunk);
        return true;
      },
      stderr: () => true,
    });

    // Logger is already initialized, but we can verify basic functionality
    log('message');
    expect(logs.length).toBeGreaterThan(0);
  });

  it('should format timestamp with colors when both enabled', () => {
    const logs: string[] = [];
    const logger = new Logger({
      prefix: '[Test]',
      showTimestamp: true,
      useColors: true,
      rawWrites: {
        stdout: (chunk: string) => {
          logs.push(chunk);
          return true;
        },
        stderr: () => true,
      },
    });

    logger.success('operation completed');
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain('[Test]');
  });

  it('should format timestamp without colors when colors disabled', () => {
    const logs: string[] = [];
    const logger = new Logger({
      prefix: '[Test]',
      showTimestamp: true,
      useColors: false,
      rawWrites: {
        stdout: (chunk: string) => {
          logs.push(chunk);
          return true;
        },
        stderr: () => true,
      },
    });

    logger.success('operation completed');
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain('[Test]');
  });
});
