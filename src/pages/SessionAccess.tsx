import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function SessionAccess() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const trainingIdFromQuery = searchParams.get('trainingId');

  useEffect(() => {
    handleSessionAccess();
  }, [sessionId, user, trainingIdFromQuery]);

  const handleSessionAccess = async () => {
    if (!sessionId) {
      toast.error('ID da sessão não encontrado');
      navigate('/');
      return;
    }

    try {
      let trainingId = trainingIdFromQuery;

      // Se o link não tiver trainingId, tentamos buscar apenas se o usuário já estiver logado
      if (!trainingId && user) {
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('id, training_id, nome')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session) {
          console.error('Erro ao carregar sessão:', sessionError);
          toast.error('Sessão não encontrada');
          navigate('/');
          return;
        }

        if (!session.training_id) {
          toast.error('Sessão sem treinamento vinculado');
          navigate('/');
          return;
        }

        trainingId = session.training_id;
      }

      if (!trainingId) {
        toast.error('Treinamento não encontrado para esta sessão');
        navigate('/');
        return;
      }

      // Se usuário não está logado, redireciona direto para o cadastro
      if (!user) {
        navigate(`/training/register?trainingId=${trainingId}&sessionId=${sessionId}`);
        return;
      }

      // Verifica se usuário já está registrado neste treinamento
      const { data: participant, error: participantError } = await supabase
        .from('training_participants')
        .select('id')
        .eq('training_id', trainingId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (participantError) {
        console.error('Error checking participant:', participantError);
      }

      // Se não está registrado, redireciona para registro
      if (!participant) {
        navigate(`/training/register?trainingId=${trainingId}&sessionId=${sessionId}`);
        return;
      }

      // Usuário já está registrado, vai para antessala com sessionId e trainingId
      navigate(`/antessala?sessionId=${sessionId}&trainingId=${trainingId}`);
    } catch (error: any) {
      console.error('Error in session access:', error);
      toast.error('Erro ao acessar sessão');
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
