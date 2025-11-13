import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface SessionData {
  id: string;
  nome: string;
  data: string;
}

interface EvaluationStats {
  totalParticipants: number;
  totalEvaluations: number;
  completionRate: number;
  averageTime: number;
}

interface PhotoStats {
  fotoId: number;
  totalDeferido: number;
  totalIndeferido: number;
  totalNaoRespondido: number;
  percentDeferido: number;
  percentIndeferido: number;
  percentNaoRespondido: number;
  avgTime: number;
}

const AdminDashboard = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [photoStats, setPhotoStats] = useState<PhotoStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  useEffect(() => {
    if (sessionId) {
      fetchDashboardData();
    }
  }, [sessionId, dateFilter]);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch session info
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Build query with filters
      let query = supabase
        .from('avaliacoes')
        .select('*')
        .eq('session_id', sessionId);

      if (dateFilter.start) {
        query = query.gte('created_at', dateFilter.start);
      }
      if (dateFilter.end) {
        query = query.lte('created_at', dateFilter.end);
      }

      const { data: evaluations, error: evalError } = await query;

      if (evalError) throw evalError;

      // Calculate general stats
      const uniqueUsers = new Set(evaluations?.map(e => e.user_id)).size;
      const totalEvals = evaluations?.length || 0;
      const expectedEvals = uniqueUsers * 30; // 30 photos per user
      const completionRate = expectedEvals > 0 ? (totalEvals / expectedEvals) * 100 : 0;
      const avgTime = evaluations?.reduce((sum, e) => sum + e.tempo_gasto, 0) / totalEvals || 0;

      setStats({
        totalParticipants: uniqueUsers,
        totalEvaluations: totalEvals,
        completionRate,
        averageTime: avgTime,
      });

      // Calculate photo stats
      const photoStatsMap: Record<number, {
        deferido: number;
        indeferido: number;
        naoRespondido: number;
        totalTime: number;
        count: number;
      }> = {};

      evaluations?.forEach(evaluation => {
        const fotoId = evaluation.foto_id;
        if (!photoStatsMap[fotoId]) {
          photoStatsMap[fotoId] = {
            deferido: 0,
            indeferido: 0,
            naoRespondido: 0,
            totalTime: 0,
            count: 0,
          };
        }

        if (evaluation.resposta === 'DEFERIDO') photoStatsMap[fotoId].deferido++;
        else if (evaluation.resposta === 'INDEFERIDO') photoStatsMap[fotoId].indeferido++;
        else if (evaluation.resposta === 'NÃO_RESPONDIDO') photoStatsMap[fotoId].naoRespondido++;

        photoStatsMap[fotoId].totalTime += evaluation.tempo_gasto;
        photoStatsMap[fotoId].count++;
      });

      const photoStatsArray: PhotoStats[] = [];
      for (let i = 1; i <= 30; i++) {
        const stats = photoStatsMap[i] || {
          deferido: 0,
          indeferido: 0,
          naoRespondido: 0,
          totalTime: 0,
          count: 0,
        };

        const total = stats.deferido + stats.indeferido + stats.naoRespondido;
        photoStatsArray.push({
          fotoId: i,
          totalDeferido: stats.deferido,
          totalIndeferido: stats.indeferido,
          totalNaoRespondido: stats.naoRespondido,
          percentDeferido: total > 0 ? (stats.deferido / total) * 100 : 0,
          percentIndeferido: total > 0 ? (stats.indeferido / total) * 100 : 0,
          percentNaoRespondido: total > 0 ? (stats.naoRespondido / total) * 100 : 0,
          avgTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
        });
      }

      setPhotoStats(photoStatsArray);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    return `${Math.round(seconds)}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-foreground">{session?.nome}</h1>
            <p className="text-muted-foreground">
              Dashboard de Análise de Resultados
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                />
              </div>
            </div>
            <Button
              onClick={() => setDateFilter({ start: '', end: '' })}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>

        {/* General Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Participantes</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.totalParticipants || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avaliações Concluídas</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.totalEvaluations || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                  <p className="text-3xl font-bold text-foreground">
                    {stats?.completionRate.toFixed(1) || 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatTime(stats?.averageTime || 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Photo Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Análise por Foto
            </CardTitle>
            <CardDescription>
              Detalhamento das respostas para cada uma das 30 fotos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Foto</TableHead>
                    <TableHead>Deferidos</TableHead>
                    <TableHead>Indeferidos</TableHead>
                    <TableHead>Não Respondidos</TableHead>
                    <TableHead>Distribuição</TableHead>
                    <TableHead className="text-right">Tempo Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {photoStats.map((photo) => (
                    <TableRow key={photo.fotoId}>
                      <TableCell className="font-medium">
                        #{photo.fotoId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-accent font-semibold">{photo.totalDeferido}</span>
                          <span className="text-xs text-muted-foreground">
                            ({photo.percentDeferido.toFixed(1)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-destructive font-semibold">{photo.totalIndeferido}</span>
                          <span className="text-xs text-muted-foreground">
                            ({photo.percentIndeferido.toFixed(1)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-semibold">
                            {photo.totalNaoRespondido}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({photo.percentNaoRespondido.toFixed(1)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[200px]">
                          <div className="flex gap-1">
                            <div
                              className="h-2 bg-accent rounded-l"
                              style={{ width: `${photo.percentDeferido}%` }}
                            />
                            <div
                              className="h-2 bg-destructive"
                              style={{ width: `${photo.percentIndeferido}%` }}
                            />
                            <div
                              className="h-2 bg-muted rounded-r"
                              style={{ width: `${photo.percentNaoRespondido}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatTime(photo.avgTime)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
