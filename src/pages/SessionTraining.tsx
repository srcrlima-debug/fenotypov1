import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getImageByPage } from '@/data/images';
import { ImageOff, Clock } from 'lucide-react';

interface SessionData {
  id: string;
  nome: string;
  data: string;
}

const SessionTraining = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [hasParticipated, setHasParticipated] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  const totalPages = 30;
  const progress = (currentPage / totalPages) * 100;
  const currentImage = getImageByPage(currentPage);

  useEffect(() => {
    const validateSession = async () => {
      if (!sessionId || !user) {
        navigate('/');
        return;
      }

      // Check if session exists
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        toast({
          title: 'Sessão não encontrada',
          description: 'Esta sessão não existe ou foi removida',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setSession(sessionData);

      // Check if user already participated
      const { data: participationData } = await supabase
        .from('avaliacoes')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .limit(1);

      if (participationData && participationData.length > 0) {
        setHasParticipated(true);
        toast({
          title: 'Avaliação já realizada',
          description: 'Você já participou desta sessão',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setLoading(false);
    };

    validateSession();
  }, [sessionId, user, navigate, toast]);

  useEffect(() => {
    // Disable browser back button
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // Reset timer when page changes
    setStartTime(Date.now());
    setTimerKey(prev => prev + 1);
  }, [currentPage]);

  const saveAvaliacao = async (resposta: string, retryCount = 0): Promise<boolean> => {
    if (!user || !sessionId) return false;

    const tempoGasto = Math.floor((Date.now() - startTime) / 1000);

    try {
      // Buscar dados do perfil do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('genero, faixa_etaria, estado')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
      }

      const { error } = await supabase
        .from('avaliacoes')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          foto_id: currentPage,
          resposta,
          tempo_gasto: tempoGasto,
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao salvar avaliação:', error);
      
      // Retry automático até 3 tentativas
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return saveAvaliacao(resposta, retryCount + 1);
      }

      toast({
        title: 'Erro ao salvar avaliação',
        description: 'Não foi possível salvar sua resposta. Por favor, tente novamente.',
        variant: 'destructive',
      });
      
      return false;
    }
  };

  const handleDecision = async (decision: string) => {
    const success = await saveAvaliacao(decision);

    if (success) {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      } else {
        toast({
          title: 'Treinamento Concluído!',
          description: 'Obrigado por participar',
        });
        navigate('/');
      }
    }
  };

  const handleTimeComplete = () => {
    handleDecision('NÃO_RESPONDIDO');
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

  if (hasParticipated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-foreground">{session?.nome}</h2>
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-8">
          {/* Timer */}
          <div className="flex justify-center">
            <CountdownCircleTimer
              key={timerKey}
              isPlaying
              duration={60}
              colors={['#10b981', '#f59e0b', '#ef4444']}
              colorsTime={[60, 30, 0]}
              size={120}
              strokeWidth={8}
              onComplete={handleTimeComplete}
            >
              {({ remainingTime }) => (
                <div className="text-center">
                  <Clock className="h-6 w-6 mx-auto mb-1 text-foreground" />
                  <div className="text-2xl font-bold text-foreground">{remainingTime}s</div>
                </div>
              )}
            </CountdownCircleTimer>
          </div>

          {/* Image */}
          <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
            {currentImage ? (
              <img
                src={currentImage.imageUrl}
                alt={currentImage.nome}
                className="w-full h-auto max-h-[500px] object-contain rounded"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className="hidden flex-col items-center justify-center py-16 text-muted-foreground">
              <ImageOff className="h-16 w-16 mb-4" />
              <p>Imagem não disponível</p>
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleDecision('DEFERIDO')}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground h-16 text-lg font-semibold"
            >
              DEFERIDO
            </Button>
            <Button
              onClick={() => handleDecision('INDEFERIDO')}
              size="lg"
              variant="destructive"
              className="h-16 text-lg font-semibold"
            >
              INDEFERIDO
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTraining;
