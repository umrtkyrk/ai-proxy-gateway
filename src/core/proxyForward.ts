import type { FastifyReply } from 'fastify';
import { sendToLogService } from './logCapture.js';

interface ForwardOptions {
  targetUrl: string;
  body: unknown;
  reply: FastifyReply;
  clientId: string | undefined;
  provider: 'openai' | 'gemini' | 'claude';
  model: string;
}

function extractInputTokens(provider: string, data: any): number | undefined {
  if (provider === 'openai') return data?.usage?.prompt_tokens;
  if (provider === 'gemini') return data?.usageMetadata?.promptTokenCount;
  if (provider === 'claude') return data?.usage?.input_tokens;
  return undefined;
}

function extractOutputTokens(provider: string, data: any): number | undefined {
  if (provider === 'openai') return data?.usage?.completion_tokens;
  if (provider === 'gemini') return data?.usageMetadata?.candidatesTokenCount;
  if (provider === 'claude') return data?.usage?.output_tokens;
  return undefined;
}

export async function forwardToProvider({ targetUrl, body, reply, clientId, provider, model }: ForwardOptions) {
  const startTime = Date.now();
  const isStreaming = (body as { stream?: boolean })?.stream === true;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!isStreaming) {
      const data = await response.json();
      sendToLogService({
        clientId,
        provider,
        model,
        success: response.ok,
        latencyMs: Date.now() - startTime,
        inputTokens: extractInputTokens(provider, data),
        outputTokens: extractOutputTokens(provider, data)
      });
      return reply.send(data);
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    const reader = response.body?.getReader();
    if (!reader) {
      reply.raw.end();
      sendToLogService({
        clientId,
        provider,
        model,
        success: false,
        latencyMs: Date.now() - startTime,
        inputTokens: undefined,
        outputTokens: undefined,
        errorMessage: 'Sağlayıcıdan okunabilir bir cevap gelmedi.'
      });
      return;
    }

    const decoder = new TextDecoder();
    let capturedInputTokens: number | undefined;
    let capturedOutputTokens: number | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value);
      reply.raw.write(chunkText);

      const lines = chunkText.split('\n').filter((line) => line.startsWith('data: '));
      for (const line of lines) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]' || payload === '') continue;
        try {
          const parsed = JSON.parse(payload);
          const inputTokens = extractInputTokens(provider, parsed);
          const outputTokens = extractOutputTokens(provider, parsed);
          if (inputTokens !== undefined) capturedInputTokens = inputTokens;
          if (outputTokens !== undefined) capturedOutputTokens = outputTokens;
        } catch {
          // Parça yarım gelmiş olabilir, sessizce atlıyoruz.
        }
      }
    }
    reply.raw.end();

    sendToLogService({
      clientId,
      provider,
      model,
      success: true,
      latencyMs: Date.now() - startTime,
      inputTokens: capturedInputTokens,
      outputTokens: capturedOutputTokens
    });
  } catch (err) {
    sendToLogService({
      clientId,
      provider,
      model,
      success: false,
      latencyMs: Date.now() - startTime,
      inputTokens: undefined,
      outputTokens: undefined,
      errorMessage: err instanceof Error ? err.message : 'Bilinmeyen hata'
    });
    throw err;
  }
}