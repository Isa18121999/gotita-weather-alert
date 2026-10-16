import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { responder } from './api/noticias.ts';
import { responderWeather } from './api/weather.ts';

const apiLocal = (): Plugin => ({
  name: 'api-local',
  configureServer(server) {
    server.middlewares.use('/api', async (req, res) => {
      const url = new URL(req.url ?? '', 'http://localhost');
      const result = url.pathname.startsWith('/weather/')
        ? await responderWeather(url.pathname)
        : await responder(url.pathname, url.searchParams.get('url'));
      const { status, body } = result;
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(body);
    });
  },
});

export default defineConfig({ plugins: [react(), tailwindcss(), apiLocal()] });
