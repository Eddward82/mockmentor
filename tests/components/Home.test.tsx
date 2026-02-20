import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from '../../components/Home';

describe('Home', () => {
  it('should render the hero section', () => {
    render(<Home onStart={vi.fn()} />);
    expect(screen.getByText(/Elevate Your/)).toBeInTheDocument();
    expect(screen.getByText('Career Path')).toBeInTheDocument();
  });

  it('should render the feature cards', () => {
    render(<Home onStart={vi.fn()} />);
    expect(screen.getByText('Vision Coaching')).toBeInTheDocument();
    expect(screen.getByText('Voice Mastery')).toBeInTheDocument();
    expect(screen.getByText('Semantic Analysis')).toBeInTheDocument();
  });

  it('should render trusted company names', () => {
    render(<Home onStart={vi.fn()} />);
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('should call onStart when Start Practice Session is clicked', async () => {
    const onStart = vi.fn();
    render(<Home onStart={onStart} />);
    await userEvent.click(screen.getByText('Start Practice Session'));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('should call onStart when Explore Dashboard is clicked', async () => {
    const onStart = vi.fn();
    render(<Home onStart={onStart} />);
    await userEvent.click(screen.getByText('Explore Dashboard'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
