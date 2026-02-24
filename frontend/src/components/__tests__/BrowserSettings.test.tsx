import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrowserSettings from '../BrowserSettings';

describe('BrowserSettings', () => {
  it('renders with headless mode off', () => {
    const setHeadless = vi.fn();
    render(<BrowserSettings headless={false} setHeadless={setHeadless} />);

    expect(screen.getByText('Browser Settings')).toBeInTheDocument();
    expect(screen.getByText('With UI')).toBeInTheDocument();
    expect(screen.getByText('Headless')).toBeInTheDocument();
  });

  it('renders with headless mode on', () => {
    const setHeadless = vi.fn();
    render(<BrowserSettings headless={true} setHeadless={setHeadless} />);

    expect(screen.getByText('Browser Settings')).toBeInTheDocument();
  });

  it('highlights "With UI" button when headless is false', () => {
    const setHeadless = vi.fn();
    render(<BrowserSettings headless={false} setHeadless={setHeadless} />);

    const withUIButton = screen.getByText('With UI').closest('button');
    expect(withUIButton).toHaveClass('border-[#10B981]', 'bg-green-50');
  });

  it('highlights "Headless" button when headless is true', () => {
    const setHeadless = vi.fn();
    render(<BrowserSettings headless={true} setHeadless={setHeadless} />);

    const headlessButton = screen.getByText('Headless').closest('button');
    expect(headlessButton).toHaveClass('border-[#10B981]', 'bg-green-50');
  });

  it('calls setHeadless(false) when "With UI" is clicked', async () => {
    const user = userEvent.setup();
    const setHeadless = vi.fn();
    render(<BrowserSettings headless={true} setHeadless={setHeadless} />);

    const withUIButton = screen.getByText('With UI');
    await user.click(withUIButton);

    expect(setHeadless).toHaveBeenCalledWith(false);
  });

  it('calls setHeadless(true) when "Headless" is clicked', async () => {
    const user = userEvent.setup();
    const setHeadless = vi.fn();
    render(<BrowserSettings headless={false} setHeadless={setHeadless} />);

    const headlessButton = screen.getByText('Headless');
    await user.click(headlessButton);

    expect(setHeadless).toHaveBeenCalledWith(true);
  });

  it('displays description for headless mode', () => {
    const setHeadless = vi.fn();
    render(<BrowserSettings headless={true} setHeadless={setHeadless} />);

    expect(
      screen.getByText(/Browser runs in background/)
    ).toBeInTheDocument();
  });

  it('displays description for with UI mode', () => {
    const setHeadless = vi.fn();
    render(<BrowserSettings headless={false} setHeadless={setHeadless} />);

    expect(
      screen.getByText(/Browser window visible/)
    ).toBeInTheDocument();
  });

  it('disables buttons when disabled prop is true', () => {
    const setHeadless = vi.fn();
    render(
      <BrowserSettings
        headless={false}
        setHeadless={setHeadless}
        disabled={true}
      />
    );

    const withUIButton = screen.getByText('With UI').closest('button');
    const headlessButton = screen.getByText('Headless').closest('button');

    expect(withUIButton).toBeDisabled();
    expect(headlessButton).toBeDisabled();
  });

  it('enables buttons when disabled prop is false', () => {
    const setHeadless = vi.fn();
    render(
      <BrowserSettings
        headless={false}
        setHeadless={setHeadless}
        disabled={false}
      />
    );

    const withUIButton = screen.getByText('With UI').closest('button');
    const headlessButton = screen.getByText('Headless').closest('button');

    expect(withUIButton).not.toBeDisabled();
    expect(headlessButton).not.toBeDisabled();
  });

  it('enables buttons by default when disabled prop is not provided', () => {
    const setHeadless = vi.fn();
    render(<BrowserSettings headless={false} setHeadless={setHeadless} />);

    const withUIButton = screen.getByText('With UI').closest('button');
    const headlessButton = screen.getByText('Headless').closest('button');

    expect(withUIButton).not.toBeDisabled();
    expect(headlessButton).not.toBeDisabled();
  });

  it('applies disabled styling when disabled', () => {
    const setHeadless = vi.fn();
    render(
      <BrowserSettings
        headless={false}
        setHeadless={setHeadless}
        disabled={true}
      />
    );

    const withUIButton = screen.getByText('With UI').closest('button');
    expect(withUIButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });
});
