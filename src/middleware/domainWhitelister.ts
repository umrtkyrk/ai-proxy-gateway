/**
 * Gelen isteğin Origin (Kaynak) domain'ini kontrol eder.
 * @param clientType İstemcinin türü ('browser-based' veya 'server-based')
 * @param allowedDomains İzin verilen domain listesi (örn: ['g101.com.tr', 'ornek.com'])
 * @param originHeader İstekten gelen 'Origin' veya 'Referer' başlığı
 */
export function checkDomainWhitelist(
  clientType: 'browser-based' | 'server-based',
  allowedDomains: string[],
  originHeader?: string | null
) {
  // 1. Sunucu tabanlı istemcilerde (Backend, Python scriptleri vb.) domain kontrolü atlanır[cite: 1]
  if (clientType === 'server-based') {
    return { success: true };
  }

  // 2. Tarayıcı tabanlı istemcilerde Origin veya Referer başlığı zorunludur
  if (!originHeader) {
    return { 
      success: false, 
      status: 403, 
      error: 'CORS Hatası: Origin veya Referer başlığı bulunamadı. Tarayıcı tabanlı istekler doğrulanamıyor.' 
    };
  }

  try {
    const originUrl = new URL(originHeader);
    const hostname = originUrl.hostname;

    // 3. Yerel geliştirme ortamları porttan bağımsız olarak her zaman kabul edilir[cite: 1]
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return { success: true };
    }

    // 4. İzin verilen domain ve yapılandırılmış subdomain kontrolü[cite: 1]
    const isAllowed = allowedDomains.some((domain) => {
      // Tam eşleşme kontrolü (örn: ornek.com === ornek.com)
      if (hostname === domain) return true;
      
      // Subdomain eşleşmesi (örn: app.ornek.com, sonu .ornek.com ile bitiyorsa kabul et)
      if (hostname.endsWith(`.${domain}`)) return true;
      
      return false;
    });

    if (isAllowed) {
      return { success: true };
    } else {
      return { 
        success: false, 
        status: 403, 
        error: `CORS Hatası: '${hostname}' yetkisiz bir alan adı.` 
      };
    }
  } catch (error) {
    // URL formatı geçersizse (parse edilemiyorsa) reddet
    return { success: false, status: 400, error: 'Geçersiz Origin formatı' };
  }
}