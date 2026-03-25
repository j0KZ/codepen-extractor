import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Home } from '../pages/Home.js';

vi.mock('../services/api.js', () => ({
  getProjects: vi.fn(),
}));

import { getProjects } from '../services/api.js';

const mockedGetProjects = vi.mocked(getProjects);

describe('Home', () => {
  it('shows error message when loading projects fails', async () => {
    mockedGetProjects.mockRejectedValueOnce(new Error('Network error'));

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/no se pudieron cargar los proyectos/i),
      ).toBeInTheDocument();
    });
  });

  it('shows projects when loading succeeds', async () => {
    mockedGetProjects.mockResolvedValueOnce({
      projects: [
        {
          id: 'test-1',
          name: 'Test Pen',
          author: 'author',
          url: 'https://codepen.io/test/pen/abc',
          status: 'complete',
          extractedAt: new Date().toISOString(),
        },
      ],
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Test Pen')).toBeInTheDocument();
    });
  });
});
