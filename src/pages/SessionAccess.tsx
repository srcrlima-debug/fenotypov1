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
    console.log('=== SESSION ACCESS START (SessionAccess bridge) ===');
    console.log('sessionId:', sessionId);
    console.log('trainingIdFromQuery:', trainingIdFromQuery);

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
      // Se já veio com trainingId na URL, usamos direto
      let trainingId = trainingIdFromQuery || undefined;

      // Caso contrário, buscamos a sessão para descobrir o treinamento vinculado
      if (!trainingId) {
        console.log('[SessionAccess] Buscando sessão no banco para obter trainingId...');

        const { data: session, error } = await supabase
          .from('sessions')
          .select('id, training_id, nome')
          .eq('id', sessionId)
          .maybeSingle();

        console.log('[SessionAccess] Resposta do banco:', { session, error });

        if (error) {
          console.error('[SessionAccess] Erro ao buscar sessão:', error);
          await logAccess('session_not_found', { error: error.message, errorCode: error.code });
          toast.error('Sessão não encontrada. Verifique se o link está correto.');
          navigate('/');
          return;
        }

        if (!session || !session.training_id) {
          await logAccess('session_not_found', { error: 'No session or training_id', errorCode: 'NO_DATA' });
          toast.error('Sessão ou treinamento não encontrados.');
          navigate('/');
          return;
        }

        trainingId = session.training_id;
        await logAccess('session_found', { trainingId });
      }

      // Neste ponto temos sessionId + trainingId
      console.log('[SessionAccess] Redirecionando para TrainingAccess com sessão vinculada');
      await logAccess('redirect_to_training_access', { trainingId });

      const params = new URLSearchParams();
      params.set('sessionId', sessionId);
      params.set('trainingId', trainingId!);

      navigate(`/training/${trainingId}/acesso?${params.toString()}`);
    } catch (error: any) {
      console.error('[SessionAccess] Exceção:', error);
      await logAccess('exception', { error: error.message, errorCode: 'EXCEPTION' });
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
