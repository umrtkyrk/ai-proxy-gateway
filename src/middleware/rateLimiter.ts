import { Redis } from '@upstash/redis';

// Upstash Redis istemcisi, .env dosyasındaki URL ve TOKEN'ı otomatik olarak alır.
const redis = Redis.fromEnv();

/**
 * İstemcinin (Client) istek sınırını (Rate Limit) kontrol eder.
 * @param clientId İstek atan istemcinin ID'si
 * @param limit İzin verilen maksimum istek sayısı (Örn: 5)
 * @param windowSeconds Pencere süresi (Saniye cinsinden, Örn: 60)
 */
export async function checkRateLimit(clientId: string, limit: number = 60, windowSeconds: number = 60) {
  try {
    // 1. Zaman bazlı benzersiz bir anahtar (key) oluşturuyoruz.
    const currentWindow = Math.floor(Date.now() / (windowSeconds * 1000));
    const key = `ratelimit:req:${clientId}:${currentWindow}`;

    // 2. Redis INCR komutu ile bu anahtardaki sayacı 1 artır (Yoksa 1 olarak oluşturur)
    const requestCount = await redis.incr(key);

    // 3. Eğer bu anahtara atılan ilk istekse, süresini (TTL) ayarla
    if (requestCount === 1) {
      await redis.expire(key, windowSeconds);
    }

    // 4. Sayaç, belirlediğimiz limiti aşmış mı kontrol et
    if (requestCount > limit) {
      return {
        success: false,
        status: 429, 
        error: 'Too Many Requests: İstek limiti aşıldı. Lütfen daha sonra tekrar deneyin.'
      };
    }

    // Sınır aşılmadıysa isteğin geçmesine izin ver
    return {
      success: true,
      remaining: limit - requestCount
    };

  } catch (error) {
    console.error('Redis Rate Limit Hatası:', error);
    // Fallback: Eğer Redis çökerse (çok nadir de olsa), ana sistemi kilitlememek için isteğe izin ver (fail-open mantığı)
    return { success: true };
  }
}