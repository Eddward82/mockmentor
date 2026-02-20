import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsScreen } from '../../components/ResultsScreen';
import { InterviewResult, InterviewMode, ExperienceLevel } from '../../types';

const mockResult: InterviewResult = {
  id: '1',
  date: new Date().toISOString(),
  config: {
    jobTitle: 'Backend Engineer',
    level: ExperienceLevel.SENIOR,
    mode: InterviewMode.TECHNICAL
  },
  metrics: {
    communication: 88,
    confidence: 92,
    technicalAccuracy: 85,
    bodyLanguage: 78,
    overall: 86
  },
  suggestions: ['Improve eye contact during technical explanations', 'Add more quantitative results'],
  transcription: 'Test transcript'
};

describe('ResultsScreen', () => {
  it('should render the overall score', async () => {
    render(<ResultsScreen result={mockResult} onDone={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('86')).toBeInTheDocument();
    });
  });

  it('should render Well Done heading', () => {
    render(<ResultsScreen result={mockResult} onDone={vi.fn()} />);
    expect(screen.getByText('Well Done!')).toBeInTheDocument();
  });

  it('should render the target job title', () => {
    render(<ResultsScreen result={mockResult} onDone={vi.fn()} />);
    expect(screen.getByText(/Backend Engineer/)).toBeInTheDocument();
  });

  it('should render metric categories', async () => {
    render(<ResultsScreen result={mockResult} onDone={vi.fn()} />);
    expect(screen.getByText('Comm.')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Visuals')).toBeInTheDocument();
  });

  it('should render suggestions', () => {
    render(<ResultsScreen result={mockResult} onDone={vi.fn()} />);
    expect(screen.getByText('Improve eye contact during technical explanations')).toBeInTheDocument();
    expect(screen.getByText('Add more quantitative results')).toBeInTheDocument();
  });

  it('should render Growth Roadmap heading', () => {
    render(<ResultsScreen result={mockResult} onDone={vi.fn()} />);
    expect(screen.getByText('Growth Roadmap')).toBeInTheDocument();
  });

  it('should call onDone when View Performance Dashboard is clicked', async () => {
    const onDone = vi.fn();
    render(<ResultsScreen result={mockResult} onDone={onDone} />);
    await userEvent.click(screen.getByText('View Performance Dashboard'));
    expect(onDone).toHaveBeenCalledOnce();
  });
});
