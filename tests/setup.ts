import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.stubGlobal('process', {
  env: {
    GEMINI_API_KEY: 'test-api-key'
  }
});

// Mock Firebase
vi.mock('../services/firebase', () => ({
  db: {},
  auth: {
    currentUser: null
  }
}));

// Mock MediaDevices API
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    })
  }
});

// Mock AudioContext
class MockAudioContext {
  createBufferSource = vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    buffer: null
  }));
  createMediaStreamSource = vi.fn();
  createScriptProcessor = vi.fn(() => ({
    connect: vi.fn(),
    onaudioprocess: null
  }));
  createBuffer = vi.fn();
  destination = {};
  currentTime = 0;
}

vi.stubGlobal('AudioContext', MockAudioContext);

// Mock window.confirm
vi.stubGlobal(
  'confirm',
  vi.fn(() => true)
);

// Mock URL APIs (extend existing URL)
const OriginalURL = globalThis.URL;
vi.stubGlobal(
  'URL',
  class extends OriginalURL {
    static createObjectURL = vi.fn(() => 'blob:test-url');
    static revokeObjectURL = vi.fn();
  }
);
