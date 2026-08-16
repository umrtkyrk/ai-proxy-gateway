import crypto from 'crypto';

/**
 * Yeni bir Proxy API Anahtarı üretir.
 * Örnek Çıktı: sk-proxy-8f7b...
 */
export function generateProxyKey(): string {
  // 32 byte uzunluğunda rastgele güvenli bir dizi oluşturuyoruz
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `sk-proxy-${randomBytes}`;
}

/**
 * Verilen API anahtarını veritabanına kaydetmek veya doğrulamak için SHA-256 ile şifreler.
 * @param apiKey Şifrelenecek düz metin anahtar (örn: sk-proxy-...)
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}