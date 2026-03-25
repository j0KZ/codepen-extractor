import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';

vi.mock('../utils/projectExists.js', () => ({
  isValidProjectId: (id: string) => /^pen_[a-f0-9]{8}$/.test(id),
  projectExists: vi.fn(),
}));

import { projectExists } from '../utils/projectExists.js';
const mockedProjectExists = vi.mocked(projectExists);

describe('POST /api/transform/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 202 with conversationId for valid request', async () => {
    mockedProjectExists.mockReturnValue(true);

    const res = await request(app)
      .post('/api/transform/pen_abcd1234')
      .send({ message: 'Cambiar el color de fondo a rojo' });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.conversationId).toMatch(/^conv_[a-f0-9]{8}$/);
    expect(res.body.status).toBe('processing');
  });

  it('returns 400 INVALID_REQUEST for empty message', async () => {
    mockedProjectExists.mockReturnValue(true);

    const res = await request(app)
      .post('/api/transform/pen_abcd1234')
      .send({ message: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 400 INVALID_REQUEST for missing message', async () => {
    mockedProjectExists.mockReturnValue(true);

    const res = await request(app)
      .post('/api/transform/pen_abcd1234')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 400 INVALID_REQUEST for path traversal attempt', async () => {
    const res = await request(app)
      .post('/api/transform/pen_..%2F..%2F')
      .send({ message: 'hack' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 404 PROJECT_NOT_FOUND for non-existent project', async () => {
    mockedProjectExists.mockReturnValue(false);

    const res = await request(app)
      .post('/api/transform/pen_00000000')
      .send({ message: 'Algo' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('error response matches ApiError shape', async () => {
    mockedProjectExists.mockReturnValue(false);

    const res = await request(app)
      .post('/api/transform/pen_00000000')
      .send({ message: 'Algo' });

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error).toHaveProperty('message');
    expect(typeof res.body.error.code).toBe('string');
    expect(typeof res.body.error.message).toBe('string');
  });
});
