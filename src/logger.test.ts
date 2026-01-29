import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger, LogEntry } from './logger';

describe('Logger', () => {
	let logger: Logger;

	beforeEach(() => {
		logger = new Logger();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	describe('log method', () => {
		it('should add log entries with default INFO level', () => {
			logger.log('Test message');

			const logs = logger.getLogs();
			expect(logs).toHaveLength(1);
			expect(logs[0].message).toBe('Test message');
			expect(logs[0].level).toBe('INFO');
		});

		it('should add log entries with WARN level', () => {
			logger.log('Warning message', 'WARN');

			const logs = logger.getLogs();
			expect(logs[0].level).toBe('WARN');
			expect(logs[0].message).toBe('Warning message');
		});

		it('should add log entries with ERROR level', () => {
			logger.log('Error message', 'ERROR');

			const logs = logger.getLogs();
			expect(logs[0].level).toBe('ERROR');
			expect(logs[0].message).toBe('Error message');
		});

		it('should include timestamp in log entry', () => {
			logger.log('Message');

			const logs = logger.getLogs();
			expect(logs[0].timestamp).toBeDefined();
			expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
		});

		it('should include optional data in log entry', () => {
			const data = { userId: 123, action: 'login' };
			logger.log('User action', 'INFO', data);

			const logs = logger.getLogs();
			expect(logs[0].data).toEqual(data);
		});

		it('should add entries in LIFO order (newest first)', () => {
			logger.log('First');
			logger.log('Second');
			logger.log('Third');

			const logs = logger.getLogs();
			expect(logs[0].message).toBe('Third');
			expect(logs[1].message).toBe('Second');
			expect(logs[2].message).toBe('First');
		});

		it('should call console.log for INFO level', () => {
			const consoleSpy = vi.spyOn(console, 'log');
			logger.log('Info message', 'INFO');

			expect(consoleSpy).toHaveBeenCalledWith('[SmartWrite INFO] Info message', undefined);
		});

		it('should call console.warn for WARN level', () => {
			const consoleSpy = vi.spyOn(console, 'warn');
			logger.log('Warning', 'WARN');

			expect(consoleSpy).toHaveBeenCalledWith('[SmartWrite WARN] Warning', undefined);
		});

		it('should call console.error for ERROR level', () => {
			const consoleSpy = vi.spyOn(console, 'error');
			logger.log('Error occurred', 'ERROR');

			expect(consoleSpy).toHaveBeenCalledWith('[SmartWrite ERROR] Error occurred', undefined);
		});

		it('should pass data to console methods', () => {
			const data = { error: 'Something went wrong' };
			const consoleSpy = vi.spyOn(console, 'error');
			logger.log('Error', 'ERROR', data);

			expect(consoleSpy).toHaveBeenCalledWith('[SmartWrite ERROR] Error', data);
		});
	});

	describe('getLogs method', () => {
		it('should return empty array when no logs', () => {
			const logs = logger.getLogs();
			expect(logs).toEqual([]);
		});

		it('should return all logged entries', () => {
			logger.log('Message 1');
			logger.log('Message 2');
			logger.log('Message 3');

			const logs = logger.getLogs();
			expect(logs).toHaveLength(3);
		});

		it('should return logs with all properties', () => {
			const data = { key: 'value' };
			logger.log('Test', 'WARN', data);

			const logs = logger.getLogs();
			const entry = logs[0];

			expect(entry).toHaveProperty('timestamp');
			expect(entry).toHaveProperty('level');
			expect(entry).toHaveProperty('message');
			expect(entry).toHaveProperty('data');
			expect(entry.message).toBe('Test');
			expect(entry.level).toBe('WARN');
			expect(entry.data).toEqual(data);
		});
	});

	describe('getFormattedLogs method', () => {
		it('should return empty string when no logs', () => {
			const formatted = logger.getFormattedLogs();
			expect(formatted).toBe('');
		});

		it('should format logs as string with timestamps', () => {
			logger.log('Test message', 'INFO');

			const formatted = logger.getFormattedLogs();
			expect(formatted).toContain('INFO');
			expect(formatted).toContain('Test message');
		});

		it('should include data in formatted output when present', () => {
			logger.log('Message', 'INFO', { key: 'value' });

			const formatted = logger.getFormattedLogs();
			expect(formatted).toContain('key');
			expect(formatted).toContain('value');
		});

		it('should format multiple logs with newlines', () => {
			logger.log('First');
			logger.log('Second');

			const formatted = logger.getFormattedLogs();
			const lines = formatted.split('\n');

			expect(lines.length).toBeGreaterThanOrEqual(2);
			expect(lines[0]).toContain('Second'); // Newest first
			expect(lines[1]).toContain('First');
		});

		it('should include timestamp in formatted logs', () => {
			logger.log('Message');

			const formatted = logger.getFormattedLogs();
			expect(formatted).toMatch(/\[\d{4}-\d{2}-\d{2}T/); // ISO format timestamp
		});
	});

	describe('clear method', () => {
		it('should remove all logs', () => {
			logger.log('Message 1');
			logger.log('Message 2');
			expect(logger.getLogs()).toHaveLength(2);

			logger.clear();

			expect(logger.getLogs()).toHaveLength(0);
		});

		it('should allow logging again after clear', () => {
			logger.log('First');
			logger.clear();
			logger.log('Second');

			const logs = logger.getLogs();
			expect(logs).toHaveLength(1);
			expect(logs[0].message).toBe('Second');
		});
	});

	describe('max logs limit', () => {
		it('should limit logs to max 50 entries', () => {
			// Add more than 50 logs
			for (let i = 0; i < 60; i++) {
				logger.log(`Message ${i}`);
			}

			const logs = logger.getLogs();
			expect(logs.length).toBeLessThanOrEqual(50);
		});

		it('should remove oldest logs when exceeding max', () => {
			// Add logs and verify newest are kept
			for (let i = 0; i < 55; i++) {
				logger.log(`Message ${i}`);
			}

			const logs = logger.getLogs();
			expect(logs).toHaveLength(50);

			// Oldest messages should be removed
			expect(logs[logs.length - 1].message).toBe('Message 5');
			// Newest should still be there
			expect(logs[0].message).toBe('Message 54');
		});
	});

	describe('LogEntry interface', () => {
		it('should create valid LogEntry objects', () => {
			const entry: LogEntry = {
				timestamp: new Date().toISOString(),
				level: 'INFO',
				message: 'Test',
				data: { key: 'value' }
			};

			expect(entry.level).toBe('INFO');
			expect(entry.message).toBe('Test');
			expect(entry.data).toEqual({ key: 'value' });
		});

		it('should allow LogEntry without data field', () => {
			const entry: LogEntry = {
				timestamp: new Date().toISOString(),
				level: 'WARN',
				message: 'Warning without data'
			};

			expect(entry.data).toBeUndefined();
		});
	});

	describe('Integration scenarios', () => {
		it('should handle mixed log levels', () => {
			logger.log('Starting process', 'INFO');
			logger.log('Processing item 1', 'INFO');
			logger.log('Item 1 delayed', 'WARN');
			logger.log('Item 2 failed', 'ERROR');
			logger.log('Process completed', 'INFO');

			const logs = logger.getLogs();
			expect(logs).toHaveLength(5);
			expect(logs.filter(l => l.level === 'INFO')).toHaveLength(3);
			expect(logs.filter(l => l.level === 'WARN')).toHaveLength(1);
			expect(logs.filter(l => l.level === 'ERROR')).toHaveLength(1);
		});

		it('should maintain log history across operations', () => {
			logger.log('Operation 1 started');
			logger.log('Operation 1 completed');

			const logs1 = logger.getLogs();
			expect(logs1).toHaveLength(2);

			logger.log('Operation 2 started');
			const logs2 = logger.getLogs();
			expect(logs2).toHaveLength(3);
		});
	});
});
