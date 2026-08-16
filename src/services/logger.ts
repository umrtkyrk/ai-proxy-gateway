import { supabase } from './db';
import pricingData from '../model_pricing.json';

// JSON dosyasındaki fiyatları TypeScript'in anlaması için tiplendiriyoruz
type PricingMap = Record<string, { input: number; output: number }>;
const pricing: PricingMap = pricingData;

/**
 * AI isteği ilk başladığında 'pending' (bekliyor) durumunda bir kayıt açar.
 */
export async function logRequestStart(clientId: string, provider: string, model: string) {
  try {
    const { data, error } = await supabase
      .from('logs')
      .insert([{
        client_id: clientId,
        provider: provider,
        model: model,
        status: 'pending'
      }])
      .select('id')
      .single();

    if (error) throw error;
    return data.id; // Oluşan log'un ID'sini döndürürüz ki bitince güncelleyebilelim
  } catch (error) {
    console.error('Log başlatma hatası:', error);
    return null;
  }
}

/**
 * AI yanıt verdiğinde, asenkron olarak token ve maliyet bilgilerini günceller.
 */
export async function logRequestComplete(
  logId: string, 
  provider: string, 
  model: string, 
  inputTokens: number, 
  outputTokens: number, 
  latencyMs: number,
  isSuccess: boolean = true
) {
  try {
    // 1. Maliyeti (Cost) Hesapla
    const modelKey = `${provider}/${model}`;
    const modelPricing = pricing[modelKey];
    let totalCost = 0;

    if (modelPricing) {
      // Fiyatlar genellikle 1000 token başına verilir, bu yüzden 1000'e bölüyoruz
      const inputCost = (inputTokens / 1000) * modelPricing.input;
      const outputCost = (outputTokens / 1000) * modelPricing.output;
      totalCost = inputCost + outputCost;
    }

    // 2. Veritabanındaki 'pending' kaydını güncelle
    const { error } = await supabase
      .from('logs')
      .update({
        status: isSuccess ? 'success' : 'error',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost: totalCost,
        latency_ms: latencyMs,
        completed_at: new Date().toISOString()
      })
      .eq('id', logId);

    if (error) throw error;
    
  } catch (error) {
    console.error('Log güncelleme hatası:', error);
  }
}