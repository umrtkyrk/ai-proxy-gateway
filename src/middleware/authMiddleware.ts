import { supabase } from '../services/db';
import { hashApiKey } from '../utils/auth';

/**
 * Gelen istekteki Proxy API anahtarını doğrular.
 * Başarılı olursa istemci bilgilerini döner, başarısız olursa hata fırlatır.
 * @param providedApiKey İstemciden gelen "sk-proxy-..." formatındaki anahtar
 */
export async function verifyClient(providedApiKey: string) {
  try {
    if (!providedApiKey || !providedApiKey.startsWith('sk-proxy-')) {
      return { success: false, error: 'Geçersiz API Anahtarı formatı', status: 401 };
    }

    // 1. Gelen düz metin anahtarı, veritabanındaki haliyle kıyaslamak için şifreliyoruz
    const hashedKey = hashApiKey(providedApiKey);

    // 2. Supabase'den anahtarı ve bağlı olduğu istemciyi sorguluyoruz
    const { data: keyData, error: keyError } = await supabase
      .from('client_keys')
      .select(`
        is_active,
        environment,
        clients (
          id,
          name,
          is_active
        )
      `)
      .eq('key_hash', hashedKey)
      .single();

    // Kayıt bulunamazsa veya veritabanı hatası olursa
    if (keyError || !keyData) {
      return { success: false, error: 'Yetkisiz erişim: Anahtar bulunamadı', status: 401 };
    }

    // 3. İstemci veya Anahtar askıya alınmış mı (pasif mi) kontrol ediyoruz
    const client = keyData.clients;
    
    // Not: Supabase join işlemlerinde array dönebilir, TypeScript için güvenli atama yapıyoruz
    const clientDetails = Array.isArray(client) ? client[0] : client;

    if (!keyData.is_active || !clientDetails?.is_active) {
      return { success: false, error: 'Erişim reddedildi: İstemci veya anahtar pasif durumda', status: 403 };
    }

    // Her şey yolundaysa istemci bilgilerini (id, name, environment) geri dön
    return {
      success: true,
      client: {
        id: clientDetails.id,
        name: clientDetails.name,
        environment: keyData.environment
      }
    };

  } catch (error) {
    console.error('Kimlik doğrulama sırasında beklenmeyen hata:', error);
    return { success: false, error: 'Sunucu hatası', status: 500 };
  }
}