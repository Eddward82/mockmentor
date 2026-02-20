import { describe, it, expect } from 'vitest';
import { encode, decode } from '../../utils/audio-utils';

describe('audio-utils', () => {
  describe('encode', () => {
    it('should encode Uint8Array to base64 string', () => {
      const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = encode(input);
      expect(result).toBe('SGVsbG8=');
    });

    it('should handle empty array', () => {
      const input = new Uint8Array([]);
      const result = encode(input);
      expect(result).toBe('');
    });

    it('should handle binary data', () => {
      const input = new Uint8Array([0, 255, 128, 64]);
      const result = encode(input);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('decode', () => {
    it('should decode base64 string to Uint8Array', () => {
      const input = 'SGVsbG8=';
      const result = decode(input);
      expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]);
    });

    it('should handle empty string', () => {
      const result = decode('');
      expect(result.length).toBe(0);
    });
  });

  describe('encode/decode roundtrip', () => {
    it('should correctly roundtrip data', () => {
      const original = new Uint8Array([1, 2, 3, 255, 0, 128]);
      const encoded = encode(original);
      const decoded = decode(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it('should handle larger data', () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }
      const encoded = encode(original);
      const decoded = decode(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
  });
});
