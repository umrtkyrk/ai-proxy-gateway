import type { FastifyInstance } from 'fastify';
import { forwardToProvider } from '../core/proxyForward.js';
import { isModelAllowed } from '../core/modelAuthorization.js';
import { sendToLogService } from '../core/logCapture.js';

const GEMINI_BASE_URL = 'http://localhost:4000';

export async function geminiRoutes(server: FastifyInstance) {
  server.post('/v1/gemini/models/:model', async (request, reply) => {
    const startTime = Date.now();
    const clientId = request.headers['x-client-id'] as string | undefined;
    const requestedModel = (request.params as { model: string }).model;

    if (!clientId || !isModelAllowed(clientId, requestedModel)) {
      sendToLogService({
        clientId,
        provider: 'gemini',
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
      targetUrl: `${GEMINI_BASE_URL}/v1beta/models/gemini-pro:generateContent`,
      body: request.body,
      reply,
      clientId,
      provider: 'gemini',
      model: requestedModel
    });
  });
}