import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectGrid } from '../components/Gallery/ProjectGrid.js';
import type { ProjectSummary } from '../../../shared/types/index.js';

const mockProjects: ProjectSummary[] = [
  {
    id: 'pen_abc',
    name: 'Cool Animation',
    url: 'https://codepen.io/user/pen/abc',
    author: 'Alice',
    extractedAt: '2026-03-20T10:00:00Z',
    license: 'MIT',
    hasCode: true,
    hasVariations: false,
    status: 'complete',
  },
  {
    id: 'pen_def',
    name: 'Login Form',
    url: 'https://codepen.io/user/pen/def',
    author: 'Bob',
    extractedAt: '2026-03-19T10:00:00Z',
    license: 'MIT',
    hasCode: true,
    hasVariations: false,
    status: 'partial',
  },
  {
    id: 'pen_ghi',
    name: 'CSS Grid Layout',
    url: 'https://codepen.io/user/pen/ghi',
    author: 'Alice',
    extractedAt: '2026-03-18T10:00:00Z',
    license: 'MIT',
    hasCode: true,
    hasVariations: false,
    status: 'complete',
  },
];

describe('ProjectGrid', () => {
  it('renders grid with projects', () => {
    render(
      <ProjectGrid projects={mockProjects} loading={false} onProjectClick={() => {}} />
    );

    expect(screen.getByText('Cool Animation')).toBeInTheDocument();
    expect(screen.getByText('Login Form')).toBeInTheDocument();
    expect(screen.getByText('CSS Grid Layout')).toBeInTheDocument();
  });

  it('search filters by name', () => {
    render(
      <ProjectGrid projects={mockProjects} loading={false} onProjectClick={() => {}} />
    );

    const searchInput = screen.getByPlaceholderText('Buscar por nombre o autor...');
    fireEvent.change(searchInput, { target: { value: 'Login' } });

    expect(screen.getByText('Login Form')).toBeInTheDocument();
    expect(screen.queryByText('Cool Animation')).not.toBeInTheDocument();
    expect(screen.queryByText('CSS Grid Layout')).not.toBeInTheDocument();
  });

  it('search filters by author', () => {
    render(
      <ProjectGrid projects={mockProjects} loading={false} onProjectClick={() => {}} />
    );

    const searchInput = screen.getByPlaceholderText('Buscar por nombre o autor...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(screen.getByText('Cool Animation')).toBeInTheDocument();
    expect(screen.getByText('CSS Grid Layout')).toBeInTheDocument();
    expect(screen.queryByText('Login Form')).not.toBeInTheDocument();
  });

  it('shows empty state when no projects', () => {
    render(
      <ProjectGrid projects={[]} loading={false} onProjectClick={() => {}} />
    );

    expect(screen.getByText('No hay proyectos extraidos')).toBeInTheDocument();
  });

  it('shows no results message when search has no matches', () => {
    render(
      <ProjectGrid projects={mockProjects} loading={false} onProjectClick={() => {}} />
    );

    const searchInput = screen.getByPlaceholderText('Buscar por nombre o autor...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    render(
      <ProjectGrid projects={[]} loading={true} onProjectClick={() => {}} />
    );

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(screen.queryByText('No hay proyectos extraidos')).not.toBeInTheDocument();
  });

  it('calls onProjectClick when a card is clicked', () => {
    const handleClick = vi.fn();
    render(
      <ProjectGrid projects={mockProjects} loading={false} onProjectClick={handleClick} />
    );

    fireEvent.click(screen.getByText('Cool Animation').closest('article')!);
    expect(handleClick).toHaveBeenCalledWith(mockProjects[0]);
  });
});
