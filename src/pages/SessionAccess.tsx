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
      // SEMPRE buscar trainingId do URL primeiro (não depende de auth)
      let trainingId = trainingIdFromQuery;

      // Se não tem trainingId na URL, buscar da sessão (agora permitido para anon)
      if (!trainingId) {
        const { data: session, error } = await supabase
          .from('sessions')
          .select('id, training_id, nome')
          .eq('id', sessionId)
          .single();

        console.log('Session lookup:', { session, error });

        if (error || !session) {
          console.error('Sessão não encontrada:', error);
          toast.error('Sessão não encontrada. Verifique se o link está correto.');
          navigate('/');
          return;
        }

        trainingId = session.training_id;
      }

      if (!trainingId) {
        toast.error('Treinamento não vinculado a esta sessão');
        navigate('/');
        return;
      }

      // Se não logado, vai para registro
      if (!user) {
        navigate(`/training/register?trainingId=${trainingId}&sessionId=${sessionId}`);
        return;
      }

      // Se logado, verificar participação
      const { data: participant } = await supabase
        .from('training_participants')
        .select('id')
        .eq('training_id', trainingId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!participant) {
        navigate(`/training/register?trainingId=${trainingId}&sessionId=${sessionId}`);
        return;
      }

      // Usuário registrado, vai para antessala
      navigate(`/antessala?sessionId=${sessionId}&trainingId=${trainingId}`);
    } catch (error: any) {
      console.error('Erro no acesso à sessão:', error);
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
