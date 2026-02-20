import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../../components/Dashboard';
import { InterviewResult, InterviewMode, ExperienceLevel } from '../../types';

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadarChart: () => <div data-testid="radar-chart" />,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  LineChart: () => <div data-testid="line-chart" />,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null
}));

// Mock persistence service
vi.mock('../../services/persistenceService', () => ({
  persistenceService: {
    clearHistory: vi.fn().mockResolvedValue(undefined)
  }
}));

const mockHistory: InterviewResult[] = [
  {
    id: '1',
    date: new Date().toISOString(),
    config: {
      jobTitle: 'Frontend Developer',
      level: ExperienceLevel.MID,
      mode: InterviewMode.TECHNICAL
    },
    metrics: {
      communication: 85,
      confidence: 80,
      technicalAccuracy: 90,
      bodyLanguage: 75,
      overall: 82
    },
    suggestions: ['Practice system design', 'Work on communication'],
    transcription: 'Test transcript',
    duration: 420
  }
];

describe('Dashboard', () => {
  it('should render empty state when no history', () => {
    render(<Dashboard history={[]} onStartNew={vi.fn()} />);
    expect(screen.getByText(/No Interview History Yet/i)).toBeInTheDocument();
  });

  it('should render start button in empty state', () => {
    render(<Dashboard history={[]} onStartNew={vi.fn()} />);
    expect(screen.getByText(/Start Your First Interview/i)).toBeInTheDocument();
  });

  it('should render history when sessions exist', () => {
    render(<Dashboard history={mockHistory} onStartNew={vi.fn()} />);
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  it('should display correct overall score', () => {
    render(<Dashboard history={mockHistory} onStartNew={vi.fn()} />);
    // Multiple 82% displayed (in stats and table), so use getAllByText
    const scores = screen.getAllByText('82%');
    expect(scores.length).toBeGreaterThan(0);
  });

  it('should open session detail modal when clicking Details', async () => {
    const user = userEvent.setup();
    render(<Dashboard history={mockHistory} onStartNew={vi.fn()} />);

    await user.click(screen.getByText('Details'));
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
  });

  it('should close modal when clicking Close button', async () => {
    const user = userEvent.setup();
    render(<Dashboard history={mockHistory} onStartNew={vi.fn()} />);

    await user.click(screen.getByText('Details'));
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();

    await user.click(screen.getByText('Close'));
    expect(screen.queryByText('Performance Metrics')).not.toBeInTheDocument();
  });

  it('should call onStartNew when clicking New Practice Session', async () => {
    const onStartNew = vi.fn();
    const user = userEvent.setup();
    render(<Dashboard history={mockHistory} onStartNew={onStartNew} />);

    await user.click(screen.getByText('New Practice Session'));
    expect(onStartNew).toHaveBeenCalled();
  });
});
