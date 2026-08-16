// GEÇİCİ: Umur'un logs servisi hazır olana kadar, yakaladığımız bilgiyi
// sadece console'a yazdırıyoruz. Servis hazır olduğunda, sadece bu
// fonksiyonun içini gerçek bir çağrıyla değiştireceğiz — çağıran taraf
// (proxyForward.ts) hiç değişmeyecek.

interface RequestLogData {
  clientId: string | undefined;
  provider: 'openai' | 'gemini' | 'claude';
  model: string;
  success: boolean;
  latencyMs: number;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  errorMessage?: string;
}

export function sendToLogService(data: RequestLogData) {
  console.log('[LOG]', JSON.stringify(data));
}