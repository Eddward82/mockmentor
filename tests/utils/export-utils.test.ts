import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportAsJSON, exportAsPDF } from '../../utils/export-utils';
import { InterviewResult, InterviewMode, ExperienceLevel } from '../../types';

describe('export-utils', () => {
  const mockSession: InterviewResult = {
    id: 'test-id-123',
    date: '2024-01-15T10:30:00.000Z',
    config: {
      jobTitle: 'Software Engineer',
      level: ExperienceLevel.MID,
      mode: InterviewMode.TECHNICAL,
      questionCount: 2
    },
    metrics: {
      communication: 85,
      confidence: 80,
      technicalAccuracy: 90,
      bodyLanguage: 75,
      overall: 82
    },
    suggestions: ['Practice more system design questions', 'Work on explaining your thought process'],
    transcription: 'AI: Tell me about yourself\nUser: I am a software engineer...',
    duration: 420,
    questions: [
      {
        question: {
          question: 'Tell me about yourself',
          tips: ['Be concise', 'Highlight relevant experience'],
          timeLimit: 120
        },
        transcription: 'User: I am a software engineer with 5 years of experience...',
        startTime: 1705315800000,
        endTime: 1705315920000
      },
      {
        question: {
          question: 'What is your greatest achievement?',
          tips: ['Use STAR method', 'Quantify results'],
          timeLimit: 180
        },
        transcription: 'User: My greatest achievement was leading a team...',
        startTime: 1705315920000,
        endTime: 1705316100000
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportAsJSON', () => {
    it('should create and click a download link', () => {
      const mockCreateObjectURL = vi.fn(() => 'blob:test-url');
      const mockRevokeObjectURL = vi.fn();
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();

      URL.createObjectURL = mockCreateObjectURL;
      URL.revokeObjectURL = mockRevokeObjectURL;

      const mockLink = {
        href: '',
        download: '',
        click: mockClick
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

      exportAsJSON(mockSession);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockLink.download).toContain('software-engineer');
      expect(mockLink.download).toContain('.json');
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('should format the filename correctly', () => {
      const mockLink = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
      vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());

      exportAsJSON(mockSession);

      expect(mockLink.download).toBe('interview-software-engineer-2024-01-15.json');
    });
  });

  describe('exportAsPDF', () => {
    it('should open a new window with HTML content', () => {
      const mockWrite = vi.fn();
      const mockClose = vi.fn();
      const mockPrint = vi.fn();

      const mockWindow = {
        document: {
          write: mockWrite,
          close: mockClose
        },
        print: mockPrint,
        onload: null as (() => void) | null
      };

      vi.spyOn(window, 'open').mockReturnValue(mockWindow as any);

      exportAsPDF(mockSession);

      expect(window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockWrite).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();

      // Verify HTML contains key elements
      const htmlContent = mockWrite.mock.calls[0][0];
      expect(htmlContent).toContain('Interview Performance Report');
      expect(htmlContent).toContain('Software Engineer');
      expect(htmlContent).toContain('85%'); // communication score
      expect(htmlContent).toContain('Questions & Responses');
      expect(htmlContent).toContain('Tell me about yourself');
    });

    it('should include suggestions in the PDF', () => {
      const mockWrite = vi.fn();
      const mockWindow = {
        document: { write: mockWrite, close: vi.fn() },
        print: vi.fn(),
        onload: null
      };

      vi.spyOn(window, 'open').mockReturnValue(mockWindow as any);

      exportAsPDF(mockSession);

      const htmlContent = mockWrite.mock.calls[0][0];
      expect(htmlContent).toContain('Practice more system design questions');
      expect(htmlContent).toContain('Work on explaining your thought process');
    });

    it('should handle session without questions', () => {
      const mockWrite = vi.fn();
      const mockWindow = {
        document: { write: mockWrite, close: vi.fn() },
        print: vi.fn(),
        onload: null
      };

      vi.spyOn(window, 'open').mockReturnValue(mockWindow as any);

      const sessionWithoutQuestions: InterviewResult = {
        ...mockSession,
        questions: undefined
      };

      exportAsPDF(sessionWithoutQuestions);

      const htmlContent = mockWrite.mock.calls[0][0];
      expect(htmlContent).toContain('Session Transcript');
      expect(htmlContent).not.toContain('Questions & Responses');
    });

    it('should handle when window.open returns null', () => {
      vi.spyOn(window, 'open').mockReturnValue(null);

      // Should not throw
      expect(() => exportAsPDF(mockSession)).not.toThrow();
    });
  });
});
