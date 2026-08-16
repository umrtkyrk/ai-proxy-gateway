import { createNewClient } from './services/db';
import { verifyClient } from './middleware/authMiddleware';
import { createNewClient } from './services/db';
import { verifyClient } from './middleware/authMiddleware';
import { checkRateLimit } from './middleware/rateLimiter';
import { checkDomainWhitelist } from './middleware/domainWhitelister';
// YENİ EKLENEN İMPORTLAR:
import { logRequestStart, logRequestComplete } from './services/logger';

async function runTests() {
  console.log('⏳ Supabase Veritabanı ve Güvenlik Testi Başlatılıyor...\n');

  // 1. Yeni İstemci Ekleme Testi
  console.log('1️⃣ Yeni istemci (Client) oluşturuluyor...');
  const createRes = await createNewClient('Test Projesi', 'development');
  
  if (!createRes.success) {
    console.error('❌ İstemci oluşturulamadı. Hata:', createRes.error);
    return;
  }

  const apiKey = createRes.plainApiKey as string;
  console.log('✅ İstemci başarıyla oluşturuldu!');
  console.log('🔑 Üretilen API Anahtarı (Kullanıcıya Verilecek):', apiKey);

  // 2. Geçerli Anahtar ile Doğrulama Testi
  console.log('\n2️⃣ Az önce üretilen geçerli anahtar ile doğrulama deneniyor...');
  const verifySuccess = await verifyClient(apiKey);
  console.log('🟢 Doğrulama Sonucu:', verifySuccess);

  // 3. Geçersiz Anahtar ile Doğrulama Testi
  console.log('\n3️⃣ Sahte/Geçersiz bir anahtar ile giriş deneniyor...');
  const verifyFail = await verifyClient('sk-proxy-sahte-anahtar-123456789');
  console.log('🔴 Doğrulama Sonucu (Erişim Reddedilmeli):', verifyFail);
}

runTests();

import { checkRateLimit } from './middleware/rateLimiter';

// ... (Önceki test kodları yukarıda kalsın) ...

async function runRateLimitTest() {
  console.log('\n🛡️ 4️⃣ Redis Rate Limit Testi Başlatılıyor...');
  
  // Test için hayali bir Client ID kullanıyoruz
  const testClientId = 'test-client-123';
  const testLimit = 3; // 1 dakikada maksimum 3 istek atsın
  
  for (let i = 1; i <= 5; i++) {
    const result = await checkRateLimit(testClientId, testLimit, 60);
    
    if (result.success) {
      console.log(`[İstek ${i}] ✅ Başarılı! Kalan Hak: ${result.remaining}`);
    } else {
      console.log(`[İstek ${i}] 🔴 ENGELLENDİ! Hata: ${result.error}`);
    }
    
    // Redis'e istekler ardı ardına çok hızlı gitmesin diye ufak bir bekleme (50ms) koyuyoruz
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

// Yeni testi çalıştırmak için önceki kodun altındaki runTests() fonksiyonunu güncelleyelim:
// Daha önce sadece runTests(); yazan yeri silip şunu yapıştır:

runTests().then(() => {
  runRateLimitTest();
});

import { checkDomainWhitelist } from './middleware/domainWhitelister';

// ... (Önceki test kodları yukarıda kalsın) ...

function runDomainTest() {
  console.log('\n🌍 5️⃣ Domain Whitelisting Testi Başlatılıyor...\n');

  const allowed = ['sirket.com', 'proje.io'];

  // Senaryo 1: Server-based (Backend) İstekleri
  console.log('Senaryo 1: Sunucu Tabanlı İstek');
  console.log(checkDomainWhitelist('server-based', allowed, null));

  // Senaryo 2: Localhost (Porttan Bağımsız)
  console.log('\nSenaryo 2: Localhost (Tarayıcı)');
  console.log(checkDomainWhitelist('browser-based', allowed, 'http://localhost:3000'));

  // Senaryo 3: İzin Verilen Tam Domain
  console.log('\nSenaryo 3: İzin Verilen Tam Domain (sirket.com)');
  console.log(checkDomainWhitelist('browser-based', allowed, 'https://sirket.com/api/test'));

  // Senaryo 4: İzin Verilen Subdomain
  console.log('\nSenaryo 4: İzin Verilen Subdomain (app.sirket.com)');
  console.log(checkDomainWhitelist('browser-based', allowed, 'https://app.sirket.com/dashboard'));

  // Senaryo 5: Kötü Niyetli / İzin Verilmeyen Domain
  console.log('\nSenaryo 5: Kötü Niyetli Domain (korsan-site.com)');
  console.log(checkDomainWhitelist('browser-based', allowed, 'https://korsan-site.com'));
}

// Testleri sırayla çalıştıran zinciri güncelliyoruz
// En alttaki runTests().then(...) bloğunu silip şunu yapıştır:
async function runLogTest() {
  console.log('\n📝 6️⃣ Asenkron Loglama ve Maliyet Hesaplama Testi Başlatılıyor...\n');

  // 1. Veritabanı ilişkisi (Foreign Key) hata vermesin diye yeni bir Client oluşturuyoruz
  const clientRes = await createNewClient('Log Test İstemcisi', 'development');
  if (!clientRes.success) {
    console.log('❌ Log testi için client oluşturulamadı.');
    return;
  }
  
  const clientId = clientRes.clientId; // TypeScript'in algılaması için değişkene atıyoruz
  if (!clientId) return;

  // 2. İstek başlatılıyor (Pending durumu)
  console.log('⏳ AI isteği başlatılıyor (Veritabanına "pending" olarak yazılıyor)...');
  const provider = 'openai';
  const model = 'gpt-4o';
  const logId = await logRequestStart(clientId, provider, model);

  if (!logId) {
    console.log('❌ Log kaydı açılamadı!');
    return;
  }
  console.log(`✅ Log başarıyla açıldı! Kayıt ID: ${logId}`);

  // 3. AI yanıtı gelmiş gibi simüle edip logu güncelliyoruz
  // Senaryo: 1000 input token, 500 output token, 1200ms gecikme
  console.log('⏱️ AI yanıtı geldi! Token ve fiyat hesaplanıp log güncelleniyor...');
  await logRequestComplete(logId, provider, model, 1000, 500, 1200, true);

  console.log('🟢 İşlem tamam! 1000 input ve 500 output token GPT-4o fiyatlandırması üzerinden hesaplandı.');
  console.log('👀 Supabase panelinde "logs" tablosuna gidip "cost" (maliyet) sütununu kontrol edebilirsin!');
}

// Tüm testleri sırayla ve düzenli çalıştıran ana fonksiyon
async function runAllTests() {
  await runTests();
  await runRateLimitTest();
  runDomainTest(); // Bu zaten senkron çalışıyor
  await runLogTest();
}

runAllTests();