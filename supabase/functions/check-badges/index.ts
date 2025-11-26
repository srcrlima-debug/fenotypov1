import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgeCheckRequest {
  userId: string;
  sessionId?: string;
  action: 'first_evaluation' | 'complete_session' | 'complete_tutorial' | 'send_feedback' | 'check_all';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, sessionId, action }: BadgeCheckRequest = await req.json();

    console.log(`Checking badges for user ${userId}, action: ${action}`);

    // Buscar badges definitions
    const { data: badgeDefinitions, error: badgeDefError } = await supabase
      .from('badge_definitions')
      .select('*');

    if (badgeDefError) throw badgeDefError;

    // Buscar badges já conquistados
    const { data: userBadges, error: userBadgesError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    if (userBadgesError) throw userBadgesError;

    const earnedBadgeIds = new Set((userBadges || []).map(ub => ub.badge_id));
    const newBadges = [];

    // Verificar badges baseado na ação
    for (const badgeDef of badgeDefinitions || []) {
      if (earnedBadgeIds.has(badgeDef.id)) continue;

      let shouldAward = false;

      // Primeira Avaliação
      if (badgeDef.nome.includes('Primeira Avaliação') && action === 'first_evaluation') {
        const { count } = await supabase
          .from('avaliacoes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        shouldAward = count === 1;
      }

      // Iniciante (5 avaliações)
      if (badgeDef.nome.includes('Iniciante') && action === 'check_all') {
        const { count } = await supabase
          .from('avaliacoes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        shouldAward = (count ?? 0) >= 5;
      }

      // Avaliador Regular (10 avaliações)
      if (badgeDef.nome.includes('Avaliador Regular') && action === 'check_all') {
        const { count } = await supabase
          .from('avaliacoes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        shouldAward = (count ?? 0) >= 10;
      }

      // Especialista (20 avaliações)
      if (badgeDef.nome.includes('Especialista') && action === 'check_all') {
        const { count } = await supabase
          .from('avaliacoes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        shouldAward = (count ?? 0) >= 20;
      }

      // Mestre Avaliador (30 avaliações)
      if (badgeDef.nome.includes('Mestre Avaliador') && action === 'check_all') {
        const { count } = await supabase
          .from('avaliacoes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        shouldAward = (count ?? 0) >= 30;
      }

      // Sessão Completa
      if (badgeDef.nome.includes('Sessão Completa') && action === 'complete_session' && sessionId) {
        shouldAward = true;
      }

      // Tutorial Completo
      if (badgeDef.nome.includes('Explorador') && action === 'complete_tutorial') {
        shouldAward = true;
      }

      // Comunicativo (feedback)
      if (badgeDef.nome.includes('Comunicativo') && action === 'send_feedback') {
        shouldAward = true;
      }

      // Relâmpago (tempo < 20 minutos)
      if (badgeDef.nome.includes('Relâmpago') && action === 'complete_session' && sessionId) {
        const { data: avaliacoes } = await supabase
          .from('avaliacoes')
          .select('tempo_gasto')
          .eq('user_id', userId)
          .eq('session_id', sessionId);

        if (avaliacoes) {
          const totalTime = avaliacoes.reduce((sum, a) => sum + a.tempo_gasto, 0);
          shouldAward = totalTime < 1200; // 20 minutos em segundos
        }
      }

      // Dedicado (3 sessões)
      if (badgeDef.nome.includes('Dedicado') && action === 'check_all') {
        const { data: sessions } = await supabase
          .from('avaliacoes')
          .select('session_id')
          .eq('user_id', userId);

        const uniqueSessions = new Set(sessions?.map(s => s.session_id));
        shouldAward = uniqueSessions.size >= 3;
      }

      // Veterano (5 sessões)
      if (badgeDef.nome.includes('Veterano') && action === 'check_all') {
        const { data: sessions } = await supabase
          .from('avaliacoes')
          .select('session_id')
          .eq('user_id', userId);

        const uniqueSessions = new Set(sessions?.map(s => s.session_id));
        shouldAward = uniqueSessions.size >= 5;
      }

      // Perfil Completo
      if (badgeDef.nome.includes('Perfil Completo') && action === 'check_all') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (profile) {
          shouldAward = !!(
            profile.genero &&
            profile.faixa_etaria &&
            profile.estado &&
            profile.pertencimento_racial &&
            profile.experiencia_bancas
          );
        }
      }

      // Atribuir badge se merecido
      if (shouldAward) {
        const { error: insertError } = await supabase
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: badgeDef.id,
            session_id: sessionId || null,
          });

        if (!insertError || insertError.code === '23505') {
          newBadges.push({
            id: badgeDef.id,
            nome: badgeDef.nome,
            descricao: badgeDef.descricao,
            icone: badgeDef.icone,
          });
        }
      }
    }

    console.log(`Awarded ${newBadges.length} new badges`);

    return new Response(
      JSON.stringify({
        success: true,
        newBadges,
        message: `${newBadges.length} nova(s) conquista(s) desbloqueada(s)!`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking badges:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
