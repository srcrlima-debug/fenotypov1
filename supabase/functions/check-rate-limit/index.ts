import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for',
};

interface RateLimitRequest {
  endpoint: string;
  maxRequests?: number;
  windowMinutes?: number;
}

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obter IP do cliente
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    // Criar cliente Supabase com service role (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Tentar obter user_id do JWT (se autenticado)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );

      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // Parse request body
    const body: RateLimitRequest = await req.json();
    const { endpoint, maxRequests = 10, windowMinutes = 1 } = body;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Rate limit check for endpoint: ${endpoint}, user: ${userId}, ip: ${ipAddress}`);

    // Calcular janela de tempo
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

    // Buscar logs recentes para este user/IP + endpoint
    let query = supabaseAdmin
      .from('rate_limit_log')
      .select('*')
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1);

    // Priorizar busca por user_id (se autenticado), senão por IP
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('ip_address', ipAddress).is('user_id', null);
    }

    const { data: existingLogs, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching rate limit logs:', fetchError);
      throw fetchError;
    }

    const existingLog = existingLogs?.[0];

    // Se existe log na janela atual
    if (existingLog) {
      const requestCount = existingLog.request_count;

      // Se excedeu o limite
      if (requestCount >= maxRequests) {
        const resetAt = new Date(existingLog.window_start);
        resetAt.setMinutes(resetAt.getMinutes() + windowMinutes);

        const response: RateLimitResponse = {
          allowed: false,
          remaining: 0,
          resetAt: resetAt.toISOString(),
          message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMinutes} minute(s). Try again after ${resetAt.toLocaleString()}`
        };

        console.log('Rate limit exceeded:', response);

        return new Response(
          JSON.stringify(response),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Incrementar contador
      const { error: updateError } = await supabaseAdmin
        .from('rate_limit_log')
        .update({ 
          request_count: requestCount + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLog.id);

      if (updateError) {
        console.error('Error updating rate limit log:', updateError);
        throw updateError;
      }

      const resetAt = new Date(existingLog.window_start);
      resetAt.setMinutes(resetAt.getMinutes() + windowMinutes);

      const response: RateLimitResponse = {
        allowed: true,
        remaining: maxRequests - (requestCount + 1),
        resetAt: resetAt.toISOString()
      };

      console.log('Rate limit check passed:', response);

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar novo log (primeira requisição na janela)
    const { error: insertError } = await supabaseAdmin
      .from('rate_limit_log')
      .insert({
        user_id: userId,
        ip_address: ipAddress,
        endpoint: endpoint,
        request_count: 1,
        window_start: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting rate limit log:', insertError);
      throw insertError;
    }

    const resetAt = new Date();
    resetAt.setMinutes(resetAt.getMinutes() + windowMinutes);

    const response: RateLimitResponse = {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: resetAt.toISOString()
    };

    console.log('First request in window:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Rate limit check error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});