// GEÇİCİ: Gerçek veritabanı hazır olana kadar, hangi Client'ın hangi
// modele erişebileceğini burada sabit bir listede tutuyoruz.
// Umur'un veritabanı hazır olduğunda, bu listenin yerini gerçek bir
// sorgu alacak — fonksiyonun dışarıya verdiği "cevap" aynı kalacak,
// sadece içindeki kaynak değişecek.
const MOCK_CLIENT_MODEL_ACCESS: Record<string, string[]> = {
  'demo-client': ['gpt-4o-mini', 'gemini-pro', 'claude-opus-4']
};

export function isModelAllowed(clientId: string, model: string): boolean {
  const allowedModels = MOCK_CLIENT_MODEL_ACCESS[clientId];
  if (!allowedModels) return false;
  return allowedModels.includes(model);
}