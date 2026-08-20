// B tarafının log servisine açılan katman.
//
// Umur'un logRequestComplete imzası errorMessage almıyor; logs tablosuna
// error_message kolonu eklendi ama fonksiyon henüz onu yazmıyor. Sebep metnini
// burada tutuyoruz ve doğrudan kolona yazıyoruz — imzası genişletildiğinde bu
// ek güncelleme kalkacak.

import type { ProviderName } from './providerConfig.js';
import * as logger from '../services/logger.js';
import { supabase } from '../services/db.js';

export async function logRequestStart(
  clientId: string,
  provider: ProviderName,
  model: string
): Promise<string | null> {
  return logger.logRequestStart(clientId, provider, model);
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
  await logger.logRequestComplete(logId, provider, model, inputTokens, outputTokens, latencyMs, isSuccess);
  if (errorMessage) {
    await supabase.from('logs').update({ error_message: errorMessage }).eq('id', logId);
  }
}

// Sağlayıcıya hiç gitmeden reddedilen istekler de kayda geçsin
// (görev tanımı: "All AI requests made through the Proxy should be logged").
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
