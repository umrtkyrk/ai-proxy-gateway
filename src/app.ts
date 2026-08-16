import Fastify from 'fastify';
import { openaiRoutes } from './routes/openai.js';
import { geminiRoutes } from './routes/gemini.js';
import { claudeRoutes } from './routes/claude.js';
import { isLocalOrigin } from './core/localOrigins.js';

export function buildApp() {
  const server = Fastify({ logger: true });

  server.get('/health', async (request) => {
    const origin = request.headers.origin;
    return { status: 'ok', isLocalOrigin: isLocalOrigin(origin) };
  });

  server.register(openaiRoutes);
  server.register(geminiRoutes);
  server.register(claudeRoutes);

  return server;
}