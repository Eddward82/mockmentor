import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupWizard } from '../../components/SetupWizard';

describe('SetupWizard', () => {
  it('should render the configuration heading', () => {
    render(<SetupWizard onStart={vi.fn()} />);
    expect(screen.getByText('Configure Your Interview')).toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(<SetupWizard onStart={vi.fn()} />);
    expect(screen.getByLabelText('Target Job Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Experience Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Interview Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Company (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of Questions')).toBeInTheDocument();
  });

  it('should have default values', () => {
    render(<SetupWizard onStart={vi.fn()} />);
    expect(screen.getByLabelText('Target Job Title')).toHaveValue('Software Engineer');
    expect(screen.getByLabelText('Company (Optional)')).toHaveValue('TechCorp');
  });

  it('should call onStart with config when Start Interview Session is clicked', async () => {
    const onStart = vi.fn();
    render(<SetupWizard onStart={onStart} />);
    await userEvent.click(screen.getByText('Start Interview Session'));
    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        jobTitle: 'Software Engineer',
        company: 'TechCorp',
        questionCount: 3
      })
    );
  });

  it('should allow changing the job title', async () => {
    const onStart = vi.fn();
    render(<SetupWizard onStart={onStart} />);
    const input = screen.getByLabelText('Target Job Title');
    await userEvent.clear(input);
    await userEvent.type(input, 'Data Scientist');
    await userEvent.click(screen.getByText('Start Interview Session'));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ jobTitle: 'Data Scientist' }));
  });

  it('should render question count options', () => {
    render(<SetupWizard onStart={vi.fn()} />);
    const select = screen.getByLabelText('Number of Questions');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('1 Question')).toBeInTheDocument();
    expect(screen.getByText('5 Questions')).toBeInTheDocument();
  });
});
