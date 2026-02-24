import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import JobStatus from '../JobStatus';

describe('JobStatus', () => {
  it('renders completed status with check icon', () => {
    render(<JobStatus status="completed" progress={100} currentStep="Done" />);

    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders failed status with X icon', () => {
    render(<JobStatus status="failed" progress={50} currentStep="Error occurred" />);

    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('renders pending status with spinner', () => {
    render(<JobStatus status="pending" progress={25} currentStep="Processing..." />);

    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('applies correct color for completed status', () => {
    render(<JobStatus status="completed" progress={100} currentStep="Done" />);

    const statusBadge = screen.getByText('COMPLETED');
    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('applies correct color for failed status', () => {
    render(<JobStatus status="failed" progress={0} currentStep="Failed" />);

    const statusBadge = screen.getByText('FAILED');
    expect(statusBadge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('applies correct color for in-progress status', () => {
    render(<JobStatus status="processing" progress={50} currentStep="Running" />);

    const statusBadge = screen.getByText('PROCESSING');
    expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('displays progress bar with correct width', () => {
    const { container } = render(
      <JobStatus status="processing" progress={75} currentStep="Almost done" />
    );

    const progressBar = container.querySelector('.bg-gradient-to-r');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('displays 0% progress', () => {
    render(<JobStatus status="queued" progress={0} currentStep="Waiting" />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays 100% progress', () => {
    render(<JobStatus status="completed" progress={100} currentStep="Complete" />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders current step message', () => {
    const stepMessage = 'Running test case 3 of 10';
    render(<JobStatus status="processing" progress={30} currentStep={stepMessage} />);

    expect(screen.getByText(stepMessage)).toBeInTheDocument();
  });

  it('has spinner animation class for in-progress status', () => {
    const { container } = render(
      <JobStatus status="processing" progress={50} currentStep="Running" />
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not have spinner animation for completed status', () => {
    const { container } = render(
      <JobStatus status="completed" progress={100} currentStep="Done" />
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });
});
