import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Clock, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Training {
  id: string;
  nome: string;
  data: string;
  descricao: string | null;
  status: string;
}

interface Session {
  id: string;
  nome: string;
  session_status: string;
  training_id: string;
}

export default function TrainingAccess() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState<Training | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  
  // Registration form state
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState('');
  const [genero, setGenero] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState('');
  const [pertencimentoRacial, setPertencimentoRacial] = useState('');
  const [experienciaBancas, setExperienciaBancas] = useState('');
  const [registering, setRegistering] = useState(false);

  // Estados brasileiros
  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  useEffect(() => {
    if (authLoading) return;

    const checkAccess = async () => {
      try {
        // 1. Verificar se o treinamento existe e está ativo
        const { data: trainingData, error: trainingError } = await supabase
          .from('trainings')
          .select('*')
          .eq('id', trainingId)
          .eq('status', 'active')
          .single();

        if (trainingError || !trainingData) {
          toast({
            title: 'Treinamento não encontrado',
            description: 'Este treinamento não existe ou não está mais ativo.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        setTraining(trainingData);

        // 2. Se não está autenticado, mostrar formulário de cadastro/login
        if (!user) {
          setLoading(false);
          return;
        }

        // 3. Verificar se já é participante
        const { data: participantData } = await supabase
          .from('training_participants')
          .select('*')
          .eq('training_id', trainingId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (participantData) {
          setIsParticipant(true);
          
          // 4. Buscar sessão ativa do treinamento
          const { data: sessionData } = await supabase
            .from('sessions')
            .select('*')
            .eq('training_id', trainingId)
            .in('session_status', ['waiting', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          setActiveSession(sessionData);

          // 5. Redirecionar baseado no status da sessão
          if (sessionData) {
            if (sessionData.session_status === 'waiting') {
              navigate(`/training/${trainingId}/session/${sessionData.id}/antessala`);
              return;
            } else if (sessionData.session_status === 'active') {
              navigate(`/treino/${sessionData.id}`);
              return;
            }
          }
        }

        // Preencher email do perfil se disponível
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', user.id)
          .single();

        if (profileData?.email) {
          setEmail(profileData.email);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking access:', error);
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao verificar o acesso.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    checkAccess();
  }, [trainingId, user, authLoading, navigate]);

  // Setup realtime para atualizar quando sessão for criada
  useEffect(() => {
    if (!trainingId || !isParticipant) return;

    const channel = supabase
      .channel(`training-sessions-${trainingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
          filter: `training_id=eq.${trainingId}`,
        },
        (payload) => {
          const newSession = payload.new as Session;
          if (newSession.session_status === 'waiting') {
            toast({
              title: 'Sessão criada!',
              description: 'Redirecionando para a sala de espera...',
            });
            navigate(`/training/${trainingId}/session/${newSession.id}/antessala`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId, isParticipant, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Você precisa fazer login primeiro.',
        variant: 'destructive',
      });
      navigate(`/training/${trainingId}/login`);
      return;
    }

    setRegistering(true);

    try {
      const { error } = await supabase
        .from('training_participants')
        .insert({
          training_id: trainingId!,
          user_id: user.id,
          email,
          estado,
          genero,
          faixa_etaria: faixaEtaria,
          pertencimento_racial: pertencimentoRacial,
          experiencia_bancas: experienciaBancas,
        });

      if (error) throw error;

      toast({
        title: 'Cadastro realizado!',
        description: 'Você está cadastrado no treinamento.',
      });

      // Recarregar para verificar sessão ativa
      window.location.reload();
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Erro no cadastro',
        description: error.message || 'Não foi possível completar o cadastro.',
        variant: 'destructive',
      });
    } finally {
      setRegistering(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!training) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Treinamento não encontrado.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Usuário não autenticado
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md shadow-xl border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{training.nome}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {new Date(training.data).toLocaleDateString('pt-BR')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Faça login ou cadastre-se para participar deste treinamento.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => navigate(`/training/${trainingId}/login`)}
                className="w-full"
              >
                Fazer Login
              </Button>
              <Button
                onClick={() => navigate(`/training/${trainingId}/register`)}
                variant="outline"
                className="w-full"
              >
                Criar Conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Usuário autenticado mas não é participante - mostrar formulário de cadastro
  if (!isParticipant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 py-8">
        <div className="container mx-auto max-w-2xl">
          <Card className="shadow-xl border-2">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Cadastro no Treinamento</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {training.nome}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
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

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={estado} onValueChange={setEstado} required>
                      <SelectTrigger id="estado">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genero">Gênero</Label>
                    <Select value={genero} onValueChange={setGenero} required>
                      <SelectTrigger id="genero">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                        <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faixaEtaria">Faixa Etária</Label>
                  <Select value={faixaEtaria} onValueChange={setFaixaEtaria} required>
                    <SelectTrigger id="faixaEtaria">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18-25">18-25 anos</SelectItem>
                      <SelectItem value="26-35">26-35 anos</SelectItem>
                      <SelectItem value="36-45">36-45 anos</SelectItem>
                      <SelectItem value="46-55">46-55 anos</SelectItem>
                      <SelectItem value="56+">56+ anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pertencimentoRacial">Pertencimento Racial</Label>
                  <Select value={pertencimentoRacial} onValueChange={setPertencimentoRacial}>
                    <SelectTrigger id="pertencimentoRacial">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Branca">Branca</SelectItem>
                      <SelectItem value="Preta">Preta</SelectItem>
                      <SelectItem value="Parda">Parda</SelectItem>
                      <SelectItem value="Amarela">Amarela</SelectItem>
                      <SelectItem value="Indígena">Indígena</SelectItem>
                      <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienciaBancas">Experiência em Bancas</Label>
                  <Select value={experienciaBancas} onValueChange={setExperienciaBancas}>
                    <SelectTrigger id="experienciaBancas">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                      <SelectItem value="1-2 anos">1-2 anos</SelectItem>
                      <SelectItem value="3-5 anos">3-5 anos</SelectItem>
                      <SelectItem value="6-10 anos">6-10 anos</SelectItem>
                      <SelectItem value="Mais de 10 anos">Mais de 10 anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={registering}>
                  {registering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar no Treinamento'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Participante cadastrado mas sem sessão ativa
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-2xl shadow-xl border-2">
        <CardContent className="p-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-10 h-10 text-primary animate-pulse" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground">
            Aguardando Início do Treinamento
          </h1>
          
          <p className="text-lg text-muted-foreground">
            Você está cadastrado no treinamento <strong>{training.nome}</strong>.
          </p>

          <p className="text-muted-foreground">
            O administrador ainda não criou a sessão de treinamento.
            Você será redirecionado automaticamente quando a sessão estiver disponível.
          </p>

          <div className="flex items-center justify-center gap-2 pt-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="mt-6"
          >
            Voltar para Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
