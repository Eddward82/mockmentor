import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
      answerStructure: 75,
      clarity: 75,
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
    // restoreAllMocks (not clearAllMocks) so document.createElement spies
    // from one test don't leak fake elements into the next.
    vi.restoreAllMocks();
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
    // exportAsPDF renders the report into a hidden iframe, then (async, via
    // setTimeout) captures it with html2canvas + jspdf. The tests stub the
    // iframe and use fake timers so the async capture step never runs.
    const createIframeMock = () => {
      const write = vi.fn();
      const iframe = {
        style: {} as Record<string, string>,
        contentDocument: {
          open: vi.fn(),
          write,
          close: vi.fn(),
          body: {}
        },
        contentWindow: null
      };
      return { iframe, write };
    };

    const stubDom = (iframe: unknown) => {
      vi.spyOn(document, 'createElement').mockReturnValue(iframe as any);
      const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn() as any);
      const removeChild = vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn() as any);
      return { appendChild, removeChild };
    };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should render the report HTML into a hidden iframe', () => {
      const { iframe, write } = createIframeMock();
      const { appendChild } = stubDom(iframe);

      exportAsPDF(mockSession);

      expect(appendChild).toHaveBeenCalledWith(iframe);
      expect(write).toHaveBeenCalled();

      const htmlContent = write.mock.calls[0][0];
      expect(htmlContent).toContain('Interview Performance Report');
      expect(htmlContent).toContain('Software Engineer');
      expect(htmlContent).toContain('Questions & Responses');
      expect(htmlContent).toContain('Tell me about yourself');
    });

    it('should include suggestions in the PDF', () => {
      const { iframe, write } = createIframeMock();
      stubDom(iframe);

      exportAsPDF(mockSession);

      const htmlContent = write.mock.calls[0][0];
      expect(htmlContent).toContain('Practice more system design questions');
      expect(htmlContent).toContain('Work on explaining your thought process');
    });

    it('should handle session without questions', () => {
      const { iframe, write } = createIframeMock();
      stubDom(iframe);

      const sessionWithoutQuestions: InterviewResult = {
        ...mockSession,
        questions: undefined
      };

      exportAsPDF(sessionWithoutQuestions);

      const htmlContent = write.mock.calls[0][0];
      expect(htmlContent).toContain('Session Transcript');
      expect(htmlContent).not.toContain('Questions & Responses');
    });

    it('should bail out cleanly when the iframe document is unavailable', () => {
      const { iframe } = createIframeMock();
      (iframe as any).contentDocument = null;
      const { removeChild } = stubDom(iframe);

      expect(() => exportAsPDF(mockSession)).not.toThrow();
      expect(removeChild).toHaveBeenCalledWith(iframe);
    });
  });
});
