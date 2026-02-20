import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../utils/retry';

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');
    const result = await withRetry(fn, { baseDelay: 10, maxDelay: 50 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry up to maxRetries times', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 10, maxDelay: 50 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should throw last error after all retries exhausted', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('error 1'))
      .mockRejectedValueOnce(new Error('error 2'))
      .mockRejectedValueOnce(new Error('error 3'));
    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 10, maxDelay: 50 })).rejects.toThrow('error 3');
  });

  it('should use exponential backoff', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok');
    const start = Date.now();
    await withRetry(fn, { baseDelay: 100, maxDelay: 5000, maxRetries: 1 });
    const elapsed = Date.now() - start;
    // Should wait at least baseDelay (100ms) before retry
    expect(elapsed).toBeGreaterThanOrEqual(90); // small tolerance
  });

  it('should respect maxDelay cap', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const start = Date.now();
    await withRetry(fn, { baseDelay: 50, maxDelay: 100, maxRetries: 2 });
    const elapsed = Date.now() - start;
    // With maxDelay=100, total should be under 300ms even with jitter
    expect(elapsed).toBeLessThan(500);
  });
});
