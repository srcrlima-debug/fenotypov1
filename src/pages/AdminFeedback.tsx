import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Header } from '@/components/Header';
import {
  ArrowLeft,
  Star,
  ThumbsUp,
  ThumbsDown,
  Users,
  TrendingUp,
  MessageSquare,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

interface FeedbackData {
  id: string;
  rating: number;
  experiencia_geral: string;
  clareza_instrucoes: number;
  tempo_adequado: number;
  interface_qualidade: number;
  sugestoes: string;
  recomendaria: boolean;
  created_at: string;
}

interface FeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  averageClareza: number;
  averageTempo: number;
  averageInterface: number;
  recommendationRate: number;
  ratingDistribution: Record<number, number>;
}

export default function AdminFeedback() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();

  const [session, setSession] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      loadData();
    }
  }, [sessionId, isAdmin, adminLoading]);

  const loadData = async () => {
    try {
      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Load feedbacks
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      setFeedbacks(feedbackData || []);
      calculateStats(feedbackData || []);
    } catch (error: any) {
      console.error('Error loading feedback:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os feedbacks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: FeedbackData[]) => {
    if (data.length === 0) {
      setStats(null);
      return;
    }

    const totalFeedbacks = data.length;
    const averageRating = data.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks;
    const averageClareza =
      data.reduce((sum, f) => sum + (f.clareza_instrucoes || 0), 0) / totalFeedbacks;
    const averageTempo =
      data.reduce((sum, f) => sum + (f.tempo_adequado || 0), 0) / totalFeedbacks;
    const averageInterface =
      data.reduce((sum, f) => sum + (f.interface_qualidade || 0), 0) / totalFeedbacks;
    const recommendationRate =
      (data.filter((f) => f.recomendaria).length / totalFeedbacks) * 100;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.forEach((f) => {
      ratingDistribution[f.rating]++;
    });

    setStats({
      totalFeedbacks,
      averageRating,
      averageClareza,
      averageTempo,
      averageInterface,
      recommendationRate,
      ratingDistribution,
    });
  };

  const exportToCSV = () => {
    const csvData = feedbacks.map((f) => ({
      'Data/Hora': new Date(f.created_at).toLocaleString('pt-BR'),
      'Avaliação Geral': f.rating,
      'Clareza das Instruções': f.clareza_instrucoes || '',
      'Tempo Adequado': f.tempo_adequado || '',
      'Qualidade da Interface': f.interface_qualidade || '',
      'Experiência Geral': f.experiencia_geral || '',
      Sugestões: f.sugestoes || '',
      Recomendaria: f.recomendaria ? 'Sim' : 'Não',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `feedback_${session?.nome}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Exportado com sucesso',
      description: 'Feedbacks exportados para CSV',
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando feedbacks...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/trainings')}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-3xl font-bold">Feedbacks da Sessão</h1>
              <p className="text-muted-foreground mt-1">
                {session?.nome} - {new Date(session?.data).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <Button onClick={exportToCSV} disabled={feedbacks.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Stats Overview */}
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Feedbacks</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalFeedbacks}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
                    <Star className="h-4 w-4 text-yellow-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
                    {renderStars(Math.round(stats.averageRating))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Recomendação</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.recommendationRate.toFixed(0)}%</div>
                    <Progress value={stats.recommendationRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sentimento Geral</CardTitle>
                    {stats.averageRating >= 4 ? (
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <ThumbsDown className="h-4 w-4 text-red-500" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.averageRating >= 4 ? 'Positivo' : stats.averageRating >= 3 ? 'Neutro' : 'Negativo'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Métricas Detalhadas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Clareza das Instruções</span>
                      <span className="text-sm">{stats.averageClareza.toFixed(1)}/5</span>
                    </div>
                    <Progress value={(stats.averageClareza / 5) * 100} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Tempo Adequado</span>
                      <span className="text-sm">{stats.averageTempo.toFixed(1)}/5</span>
                    </div>
                    <Progress value={(stats.averageTempo / 5) * 100} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Qualidade da Interface</span>
                      <span className="text-sm">{stats.averageInterface.toFixed(1)}/5</span>
                    </div>
                    <Progress value={(stats.averageInterface / 5) * 100} />
                  </div>
                </CardContent>
              </Card>

              {/* Rating Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Avaliações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-4">
                        <div className="flex items-center gap-1 w-20">
                          <span className="text-sm font-medium">{rating}</span>
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </div>
                        <Progress
                          value={(stats.ratingDistribution[rating] / stats.totalFeedbacks) * 100}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-16 text-right">
                          {stats.ratingDistribution[rating]} ({Math.round((stats.ratingDistribution[rating] / stats.totalFeedbacks) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Individual Feedbacks */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Comentários dos Participantes
            </h2>
            {feedbacks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum feedback recebido ainda
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {feedbacks.map((feedback) => (
                  <Card key={feedback.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {renderStars(feedback.rating)}
                          {feedback.recomendaria && (
                            <Badge variant="default" className="bg-green-600">
                              Recomendaria
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(feedback.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {feedback.experiencia_geral && (
                        <div>
                          <h4 className="font-semibold text-sm mb-1">Experiência Geral:</h4>
                          <p className="text-sm text-muted-foreground">
                            {feedback.experiencia_geral}
                          </p>
                        </div>
                      )}

                      {feedback.sugestoes && (
                        <div>
                          <h4 className="font-semibold text-sm mb-1">Sugestões:</h4>
                          <p className="text-sm text-muted-foreground">{feedback.sugestoes}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Clareza</p>
                          <p className="text-sm font-semibold">
                            {feedback.clareza_instrucoes || 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Tempo</p>
                          <p className="text-sm font-semibold">{feedback.tempo_adequado || 'N/A'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Interface</p>
                          <p className="text-sm font-semibold">
                            {feedback.interface_qualidade || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
