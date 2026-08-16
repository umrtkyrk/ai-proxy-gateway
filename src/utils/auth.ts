import crypto from 'crypto';

/**
 * Generates a new Proxy API Key.
 * Example Output: sk-proxy-8f7b...
 */
export function generateProxyKey(): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `sk-proxy-${randomBytes}`;
}

/**
 * Hashes the provided API key with SHA-256 for secure database storage.
 * @param apiKey The plain text API key (e.g., sk-proxy-...)
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}