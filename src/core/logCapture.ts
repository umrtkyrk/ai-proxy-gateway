// GEÇİCİ: Umur'un src/services/logger.ts servisi bağlanana kadar yakaladığımız
// bilgiyi console'a yazıyoruz.
//
// Fonksiyon imzaları bilerek onun servisiyle birebir aynı tutuldu:
//   logRequestStart(clientId, provider, model) -> logId
//   logRequestComplete(logId, provider, model, inputTokens, outputTokens, latencyMs, isSuccess)
// Birleşmede sadece bu dosyanın içi değişecek; çağıran taraf (proxyForward.ts) aynı kalacak.
//
// İki bilinen uyumsuzluk (Umur'a iletilecek):
//   1. Onun imzasında inputTokens/outputTokens zorunlu `number`. Streaming'de sağlayıcı
//      usage göndermeyebiliyor; o durumda 0 geçiyoruz, ham değer burada görünür kalıyor.
//   2. `errorMessage` için `logs` tablosunda kolon yok. 8. parametre olarak taşıyoruz;
//      kolon açılmazsa birleşmede düşecek.

import type { ProviderName } from './providerConfig.js';

let nextLocalLogId = 1;

export async function logRequestStart(
  clientId: string,
  provider: ProviderName,
  model: string
): Promise<string | null> {
  const logId = `local-${nextLocalLogId++}`;
  console.log('[LOG:start]', JSON.stringify({ logId, clientId, provider, model, status: 'pending' }));
  return logId;
}

export async function logRequestComplete(
  logId: string,
  provider: ProviderName,
  model: string,
  inputTokens: number,
  outputTokens: number,
  latencyMs: number,
  isSuccess: boolean = true,
  errorMessage?: string
): Promise<void> {
  console.log(
    '[LOG:complete]',
    JSON.stringify({
      logId,
      provider,
      model,
      status: isSuccess ? 'success' : 'error',
      inputTokens,
      outputTokens,
      latencyMs,
      errorMessage
    })
  );
}

// Sağlayıcıya hiç gitmeden reddedilen istekler de kayda geçsin (mission: "All AI
// requests made through the Proxy should be logged"). Umur'un iki fazlı API'si
// üzerine kurulu, böylece birleşmede ayrıca uyarlama gerekmiyor.
export async function logDeniedRequest(
  clientId: string,
  provider: ProviderName,
  model: string,
  reason: string
): Promise<void> {
  const logId = await logRequestStart(clientId, provider, model);
  if (!logId) return;
  await logRequestComplete(logId, provider, model, 0, 0, 0, false, reason);
}
