import Fastify from 'fastify';

import { env } from './env.js';

const app = Fastify({ logger: true });

app.get('/', async () => ({ message: 'Hello, World!' }));

app.get('/health', async () => ({ status: 'ok' }));

app.listen({ port: env.PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

export default app;
