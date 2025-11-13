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
  Image as ImageIcon,
  Award,
  XCircle,
  Timer,
  Target
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts';
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

interface DemographicData {
  genero: { [key: string]: { deferido: number; indeferido: number; total: number } };
  faixaEtaria: { [key: string]: { deferido: number; indeferido: number; total: number } };
  regiao: { [key: string]: { deferido: number; indeferido: number; total: number } };
}

interface KPIs {
  mostDeferida: { fotoId: number; percent: number };
  mostIndeferida: { fotoId: number; percent: number };
  longestTime: { fotoId: number; time: number };
  consenso: number;
}

const AdminDashboard = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [photoStats, setPhotoStats] = useState<PhotoStats[]>([]);
  const [demographicData, setDemographicData] = useState<DemographicData>({
    genero: {},
    faixaEtaria: {},
    regiao: {},
  });
  const [kpis, setKPIs] = useState<KPIs | null>(null);
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

      // Calculate demographic data
      const generoStats: { [key: string]: { deferido: number; indeferido: number; total: number } } = {};
      const faixaEtariaStats: { [key: string]: { deferido: number; indeferido: number; total: number } } = {};
      const regiaoStats: { [key: string]: { deferido: number; indeferido: number; total: number } } = {};

      evaluations?.forEach(evaluation => {
        const { genero, faixa_etaria, regiao, resposta } = evaluation;

        // Genero
        if (genero) {
          if (!generoStats[genero]) generoStats[genero] = { deferido: 0, indeferido: 0, total: 0 };
          generoStats[genero].total++;
          if (resposta === 'DEFERIDO') generoStats[genero].deferido++;
          else if (resposta === 'INDEFERIDO') generoStats[genero].indeferido++;
        }

        // Faixa Etária
        if (faixa_etaria) {
          if (!faixaEtariaStats[faixa_etaria]) faixaEtariaStats[faixa_etaria] = { deferido: 0, indeferido: 0, total: 0 };
          faixaEtariaStats[faixa_etaria].total++;
          if (resposta === 'DEFERIDO') faixaEtariaStats[faixa_etaria].deferido++;
          else if (resposta === 'INDEFERIDO') faixaEtariaStats[faixa_etaria].indeferido++;
        }

        // Região
        if (regiao) {
          if (!regiaoStats[regiao]) regiaoStats[regiao] = { deferido: 0, indeferido: 0, total: 0 };
          regiaoStats[regiao].total++;
          if (resposta === 'DEFERIDO') regiaoStats[regiao].deferido++;
          else if (resposta === 'INDEFERIDO') regiaoStats[regiao].indeferido++;
        }
      });

      setDemographicData({
        genero: generoStats,
        faixaEtaria: faixaEtariaStats,
        regiao: regiaoStats,
      });

      // Calculate KPIs
      let mostDeferida = { fotoId: 1, percent: 0 };
      let mostIndeferida = { fotoId: 1, percent: 0 };
      let longestTime = { fotoId: 1, time: 0 };

      photoStatsArray.forEach(photo => {
        if (photo.percentDeferido > mostDeferida.percent) {
          mostDeferida = { fotoId: photo.fotoId, percent: photo.percentDeferido };
        }
        if (photo.percentIndeferido > mostIndeferida.percent) {
          mostIndeferida = { fotoId: photo.fotoId, percent: photo.percentIndeferido };
        }
        if (photo.avgTime > longestTime.time) {
          longestTime = { fotoId: photo.fotoId, time: photo.avgTime };
        }
      });

      // Calculate consensus (average agreement rate across all photos)
      const consensoTotal = photoStatsArray.reduce((sum, photo) => {
        const maxPercent = Math.max(photo.percentDeferido, photo.percentIndeferido, photo.percentNaoRespondido);
        return sum + maxPercent;
      }, 0);
      const consenso = consensoTotal / 30;

      setKPIs({ mostDeferida, mostIndeferida, longestTime, consenso });

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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Foto Mais Deferida</p>
                  <p className="text-3xl font-bold text-foreground">#{kpis?.mostDeferida.fotoId}</p>
                  <p className="text-sm text-accent">{kpis?.mostDeferida.percent.toFixed(1)}%</p>
                </div>
                <Award className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Foto Mais Indeferida</p>
                  <p className="text-3xl font-bold text-foreground">#{kpis?.mostIndeferida.fotoId}</p>
                  <p className="text-sm text-destructive">{kpis?.mostIndeferida.percent.toFixed(1)}%</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Maior Tempo Médio</p>
                  <p className="text-3xl font-bold text-foreground">#{kpis?.longestTime.fotoId}</p>
                  <p className="text-sm text-primary">{formatTime(kpis?.longestTime.time || 0)}</p>
                </div>
                <Timer className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Consenso Geral</p>
                  <p className="text-3xl font-bold text-foreground">{kpis?.consenso.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Acordo médio</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gender Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Gênero</CardTitle>
              <CardDescription>Participação e respostas por gênero</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  total: { label: 'Total', color: 'hsl(var(--primary))' },
                  deferido: { label: 'Deferido', color: 'hsl(var(--accent))' },
                  indeferido: { label: 'Indeferido', color: 'hsl(var(--destructive))' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(demographicData.genero).map(([key, value]) => ({
                        name: key,
                        value: value.total,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {Object.keys(demographicData.genero).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${30 + index * 40}, 45%, ${45 + index * 10}%)`} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Age Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Faixa Etária</CardTitle>
              <CardDescription>Comparação de respostas por idade</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  deferido: { label: 'Deferido', color: 'hsl(var(--accent))' },
                  indeferido: { label: 'Indeferido', color: 'hsl(var(--destructive))' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(demographicData.faixaEtaria).map(([key, value]) => ({
                      name: key,
                      deferido: value.deferido,
                      indeferido: value.indeferido,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                    <YAxis stroke="hsl(var(--foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="deferido" fill="hsl(var(--accent))" />
                    <Bar dataKey="indeferido" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Region Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Região</CardTitle>
              <CardDescription>Participação e padrões por estado</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  deferido: { label: 'Deferido', color: 'hsl(var(--accent))' },
                  indeferido: { label: 'Indeferido', color: 'hsl(var(--destructive))' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(demographicData.regiao)
                      .sort((a, b) => b[1].total - a[1].total)
                      .slice(0, 10)
                      .map(([key, value]) => ({
                        name: key,
                        deferido: value.deferido,
                        indeferido: value.indeferido,
                      }))}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--foreground))" />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="deferido" fill="hsl(var(--accent))" />
                    <Bar dataKey="indeferido" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Response Time by Photo */}
          <Card>
            <CardHeader>
              <CardTitle>Tempo de Resposta por Foto</CardTitle>
              <CardDescription>Identifica fotos que geraram mais dúvida</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  tempo: { label: 'Tempo Médio (s)', color: 'hsl(var(--primary))' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={photoStats.map(photo => ({
                      foto: photo.fotoId,
                      tempo: photo.avgTime,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="foto" stroke="hsl(var(--foreground))" label={{ value: 'Foto', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke="hsl(var(--foreground))" label={{ value: 'Segundos', angle: -90, position: 'insideLeft' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="tempo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
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
