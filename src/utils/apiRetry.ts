/**
 * Utility for retrying API calls with exponential backoff
 * Specifically designed to handle JWT token availability issues during initial auth
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 500,
  maxDelay: 5000,
  backoffFactor: 2,
  shouldRetry: (error) => {
    // Retry on 401 (unauthorized) which indicates JWT not ready
    // Also retry on network errors
    if (error.response?.status === 401) return true;
    if (error.code === 'ECONNABORTED') return true;
    if (error.code === 'ENOTFOUND') return true;
    if (!error.response) return true; // Network error
    return false;
  }
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
        throw error;
      }

      // Log retry attempt (only in development)
      if (import.meta.env.DEV) {
        console.log(`[API Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${delay}ms...`);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Specialized retry function for JWT-dependent API calls
 * Silently retries 401 errors without logging them as errors
 */
export async function retryWithJWT<T>(
  fn: () => Promise<T>,
  maxWaitTime: number = 10000
): Promise<T | null> {
  const startTime = Date.now();
  let attempt = 0;
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      return await fn();
    } catch (error: any) {
      // If it's a 401, the JWT might not be ready yet
      if (error.response?.status === 401) {
        attempt++;
        
        // Calculate delay with exponential backoff
        const delay = Math.min(500 * Math.pow(1.5, attempt), 3000);
        
        // Don't log as error, just as debug info
        if (import.meta.env.DEV && attempt === 1) {
          console.debug('[API] Waiting for JWT token to be available...');
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  // If we exceeded max wait time, return null instead of throwing
  console.warn('[API] JWT token not available within timeout period');
  return null;
}