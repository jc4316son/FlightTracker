import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 5000; // 5 seconds

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check if error is retryable
const isRetryableError = (error: any) => {
  if (!error) return false;
  
  // Network errors
  if (error instanceof TypeError || !navigator.onLine) return true;
  
  // Check for specific error messages
  const retryableMessages = [
    'network error',
    'timeout',
    'connection refused',
    'socket hang up',
    'econnrefused',
    'etimedout',
    'failed to fetch'
  ];
  
  if (error.message && retryableMessages.some(msg => error.message.toLowerCase().includes(msg))) {
    return true;
  }
  
  // Check for specific Supabase error codes
  const retryableCodes = [
    'PGRST301', // Postgres connection timeout
    '503',      // Service unavailable
    '504',      // Gateway timeout
    '408',      // Request timeout
    '429',      // Too many requests
  ];
  
  return error.code && retryableCodes.includes(error.code);
};

// Create Supabase client with retry wrapper
const createClientWithRetry = () => {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: window.localStorage,
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-application-name': 'flight-tracker' },
    },
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
  });

  // Create a proxy to intercept the final execution
  const createRetryProxy = (target: any) => {
    return new Proxy(target, {
      get(target, prop) {
        // Get the original property
        const originalProp = target[prop];

        // If it's not a function or it's a special method, return as is
        if (typeof originalProp !== 'function' || prop === 'then') {
          return originalProp;
        }

        // Return a proxied function
        return async (...args: any[]) => {
          let lastError;
          let attempt = 0;

          while (attempt < MAX_RETRIES) {
            try {
              // Check for network connectivity
              if (!navigator.onLine) {
                await new Promise<void>((resolve) => {
                  const handleOnline = () => {
                    window.removeEventListener('online', handleOnline);
                    resolve();
                  };
                  window.addEventListener('online', handleOnline);
                });
              }

              // Execute the query
              const result = await originalProp.apply(target, args);

              if (result.error) {
                if (isRetryableError(result.error)) {
                  throw result.error;
                }
                return result;
              }

              return result;
            } catch (error: any) {
              lastError = error;

              if (attempt < MAX_RETRIES - 1 && isRetryableError(error)) {
                const delay = Math.min(
                  INITIAL_RETRY_DELAY * Math.pow(2, attempt),
                  MAX_RETRY_DELAY
                );

                console.warn(
                  `Retrying database operation, attempt ${attempt + 1}/${MAX_RETRIES}. ` +
                  `Waiting ${delay}ms. Error: ${error.message}`
                );

                await wait(delay);
                attempt++;
              } else {
                break;
              }
            }
          }

          // Format error message for user display
          const errorMessage = lastError?.message || 'An unknown error occurred';
          const formattedError = new Error(
            `Database operation failed: ${errorMessage}. Please check your connection and try again.`
          );

          return {
            data: null,
            error: formattedError
          };
        };
      }
    });
  };

  // Wrap the from method to return a proxied query builder
  const originalFrom = client.from.bind(client);
  client.from = (table: string) => {
    const builder = originalFrom(table);
    return createRetryProxy(builder);
  };

  return client;
};

export const supabase = createClientWithRetry();

// Add error event listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('supabase.auth.token');
  }
});

// Add online/offline handlers
window.addEventListener('online', () => {
  console.log('Connection restored');
});

window.addEventListener('offline', () => {
  console.warn('Connection lost');
});