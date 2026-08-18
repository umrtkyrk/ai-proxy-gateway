// Güvenlik zinciri — Umur'un middleware'lerine açılan seam.
//
// ⚠️  BU DOSYADAKİ ÜÇ FONKSİYON GEÇİCİ TAKLİTTİR. ⚠️
// İmzaları Umur'un src/middleware/* dosyalarından birebir alındı. Birleşmede
// yapılacak iş, üç fonksiyonun gövdesini silip yerine şu import'ları koymak:
//
//   import { verifyClient }         from '../middleware/authMiddleware.js';
//   import { checkRateLimit }       from '../middleware/rateLimiter.js';
//   import { checkDomainWhitelist } from '../middleware/domainWhitelister.js';
//
// Çağıran taraf (route'lar) hiç değişmeyecek. Zincirin SIRASI ve dönen HTTP
// kodları bu dosyada belirleniyor; bağlama işi A tarafına ait.

const STUBS_ACTIVE = true;

// --- 1) Kimlik doğrulama — Umur: authMiddleware.verifyClient -----------------
// Gerçeğinde anahtar SHA-256'lanıp client_keys tablosuyla karşılaştırılır.
async function verifyClient(providedApiKey: string) {
  if (!providedApiKey || !providedApiKey.startsWith('sk-proxy-')) {
    return { success: false as const, error: 'Invalid API Key format', status: 401 };
  }
  if (providedApiKey === 'sk-proxy-disabled') {
    return { success: false as const, error: 'Forbidden: Client or key is inactive', status: 403 };
  }
  return {
    success: true as const,
    client: {
      id: 'demo-client',
      name: 'Demo Client',
      environment: 'local',
      // ⚠️ Aşağıdaki üç alan Umur'un ŞU ANKİ şemasında YOK. Domain ve rate limit
      // kontrolleri bunlar olmadan sabit varsayılanlarla çalışır, yani gerçek
      // koruma sağlamaz. verifyClient bunları döndürecek şekilde genişletilmeli.
      clientType: (process.env.STUB_CLIENT_TYPE as 'browser-based' | 'server-based') ?? 'browser-based',
      allowedDomains: (process.env.STUB_ALLOWED_DOMAINS ?? 'company.com').split(','),
      requestsPerMinute: Number(process.env.STUB_RATE_LIMIT ?? 60)
    }
  };
}

// --- 2) Domain kontrolü — Umur: domainWhitelister.checkDomainWhitelist -------
function checkDomainWhitelist(
  clientType: 'browser-based' | 'server-based',
  allowedDomains: string[],
  originHeader?: string | null
) {
  if (clientType === 'server-based') return { success: true as const };

  if (!originHeader) {
    return {
      success: false as const,
      status: 403,
      error: 'CORS Error: Origin or Referer header is missing.'
    };
  }

  try {
    const hostname = new URL(originHeader).hostname;
    // Yerel geliştirme porttan bağımsız kabul edilir (wf-ortak §4).
    if (hostname === 'localhost' || hostname === '127.0.0.1') return { success: true as const };

    const isAllowed = allowedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
    return isAllowed
      ? { success: true as const }
      : { success: false as const, status: 403, error: `CORS Error: '${hostname}' is an unauthorized domain.` };
  } catch {
    return { success: false as const, status: 400, error: 'Invalid Origin format' };
  }
}

// --- 3) Hız limiti — Umur: rateLimiter.checkRateLimit ------------------------
// Gerçeğinde Redis INCR + TTL. Taklitte aynı pencere mantığı, bellekte sayaç.
const stubCounters = new Map<string, number>();

async function checkRateLimit(clientId: string, limit: number = 60, windowSeconds: number = 60) {
  const currentWindow = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `ratelimit:req:${clientId}:${currentWindow}`;
  const requestCount = (stubCounters.get(key) ?? 0) + 1;
  stubCounters.set(key, requestCount);

  if (requestCount > limit) {
    return {
      success: false as const,
      status: 429,
      error: 'Too Many Requests: Rate limit exceeded. Please try again later.'
    };
  }
  return { success: true as const, remaining: limit - requestCount };
}

// --- Zincir ------------------------------------------------------------------

export type SecurityOutcome =
  | { ok: true; clientId: string }
  | { ok: false; status: number; error: string };

export async function runSecurityChain(options: {
  apiKey: string;
  origin: string | null;
}): Promise<SecurityOutcome> {
  // 1. Kimlik
  const auth = await verifyClient(options.apiKey);
  if (!auth.success) return { ok: false, status: auth.status, error: auth.error };

  const client = auth.client;

  // 2. Domain (yalnızca tarayıcı tabanlı client'lar için)
  const domain = checkDomainWhitelist(client.clientType, client.allowedDomains, options.origin);
  if (!domain.success) return { ok: false, status: domain.status, error: domain.error };

  // 3. Hız limiti
  const rate = await checkRateLimit(client.id, client.requestsPerMinute, 60);
  if (!rate.success) return { ok: false, status: rate.status, error: rate.error };

  return { ok: true, clientId: client.id };
}

if (STUBS_ACTIVE) {
  console.warn(
    '[UYARI] Güvenlik zinciri TAKLİT fonksiyonlarla çalışıyor (src/core/security.ts). ' +
      'Gerçek kimlik doğrulama, domain ve rate limit kontrolü YOK. Canlıya alınmamalı.'
  );
}
