// Model erişim kontrolü iki katmanlı çalışır:
//
//   1. KATALOG  — Model sistemde tanımlı mı? Kaynağı Umur'un model_pricing.json'u.
//                 Fiyatı olmayan model hiç geçmez; aksi halde maliyet sessizce 0 yazılır.
//   2. YETKİ    — BU client BU modeli kullanabilir mi? Client bazında açık liste.
//
// İkisinin ayrı olması önemli: katalogdaki her modeli herkese açsaydık bu fiilen
// wildcard erişim olurdu, wf-ortak §4 bunu açıkça yasaklıyor ("wildcard (*) erişimi
// kullanılmaz; böylece yeni ve pahalı modellere kontrolsüz erişim engellenir").

import { isKnownModel } from './modelCatalog.js';
import type { ProviderName } from './providerConfig.js';

// GEÇİCİ: Umur'un şemasına client bazında izinli model tablosu eklendiğinde
// bu sabitin yerini bir veritabanı sorgusu alacak. Fonksiyonun dışarıya verdiği
// cevap aynı kalacak, sadece içindeki kaynak değişecek.
// Model isimleri bilerek model_pricing.json'daki isimlerle aynı.
const MOCK_CLIENT_MODEL_ACCESS: Record<string, string[]> = {
  'demo-client': ['openai/gpt-4o', 'gemini/gemini-1.5-pro', 'anthropic/claude-3-5-sonnet']
};

export type AuthorizationResult = { ok: true } | { ok: false; status: number; error: string };

export function authorizeModel(
  clientId: string,
  provider: ProviderName,
  model: string
): AuthorizationResult {
  if (!isKnownModel(provider, model)) {
    return {
      ok: false,
      status: 400,
      error: `'${model}' modeli ${provider} sağlayıcısı için sistemde tanımlı değil.`
    };
  }

  const allowedModels = MOCK_CLIENT_MODEL_ACCESS[clientId] ?? [];
  if (!allowedModels.includes(`${provider}/${model}`)) {
    return {
      ok: false,
      status: 403,
      error: `'${model}' modeli için yetkiniz yok.`
    };
  }

  return { ok: true };
}
