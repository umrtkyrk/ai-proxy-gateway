// Bu dosya, "localhost" ve "127.0.0.1" adreslerini, hangi porttan
// gelirse gelsin tanıyan basit bir yardımcı fonksiyon içerir.
// wf-ortak.md'nin "yerel geliştirme süreçlerini aksatmama" kuralına göre yazıldı.

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1'];

export function isLocalOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    // url.hostname, port bilgisini içermez (örn. "localhost:3001" -> "localhost")
    // bu sayede hangi portu kullanırsak kullanalım, doğru şekilde tanıyoruz.
    return LOCAL_HOSTNAMES.includes(url.hostname);
  } catch {
    return false;
  }
}