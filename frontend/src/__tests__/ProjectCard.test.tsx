import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '../components/Gallery/ProjectCard.js';
import type { ProjectSummary } from '../../../shared/types/index.js';

const mockProject: ProjectSummary = {
  id: 'pen_abc123',
  name: 'Cool Animation',
  url: 'https://codepen.io/user/pen/abc123',
  author: 'TestUser',
  extractedAt: '2026-03-20T10:00:00Z',
  license: 'MIT',
  hasCode: true,
  hasVariations: false,
  status: 'complete',
};

describe('ProjectCard', () => {
  it('renders project name and author', () => {
    render(<ProjectCard project={mockProject} onClick={() => {}} />);

    expect(screen.getByText('Cool Animation')).toBeInTheDocument();
    expect(screen.getByText('por TestUser')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    render(<ProjectCard project={mockProject} onClick={() => {}} />);

    const timeEl = screen.getByRole('article').querySelector('time');
    expect(timeEl).toHaveAttribute('datetime', '2026-03-20T10:00:00Z');
  });

  it('renders status badge', () => {
    render(<ProjectCard project={mockProject} onClick={() => {}} />);

    expect(screen.getByText('Completo')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<ProjectCard project={mockProject} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('article'));
    expect(handleClick).toHaveBeenCalledWith(mockProject);
  });

  it('calls onClick on Enter key', () => {
    const handleClick = vi.fn();
    render(<ProjectCard project={mockProject} onClick={handleClick} />);

    fireEvent.keyDown(screen.getByRole('article'), { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledWith(mockProject);
  });

  it('calls onClick on Space key', () => {
    const handleClick = vi.fn();
    render(<ProjectCard project={mockProject} onClick={handleClick} />);

    fireEvent.keyDown(screen.getByRole('article'), { key: ' ' });
    expect(handleClick).toHaveBeenCalledWith(mockProject);
  });

  it('has accessible aria-label', () => {
    render(<ProjectCard project={mockProject} onClick={() => {}} />);

    expect(screen.getByLabelText('Proyecto: Cool Animation por TestUser')).toBeInTheDocument();
  });

  it('is focusable via tabIndex', () => {
    render(<ProjectCard project={mockProject} onClick={() => {}} />);

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  it('renders failed status correctly', () => {
    const failedProject = { ...mockProject, status: 'failed' as const };
    render(<ProjectCard project={failedProject} onClick={() => {}} />);

    expect(screen.getByText('Fallido')).toBeInTheDocument();
  });
});
