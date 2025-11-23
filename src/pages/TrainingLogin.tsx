import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TrainingLogin() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadTraining();
  }, [trainingId]);

  useEffect(() => {
    if (user && trainingId) {
      checkParticipation();
    }
  }, [user, trainingId]);

  const loadTraining = async () => {
    if (!trainingId) return;

    try {
      const { data, error } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', trainingId)
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
    if (!user || !trainingId) return;

    try {
      const { data, error } = await supabase
        .from('training_participants')
        .select('*')
        .eq('training_id', trainingId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.info('Você precisa se cadastrar neste treinamento primeiro');
        navigate(`/training/${trainingId}/register`);
        return;
      }

      // Check for active session
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('training_id', trainingId)
        .in('session_status', ['waiting', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        navigate(`/training/${trainingId}/session/${sessionData.id}/antessala`);
      } else {
        toast.info('Aguardando início do treinamento');
      }
    } catch (error) {
      console.error('Error checking participation:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      toast.success('Login realizado com sucesso!');
      // checkParticipation will be called by useEffect
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="text-center text-sm space-y-2">
              <p className="text-muted-foreground">
                Não possui cadastro?{' '}
                <Link to={`/training/${trainingId}/register`} className="text-primary hover:underline">
                  Cadastre-se
                </Link>
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
