import { createClient } from '@supabase/supabase-js';
import { generateProxyKey, hashApiKey } from '../utils/auth';

// 1. Çevresel değişkenlerden (env) güvenli anahtarları alıyoruz
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// 2. Supabase yetkili (admin) istemcisini oluşturuyoruz
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Sisteme yeni bir istemci (Client) ve onun için bir API Anahtarı ekler.
 * @param name İstemcinin adı (örn: "Pazarlama Departmanı")
 * @param environment Ortam bilgisi (örn: "production", "local")
 */
export async function createNewClient(name: string, environment: string) {
  try {
    // 1. Yeni bir Client kaydı oluştur
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert([{ name: name }])
      .select('id')
      .single();

    if (clientError) throw new Error(`Client ekleme hatası: ${clientError.message}`);

    // 2. Güvenli API Anahtarını üret ve şifrele
    const plainApiKey = generateProxyKey();
    const hashedKey = hashApiKey(plainApiKey);

    // 3. Şifrelenmiş anahtarı client_keys tablosuna kaydet
    const { error: keyError } = await supabase
      .from('client_keys')
      .insert([{
        client_id: clientData.id,
        key_hash: hashedKey,
        environment: environment
      }]);

    if (keyError) throw new Error(`Key ekleme hatası: ${keyError.message}`);

    // İşlem başarılı! Sadece bu sefere mahsus düz metin anahtarı geri döndürüyoruz.
    return {
      success: true,
      clientId: clientData.id,
      plainApiKey: plainApiKey, // Kullanıcıya gösterilecek olan (bir daha veritabanından çekilemez)
      message: "İstemci başarıyla oluşturuldu. Lütfen API anahtarını kopyalayın, bir daha gösterilmeyecektir!"
    };

  } catch (error) {
    console.error("Sistem Hatası:", error);
    return { success: false, error };
  }
}