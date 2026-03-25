import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExtractorPanel } from '../components/Extractor/ExtractorPanel.js';

describe('ExtractorPanel', () => {
  it('renders the URL input and extract button', () => {
    render(<ExtractorPanel onExtractComplete={() => {}} />);

    expect(screen.getByPlaceholderText(/codepen\.io/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /extraer/i })).toBeInTheDocument();
  });

  it('button is disabled when input is empty', () => {
    render(<ExtractorPanel onExtractComplete={() => {}} />);

    const button = screen.getByRole('button', { name: /extraer/i });
    expect(button).toBeDisabled();
  });

  it('renders heading', () => {
    render(<ExtractorPanel onExtractComplete={() => {}} />);

    expect(screen.getByText('Extraer CodePen')).toBeInTheDocument();
  });
});
