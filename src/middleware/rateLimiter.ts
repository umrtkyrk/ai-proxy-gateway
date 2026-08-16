import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * Checks the rate limit for a specific client.
 * @param clientId The ID of the client making the request
 * @param limit Maximum allowed requests
 * @param windowSeconds Time window in seconds
 */
export async function checkRateLimit(clientId: string, limit: number = 60, windowSeconds: number = 60) {
  try {
    const currentWindow = Math.floor(Date.now() / (windowSeconds * 1000));
    const key = `ratelimit:req:${clientId}:${currentWindow}`;

    const requestCount = await redis.incr(key);

    if (requestCount === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (requestCount > limit) {
      return {
        success: false,
        status: 429, 
        error: 'Too Many Requests: Rate limit exceeded. Please try again later.'
      };
    }

    return {
      success: true,
      remaining: limit - requestCount
    };

  } catch (error) {
    console.error('Redis Rate Limit Error:', error);
    return { success: true }; // Fail-open logic
  }
}