import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../../components/Header';

// Mock firebase/auth - Header uses onAuthStateChanged directly
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(null); // simulate unauthenticated
    return vi.fn(); // unsubscribe
  }),
  signOut: vi.fn()
}));

describe('Header', () => {
  const defaultProps = {
    onGoHome: vi.fn(),
    onGoDashboard: vi.fn(),
    onLogin: vi.fn(),
    theme: 'light' as const,
    onToggleTheme: vi.fn()
  };

  it('should render the MockMentor brand', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('MockMentor')).toBeInTheDocument();
    expect(screen.getByText('AI Interview Coach')).toBeInTheDocument();
  });

  it('should render the Progress navigation button', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('should call onGoHome when logo is clicked', async () => {
    const onGoHome = vi.fn();
    render(<Header {...defaultProps} onGoHome={onGoHome} />);
    await userEvent.click(screen.getByLabelText('Go to home page'));
    expect(onGoHome).toHaveBeenCalledOnce();
  });

  it('should call onGoDashboard when Progress is clicked', async () => {
    const onGoDashboard = vi.fn();
    render(<Header {...defaultProps} onGoDashboard={onGoDashboard} />);
    await userEvent.click(screen.getByText('Progress'));
    expect(onGoDashboard).toHaveBeenCalledOnce();
  });

  it('should render Login button when not authenticated', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('should call onLogin when Login button is clicked', async () => {
    const onLogin = vi.fn();
    render(<Header {...defaultProps} onLogin={onLogin} />);
    await userEvent.click(screen.getByText('Login'));
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it('should render theme toggle button', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
  });

  it('should call onToggleTheme when theme button is clicked', async () => {
    const onToggleTheme = vi.fn();
    render(<Header {...defaultProps} onToggleTheme={onToggleTheme} />);
    await userEvent.click(screen.getByLabelText('Switch to dark mode'));
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });
});
