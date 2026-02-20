import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '../../components/Login';

// Mock firebase auth functions
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({ user: { uid: '123' } }),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn()
}));

describe('Login', () => {
  it('should render the Welcome Back heading in sign-in mode', () => {
    render(<Login />);
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('should render email and password inputs', () => {
    render(<Login />);
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should render the Google sign-in button', () => {
    render(<Login />);
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('should toggle to sign-up mode', async () => {
    render(<Login />);
    await userEvent.click(screen.getByText('Sign Up Free'));
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
  });

  it('should toggle back to sign-in mode', async () => {
    render(<Login />);
    await userEvent.click(screen.getByText('Sign Up Free'));
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Sign In'));
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('should show forgot password form', async () => {
    render(<Login />);
    await userEvent.click(screen.getByText('Forgot Password?'));
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByText('Send Reset Link')).toBeInTheDocument();
  });

  it('should navigate back from forgot password', async () => {
    render(<Login />);
    await userEvent.click(screen.getByText('Forgot Password?'));
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Back to Sign In'));
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('should render Sign In button in sign-in mode', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });
});
