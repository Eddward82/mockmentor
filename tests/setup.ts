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

// Mock the firestore SDK itself — importing the real package in jsdom pulls
// in the Node/gRPC build, which crashes at import time.
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => undefined }),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  addDoc: vi.fn().mockResolvedValue({ id: 'test-doc-id' }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }),
    fromDate: (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() })
  }
}));

// Mock ResizeObserver (used by recharts ResponsiveContainer, missing in jsdom)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

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
