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
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TrainingLogin() {
  const { trainingId: trainingIdFromUrl } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  
  const {
    sessionId,
    trainingId: trainingIdFromHook,
    isValidSessionId,
    logAccess
  } = useSessionNavigation({
    autoRedirectIfAuthenticated: false,
    antessalaPath: '/antessala'
  });

  const redirectUrl = searchParams.get('redirect');
  const trainingIdFromQuery = searchParams.get('trainingId');
  const finalTrainingId = trainingIdFromHook || trainingIdFromUrl || trainingIdFromQuery;

  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);

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

  // Carregar treinamento
  useEffect(() => {
    if (finalTrainingId) {
      loadTraining();
    }
  }, [finalTrainingId]);

  // Validar email
  const validateEmail = (value: string) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setEmailValid(isValid);
    return isValid;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    validateEmail(value);
  };

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
    }
  };

  const checkParticipationForUser = async (userId: string) => {
    if (!finalTrainingId) return;

    try {
      const { data, error } = await supabase
        .from('training_participants')
        .select('*')
        .eq('training_id', finalTrainingId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.info('Você precisa se cadastrar neste treinamento primeiro');
        navigate(`/training/${finalTrainingId}/register?sessionId=${sessionId}&trainingId=${finalTrainingId}`);
        return;
      }

      if (!sessionId || !finalTrainingId) {
        toast.error('Erro: Parâmetros de sessão ausentes. Redirecionando para página do treinamento.');
        navigate(`/training/${finalTrainingId}`);
        return;
      }

      const params = new URLSearchParams();
      params.set('sessionId', sessionId);
      params.set('trainingId', finalTrainingId);

      if (redirectUrl) {
        const redirectParams = new URLSearchParams();
        redirectParams.set('sessionId', sessionId);
        redirectParams.set('trainingId', finalTrainingId);
        
        const urlWithParams = redirectUrl.includes('?') 
          ? `${redirectUrl}&${redirectParams.toString()}` 
          : `${redirectUrl}?${redirectParams.toString()}`;
        
        navigate(urlWithParams);
        return;
      }

      navigate(`/antessala?${params.toString()}`);
    } catch (error) {
      console.error('Erro ao verificar participação:', error);
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

      const { data, error } = await supabase.auth.signInWithPassword({
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

      if (!data.session?.user) {
        toast.error('Erro ao obter sessão após login');
        return;
      }

      toast.success('Login realizado com sucesso!');
      await checkParticipationForUser(data.session.user.id);
      
    } catch (error: any) {
      console.error('Erro durante login:', error);
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user || !finalTrainingId) return;
    checkParticipationForUser(user.id);
  }, [user, finalTrainingId, authLoading]);

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
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className={cn(
                    "bg-muted/30 border-border",
                    emailValid && "border-green-500"
                  )}
                />
                {emailValid && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="bg-muted/30 border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[hsl(20,70%,65%)] hover:bg-[hsl(20,70%,55%)] text-white relative" 
              disabled={loading}
            >
              {loading && (
                <div className="absolute left-4">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="text-center text-sm space-y-2">
              <p className="text-muted-foreground">
                Não possui cadastro?{' '}
                <button
                  type="button"
                  onClick={() => navigate(`/training/signup?sessionId=${sessionId}&trainingId=${finalTrainingId}`)}
                  className="text-primary hover:underline font-medium"
                >
                  Criar conta
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
