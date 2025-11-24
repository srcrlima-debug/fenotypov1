import { supabase } from "@/integrations/supabase/client";

export interface RateLimitOptions {
  endpoint: string;
  maxRequests?: number;
  windowMinutes?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  message?: string;
}

/**
 * Verifica rate limiting server-side antes de executar operações críticas
 * 
 * @param options - Configurações de rate limiting
 * @returns Resultado da verificação de rate limit
 * 
 * @example
 * ```typescript
 * const result = await checkRateLimit({
 *   endpoint: 'submit-avaliacao',
 *   maxRequests: 30,
 *   windowMinutes: 1
 * });
 * 
 * if (!result.allowed) {
 *   toast.error(result.message || 'Rate limit exceeded');
 *   return;
 * }
 * 
 * // Prosseguir com a operação
 * await submitAvaliacao(data);
 * ```
 */
export const checkRateLimit = async (
  options: RateLimitOptions
): Promise<RateLimitResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-rate-limit', {
      body: {
        endpoint: options.endpoint,
        maxRequests: options.maxRequests || 10,
        windowMinutes: options.windowMinutes || 1,
      },
    });

    if (error) {
      console.error('Rate limit check error:', error);
      
      // Em caso de erro, permitir a operação (fail-open) mas logar
      return {
        allowed: true,
        remaining: 0,
        resetAt: new Date().toISOString(),
        message: 'Rate limit check failed, allowing request',
      };
    }

    return data as RateLimitResult;
  } catch (error) {
    console.error('Rate limit check exception:', error);
    
    // Em caso de erro, permitir a operação (fail-open) mas logar
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date().toISOString(),
      message: 'Rate limit check exception, allowing request',
    };
  }
};

/**
 * Wrapper para executar uma operação com rate limiting
 * 
 * @param options - Configurações de rate limiting
 * @param operation - Função assíncrona a ser executada se rate limit permitir
 * @returns Resultado da operação ou null se rate limit bloqueou
 * 
 * @example
 * ```typescript
 * const result = await withRateLimit(
 *   { endpoint: 'submit-feedback', maxRequests: 5, windowMinutes: 1 },
 *   async () => {
 *     return await submitFeedback(data);
 *   }
 * );
 * 
 * if (result === null) {
 *   // Rate limit bloqueou a operação
 *   return;
 * }
 * 
 * // Operação executada com sucesso
 * console.log('Result:', result);
 * ```
 */
export const withRateLimit = async <T>(
  options: RateLimitOptions,
  operation: () => Promise<T>
): Promise<T | null> => {
  const rateLimitResult = await checkRateLimit(options);

  if (!rateLimitResult.allowed) {
    console.warn('Rate limit exceeded:', rateLimitResult.message);
    return null;
  }

  return await operation();
};