import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Calendar, 
  Mail, 
  Link2, 
  Target, 
  AlertCircle,
  Clock,
  Users,
  ArrowRight,
  Home,
  Monitor,
  Wifi
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TrainingWelcome() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [training, setTraining] = useState<any>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate(`/training/${trainingId}/login`);
      return;
    }
    loadData();
  }, [trainingId, user]);

  const loadData = async () => {
    try {
      // Buscar dados do treinamento
      const { data: trainingData, error: trainingError } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', trainingId)
        .single();

      if (trainingError) throw trainingError;

      // Contar participantes
      const { count, error: countError } = await supabase
        .from('training_participants')
        .select('*', { count: 'exact', head: true })
        .eq('training_id', trainingId);

      if (countError) throw countError;

      setTraining(trainingData);
      setParticipantCount(count || 0);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const formattedDate = training?.data 
    ? format(new Date(training.data), "dd 'de' MMMM 'de' yyyy - EEEE", { locale: ptBR })
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Success Confirmation Section */}
        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-fade-in">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-green-900 dark:text-green-100">
                Cadastro Realizado com Sucesso! 🎉
              </h1>
              <p className="text-lg text-green-700 dark:text-green-300">
                Bem-vindo(a) ao treinamento <strong>{training?.nome}</strong>
              </p>
              <Badge variant="secondary" className="mt-2">
                <Calendar className="w-3 h-3 mr-1" />
                {formattedDate}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Timeline - What Happens Now */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              O que Acontece Agora?
            </CardTitle>
            <CardDescription>Próximos passos para participação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-semibold">Cadastro Confirmado</h4>
                  <p className="text-sm text-muted-foreground">
                    Suas informações foram registradas com sucesso no sistema
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Aguarde Comunicação do Organizador
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Você receberá instruções sobre como acessar a sessão de treinamento
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Você Receberá o Link da Sessão ao Vivo
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    O link para participar será enviado próximo à data do treinamento
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Participe da Dinâmica Sincronizada
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    No dia e horário marcados, acesse o link e participe do treinamento ao vivo
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Training Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Informações do Treinamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-lg">{training?.nome}</h4>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4" />
                {formattedDate}
              </p>
            </div>

            {training?.descricao && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">{training.descricao}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">{participantCount}</span>
              <span className="text-muted-foreground">
                {participantCount === 1 ? 'participante cadastrado' : 'participantes cadastrados'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Important Instructions */}
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <AlertCircle className="w-5 h-5" />
              Instruções Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600 dark:text-amber-400">📅</span>
                <span>Anote a data do treinamento em sua agenda</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600 dark:text-amber-400">🌐</span>
                <div>
                  <span className="block">Certifique-se de ter conexão de internet estável no dia</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Wifi className="w-3 h-3" />
                    Recomendado: conexão via cabo ou Wi-Fi de alta velocidade
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600 dark:text-amber-400">🔗</span>
                <span>O link da sessão será enviado próximo ao horário do treinamento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600 dark:text-amber-400">⏰</span>
                <span className="font-medium">Recomendação: faça login 10 minutos antes do início</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600 dark:text-amber-400">💻</span>
                <div>
                  <span className="flex items-center gap-1">
                    <Monitor className="w-4 h-4" />
                    <strong>Dispositivos recomendados: computador, notebook ou tablet</strong>
                  </span>
                  <span className="block text-red-600 dark:text-red-400 font-semibold mt-1">
                    ⚠️ EVITE acesso por telefones móveis!
                  </span>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Summary Information */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Resumo das Informações</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-primary">Treinamento</p>
                  <p>{training?.nome}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-primary">Data</p>
                  <p>{formattedDate}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-primary">Status</p>
                  <Badge variant="default">Cadastro Confirmado</Badge>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-primary">Participantes</p>
                  <p>{participantCount} cadastrado(s)</p>
                </div>
              </div>
              
              <div className="pt-4 text-muted-foreground text-sm">
                <p>
                  Você receberá o link de acesso à sessão por e-mail ou pelo organizador do treinamento.
                  Fique atento às comunicações!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Guarde este link de acesso para fazer login posteriormente:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                asChild
                variant="default"
              >
                <Link to={`/training/${trainingId}/login`}>
                  Acessar Área de Login
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline"
              >
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Voltar para Início
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
