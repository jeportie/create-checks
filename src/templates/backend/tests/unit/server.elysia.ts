import { describe, expect, it } from 'vitest';

import app from '../../src/index.js';

describe('Elysia server', () => {
  it('GET / returns hello message', async () => {
    const res = await app.handle(new Request('http://localhost/'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ message: 'Hello, World!' });
  });

  it('GET /health returns ok', async () => {
    const res = await app.handle(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
