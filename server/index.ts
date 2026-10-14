import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createLabApp, LAB_HOST } from './app';

const port = Number(process.env.PORT || 3000);
const { app } = createLabApp();

if (process.env.NODE_ENV === 'production') {
  const dist = resolve(process.cwd(), 'dist');
  if (!existsSync(dist)) throw new Error('Missing dist directory. Run pnpm build first.');
  app.use(express.static(dist));
  app.get('{*path}', (_request, response) => response.sendFile(resolve(dist, 'index.html')));
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { host: LAB_HOST } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, LAB_HOST, () => {
  console.log(`\n  Signal & Shield is running locally`);
  console.log(`  Presentation  http://${LAB_HOST}:${port}/presentation`);
  console.log(`  Victim        http://${LAB_HOST}:${port}/victim`);
  console.log(`  Attacker      http://${LAB_HOST}:${port}/attacker\n`);
});
