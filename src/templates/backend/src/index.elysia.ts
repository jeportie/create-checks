import { Elysia } from 'elysia';

import { env } from './env.js';

const app = new Elysia()
  .get('/', () => ({ message: 'Hello, World!' }))
  .get('/health', () => ({ status: 'ok' }))
  .listen(env.PORT);

console.log(`Server running at http://localhost:${env.PORT}`);

export default app;
