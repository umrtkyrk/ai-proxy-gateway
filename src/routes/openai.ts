import type { FastifyInstance } from 'fastify';
import { forwardToProvider } from '../core/proxyForward.js';
import { isModelAllowed } from '../core/modelAuthorization.js';
import { sendToLogService } from '../core/logCapture.js';

const OPENAI_BASE_URL = 'http://localhost:4000';

export async function openaiRoutes(server: FastifyInstance) {
  server.post('/v1/openai/chat/completions', async (request, reply) => {
    const startTime = Date.now();
    const clientId = request.headers['x-client-id'] as string | undefined;
    const body = request.body as { model?: string };
    const requestedModel = body?.model ?? 'gpt-4o-mini';

    if (!clientId || !isModelAllowed(clientId, requestedModel)) {
      sendToLogService({
        clientId,
        provider: 'openai',
        model: requestedModel,
        success: false,
        latencyMs: Date.now() - startTime,
        inputTokens: undefined,
        outputTokens: undefined,
        errorMessage: 'Client kimliği eksik veya model yetkisi yok.'
      });
      return reply.status(403).send({
        error: 'Bu model için yetkiniz yok veya Client kimliği eksik.'
      });
    }

    await forwardToProvider({
      targetUrl: `${OPENAI_BASE_URL}/v1/chat/completions`,
      body: request.body,
      reply,
      clientId,
      provider: 'openai',
      model: requestedModel
    });
  });
}