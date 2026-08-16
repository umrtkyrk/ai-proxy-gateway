import Fastify from 'fastify';

const mockServer = Fastify({ logger: true });

mockServer.post('/v1/chat/completions', async (request, reply) => {
  const body = request.body as { messages?: { role: string; content: string }[]; stream?: boolean };
  const lastMessage = body?.messages?.[body.messages.length - 1]?.content ?? 'merhaba';

  if (!body?.stream) {
    return {
      id: 'mock-chatcmpl-123',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: `Bu sahte bir cevaptır. Sen şunu sordun: "${lastMessage}"` },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 }
    };
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const fakeAnswer = `Bu bir streaming cevabıdır. Sen şunu sordun: "${lastMessage}"`;
  const words = fakeAnswer.split(' ');

  for (const word of words) {
    const chunk = {
      id: 'mock-chatcmpl-123',
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4o-mini',
      choices: [{ index: 0, delta: { content: word + ' ' }, finish_reason: null }]
    };
    reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const finalChunk = {
    id: 'mock-chatcmpl-123',
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4o-mini',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 }
  };
  reply.raw.write(`data: ${JSON.stringify(finalChunk)}\n\n`);

  reply.raw.write('data: [DONE]\n\n');
  reply.raw.end();
});

mockServer.post('/v1beta/models/gemini-pro:generateContent', async (request, reply) => {
  const body = request.body as {
    contents?: { role: string; parts: { text: string }[] }[];
    stream?: boolean;
  };
  const lastPart = body?.contents?.[body.contents.length - 1]?.parts?.[0]?.text ?? 'merhaba';

  if (!body?.stream) {
    return {
      candidates: [
        {
          content: {
            parts: [{ text: `Bu sahte bir Gemini cevabıdır. Sen şunu sordun: "${lastPart}"` }],
            role: 'model'
          },
          finishReason: 'STOP',
          index: 0
        }
      ],
      usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 12, totalTokenCount: 20 }
    };
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const fakeAnswer = `Bu bir Gemini streaming cevabıdır. Sen şunu sordun: "${lastPart}"`;
  const words = fakeAnswer.split(' ');

  for (const word of words) {
    const chunk = {
      candidates: [
        {
          content: { parts: [{ text: word + ' ' }], role: 'model' },
          finishReason: null,
          index: 0
        }
      ]
    };
    reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const finalChunk = {
    candidates: [
      {
        content: { parts: [], role: 'model' },
        finishReason: 'STOP',
        index: 0
      }
    ],
    usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 12, totalTokenCount: 20 }
  };
  reply.raw.write(`data: ${JSON.stringify(finalChunk)}\n\n`);

  reply.raw.write('data: [DONE]\n\n');
  reply.raw.end();
});

mockServer.post('/v1/messages', async (request, reply) => {
  const body = request.body as {
    messages?: { role: string; content: string }[];
    stream?: boolean;
  };
  const lastMessage = body?.messages?.[body.messages.length - 1]?.content ?? 'merhaba';

  if (!body?.stream) {
    return {
      id: 'mock-msg-123',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4',
      content: [{ type: 'text', text: `Bu sahte bir Claude cevabıdır. Sen şunu sordun: "${lastMessage}"` }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 9, output_tokens: 14 }
    };
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const fakeAnswer = `Bu bir Claude streaming cevabıdır. Sen şunu sordun: "${lastMessage}"`;
  const words = fakeAnswer.split(' ');

  for (const word of words) {
    const chunk = {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: word + ' ' }
    };
    reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const finalChunk = {
    type: 'message_delta',
    usage: { input_tokens: 9, output_tokens: 14 }
  };
  reply.raw.write(`data: ${JSON.stringify(finalChunk)}\n\n`);

  reply.raw.write('data: [DONE]\n\n');
  reply.raw.end();
});

mockServer.listen({ port: 4000, host: '0.0.0.0' }, (err) => {
  if (err) {
    mockServer.log.error(err);
    process.exit(1);
  }
});