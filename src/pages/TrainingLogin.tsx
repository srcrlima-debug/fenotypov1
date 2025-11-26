import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionNavigation } from '@/hooks/useSessionNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TrainingLogin() {
  const { trainingId: trainingIdFromUrl } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  
  const {
    sessionId,
    trainingId: trainingIdFromHook,
    isValidSessionId,
    navigateWithSession,
    logAccess
  } = useSessionNavigation({
    autoRedirectIfAuthenticated: false, // Disabled to allow login
    antessalaPath: '/antessala'
  });

  const redirectUrl = searchParams.get('redirect');
  const trainingIdFromQuery = searchParams.get('trainingId');
  const finalTrainingId = trainingIdFromHook || trainingIdFromUrl || trainingIdFromQuery;

  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Validar sessionId se presente
  useEffect(() => {
    if (sessionId && !isValidSessionId) {
      toast.error('Link de acesso inválido. Solicite um novo link ao administrador.');
      logAccess('invalid_sessionid_on_login', { 
        error: 'Invalid UUID format',
        trainingId: finalTrainingId 
      });
    }
  }, [sessionId, isValidSessionId, logAccess, finalTrainingId]);

  useEffect(() => {
    if (finalTrainingId) {
      loadTraining();
    }
  }, [finalTrainingId]);

  useEffect(() => {
    if (authLoading) return; // Aguardar auth carregar!
    
    if (user && finalTrainingId) {
      checkParticipation();
    }
  }, [user, finalTrainingId, authLoading]);

  const loadTraining = async () => {
    if (!finalTrainingId) return;

    try {
      const { data, error } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', finalTrainingId)
        .single();

      if (error) throw error;
      setTraining(data);
    } catch (error) {
      console.error('Error loading training:', error);
      toast.error('Treinamento não encontrado');
      navigate('/');
    }
  };

  const checkParticipation = async () => {
    if (!user || !finalTrainingId) return;

    try {
      const { data, error } = await supabase
        .from('training_participants')
        .select('*')
        .eq('training_id', finalTrainingId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.info('Você precisa se cadastrar neste treinamento primeiro');
        await navigateWithSession(`/training/register`, {
          additionalParams: finalTrainingId ? { trainingId: finalTrainingId } : {}
        });
        return;
      }

      // If there's a redirect URL, use it
      if (redirectUrl) {
        navigate(redirectUrl);
        return;
      }

      await navigateWithSession('/antessala', {
        additionalParams: finalTrainingId ? { trainingId: finalTrainingId } : {}
      });
    } catch (error) {
      console.error('Error checking participation:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!finalTrainingId) {
        toast.error('ID do treinamento não encontrado');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else {
          throw error;
        }
        return;
      }

      // Get session to confirm user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error('Erro ao obter sessão');
        return;
      }

      toast.success('Login realizado com sucesso!');

      // Check participation directly
      const { data: participant } = await supabase
        .from('training_participants')
        .select('*')
        .eq('training_id', finalTrainingId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!participant) {
        toast.info('Você precisa se cadastrar neste treinamento primeiro');
        await navigateWithSession(`/training/register`, {
          additionalParams: finalTrainingId ? { trainingId: finalTrainingId } : {}
        });
        return;
      }

      // Redirect directly
      if (redirectUrl) {
        navigate(redirectUrl);
      } else {
        await navigateWithSession('/antessala', {
          additionalParams: finalTrainingId ? { trainingId: finalTrainingId } : {}
        });
      }
      
    } catch (error: any) {
      console.error('Error during login:', error);
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Login - {training?.nome}</CardTitle>
          <CardDescription>
            {training?.data && `Data: ${new Date(training.data).toLocaleDateString('pt-BR')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="text-center text-sm space-y-2">
              <p className="text-muted-foreground">
                Não possui cadastro?{' '}
                <button
                  type="button"
                  onClick={() => navigateWithSession(`/training/register`, {
                    additionalParams: finalTrainingId ? { trainingId: finalTrainingId } : {}
                  })}
                  className="text-primary hover:underline"
                >
                  Cadastre-se
                </button>
              </p>
              <p className="text-muted-foreground">
                <Link to="/forgot-password" className="text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
