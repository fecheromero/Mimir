import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../Header';

describe('Header', () => {
  const renderHeader = () => {
    return render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
  };

  it('renders the application name', () => {
    renderHeader();
    expect(screen.getByText('Mimir')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    renderHeader();
    expect(screen.getByText('AI-Powered QA Testing')).toBeInTheDocument();
  });

  it('has a link to home page', () => {
    renderHeader();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders brain icon', () => {
    const { container } = renderHeader();
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = renderHeader();
    const header = container.querySelector('header');
    expect(header).toHaveClass('bg-white', 'shadow');
  });
});
