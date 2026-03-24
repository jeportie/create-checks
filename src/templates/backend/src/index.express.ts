import express from 'express';

import { env } from './env.js';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(env.PORT, () => {
  console.log(`Server running at http://localhost:${env.PORT}`);
});

export default app;
