import { supabase } from './db';
import pricingData from '../model_pricing.json';

type PricingMap = Record<string, { input: number; output: number }>;
const pricing: PricingMap = pricingData;

/**
 * Creates a 'pending' log entry when an AI request starts.
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
    return data.id; 
  } catch (error) {
    console.error('Error starting log:', error);
    return null;
  }
}

/**
 * Asynchronously updates the log with token usage and cost when the AI responds.
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
    const modelKey = `${provider}/${model}`;
    const modelPricing = pricing[modelKey];
    let totalCost = 0;

    if (modelPricing) {
      const inputCost = (inputTokens / 1000) * modelPricing.input;
      const outputCost = (outputTokens / 1000) * modelPricing.output;
      totalCost = inputCost + outputCost;
    }

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
    console.error('Error updating log:', error);
  }
}