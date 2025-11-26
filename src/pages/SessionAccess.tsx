import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useSessionNavigation } from '@/hooks/useSessionNavigation';

export default function SessionAccess() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const trainingIdFromQuery = searchParams.get('trainingId');

  const {
    validateSessionId,
    isValidSessionId,
    logAccess,
    authLoading
  } = useSessionNavigation();

  // CORREÇÃO CRÍTICA: Aguardar auth carregar antes de processar!
  useEffect(() => {
    if (authLoading) {
      console.log('[SessionAccess] Aguardando autenticação carregar...');
      return;
    }
    
    handleSessionAccess();
  }, [sessionId, user, trainingIdFromQuery, authLoading]);

  const handleSessionAccess = async () => {
    console.log('=== SESSION ACCESS START ===');
    console.log('sessionId:', sessionId);
    console.log('trainingIdFromQuery:', trainingIdFromQuery);
    console.log('user:', user?.id || 'NOT_LOGGED_IN');
    console.log('authLoading:', authLoading);
    
    await logAccess('started', { trainingId: trainingIdFromQuery || undefined });

    if (!sessionId) {
      await logAccess('error', { error: 'sessionId missing', errorCode: 'MISSING_SESSION_ID' });
      toast.error('ID da sessão não encontrado');
      navigate('/');
      return;
    }

    // Validar formato UUID
    if (!validateSessionId(sessionId)) {
      await logAccess('error', { error: 'sessionId invalid format', errorCode: 'INVALID_UUID' });
      toast.error('Link de acesso inválido. O formato do ID da sessão está incorreto.');
      navigate('/');
      return;
    }

    try {
      let trainingId = trainingIdFromQuery;

      // Se não tem trainingId na URL, buscar da sessão
      if (!trainingId) {
        console.log('[SessionAccess] Buscando trainingId da sessão no banco...');
        
        const { data: session, error } = await supabase
          .from('sessions')
          .select('id, training_id, nome')
          .eq('id', sessionId)
          .single();

        console.log('[SessionAccess] Resposta do banco:', { session, error });

        if (error) {
          console.error('[SessionAccess] Erro do banco:', error);
          await logAccess('session_not_found', { 
            error: error.message, 
            errorCode: error.code 
          });
          toast.error('Sessão não encontrada. Verifique se o link está correto.');
          navigate('/');
          return;
        }

        if (!session) {
          await logAccess('session_not_found', { 
            error: 'No session data', 
            errorCode: 'NO_DATA' 
          });
          toast.error('Sessão não encontrada.');
          navigate('/');
          return;
        }

        await logAccess('session_found', { trainingId: session.training_id });
        trainingId = session.training_id;
      } else {
        await logAccess('trainingid_from_url', { trainingId });
      }

      if (!trainingId) {
        await logAccess('error', { 
          error: 'No trainingId', 
          errorCode: 'MISSING_TRAINING_ID' 
        });
        toast.error('Treinamento não vinculado a esta sessão');
        navigate('/');
        return;
      }

      // Se não logado, vai para registro
      if (!user) {
        await logAccess('redirecting_to_register', { trainingId });
        console.log('[SessionAccess] Usuário não autenticado, redirecionando para registro');
        navigate(`/training/register?trainingId=${trainingId}&sessionId=${sessionId}`);
        return;
      }

      // Se logado, verificar participação
      console.log('[SessionAccess] Verificando participação do usuário...');
      await logAccess('checking_participation', { trainingId });

      const { data: participant, error: participantError } = await supabase
        .from('training_participants')
        .select('id')
        .eq('training_id', trainingId)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[SessionAccess] Resultado da verificação:', { participant, participantError });

      if (!participant) {
        await logAccess('user_not_participant', { trainingId });
        console.log('[SessionAccess] Usuário não é participante, redirecionando para registro');
        navigate(`/training/register?trainingId=${trainingId}&sessionId=${sessionId}`);
        return;
      }

      // Usuário registrado, vai para antessala
      await logAccess('redirecting_to_antessala', { trainingId });
      console.log('[SessionAccess] Usuário é participante, redirecionando para antessala');
      navigate(`/antessala?sessionId=${sessionId}&trainingId=${trainingId}`);
    } catch (error: any) {
      console.error('[SessionAccess] Exceção:', error);
      await logAccess('exception', { 
        error: error.message, 
        errorCode: 'EXCEPTION' 
      });
      toast.error('Erro ao processar acesso. Tente novamente.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  return null;
}
