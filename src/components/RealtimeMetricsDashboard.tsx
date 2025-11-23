import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MetricsDashboardProps {
  sessionId: string;
  currentPhoto: number;
  sessionStatus: string;
}

interface RealtimeMetrics {
  totalResponses: number;
  deferido: number;
  indeferido: number;
  naoRespondido: number;
  averageTime: number;
  responseRate: number;
  participantCount: number;
}

interface TemporalData {
  timestamp: string;
  deferido: number;
  indeferido: number;
  cumulative: number;
}

interface DemographicBreakdown {
  category: string;
  deferido: number;
  indeferido: number;
  naoRespondido: number;
}

export const RealtimeMetricsDashboard = ({ sessionId, currentPhoto, sessionStatus }: MetricsDashboardProps) => {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    totalResponses: 0,
    deferido: 0,
    indeferido: 0,
    naoRespondido: 0,
    averageTime: 0,
    responseRate: 0,
    participantCount: 0,
  });
  
  const [temporalData, setTemporalData] = useState<TemporalData[]>([]);
  const [demographicData, setDemographicData] = useState<DemographicBreakdown[]>([]);
  const [recentVotes, setRecentVotes] = useState<any[]>([]);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  // Fetch initial metrics
  const fetchMetrics = async () => {
    try {
      // Get total participants
      const { data: participants } = await supabase
        .from('profiles')
        .select('user_id');

      const participantCount = participants?.length || 0;

      // Get responses for current photo
      const { data: responses } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('session_id', sessionId)
        .eq('foto_id', currentPhoto)
        .order('created_at', { ascending: true });

      if (!responses) return;

      const deferido = responses.filter(r => r.resposta === 'DEFERIDO').length;
      const indeferido = responses.filter(r => r.resposta === 'INDEFERIDO').length;
      const naoRespondido = responses.filter(r => r.resposta === 'NÃO_RESPONDIDO').length;
      const totalResponses = responses.length;

      const averageTime = totalResponses > 0
        ? responses.reduce((sum, r) => sum + r.tempo_gasto, 0) / totalResponses / 1000
        : 0;

      const responseRate = participantCount > 0
        ? (totalResponses / participantCount) * 100
        : 0;

      setMetrics({
        totalResponses,
        deferido,
        indeferido,
        naoRespondido,
        averageTime,
        responseRate,
        participantCount,
      });

      // Build temporal data
      const temporal: TemporalData[] = [];
      let cumulativeDeferido = 0;
      let cumulativeIndeferido = 0;

      responses.forEach((response, index) => {
        if (response.resposta === 'DEFERIDO') cumulativeDeferido++;
        if (response.resposta === 'INDEFERIDO') cumulativeIndeferido++;

        if (index % 5 === 0 || index === responses.length - 1) {
          temporal.push({
            timestamp: new Date(response.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            deferido: cumulativeDeferido,
            indeferido: cumulativeIndeferido,
            cumulative: cumulativeDeferido + cumulativeIndeferido,
          });
        }
      });

      setTemporalData(temporal);

      // Build demographic breakdown by gender
      const genderBreakdown: Record<string, DemographicBreakdown> = {};
      responses.forEach(r => {
        const gender = r.genero || 'Não informado';
        if (!genderBreakdown[gender]) {
          genderBreakdown[gender] = {
            category: gender,
            deferido: 0,
            indeferido: 0,
            naoRespondido: 0,
          };
        }
        if (r.resposta === 'DEFERIDO') genderBreakdown[gender].deferido++;
        if (r.resposta === 'INDEFERIDO') genderBreakdown[gender].indeferido++;
        if (r.resposta === 'NÃO_RESPONDIDO') genderBreakdown[gender].naoRespondido++;
      });

      setDemographicData(Object.values(genderBreakdown));

      // Get recent votes (last 10)
      setRecentVotes(responses.slice(-10).reverse());

    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  // Subscribe to realtime changes
  useEffect(() => {
    fetchMetrics();

    const channel = supabase
      .channel('realtime-metrics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'avaliacoes',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('New vote received:', payload);
          setPulseAnimation(true);
          setTimeout(() => setPulseAnimation(false), 1000);
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, currentPhoto]);

  // Track online participants
  useEffect(() => {
    const presenceChannel = supabase
      .channel(`session-${sessionId}-presence-metrics`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [sessionId]);

  const pieData = [
    { name: 'Deferido', value: metrics.deferido, color: '#10b981' },
    { name: 'Indeferido', value: metrics.indeferido, color: '#ef4444' },
    { name: 'Não Respondido', value: metrics.naoRespondido, color: '#f59e0b' },
  ];

  const getResponseIcon = (resposta: string) => {
    switch (resposta) {
      case 'DEFERIDO':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'INDEFERIDO':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={pulseAnimation ? 'animate-pulse border-primary' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respostas Totais</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalResponses}</div>
            <p className="text-xs text-muted-foreground">
              de {metrics.participantCount} participantes
            </p>
            <Progress value={metrics.responseRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.responseRate.toFixed(1)}% de taxa de resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participantes Online</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {onlineCount}
              {onlineCount > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {sessionStatus === 'active' ? 'Sessão ativa' : 'Sessão aguardando'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageTime.toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">
              por avaliação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Foto Atual</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{currentPhoto}</div>
            <p className="text-xs text-muted-foreground">
              de 30 fotos
            </p>
            <Progress value={(currentPhoto / 30) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temporal Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Temporal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={temporalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" style={{ fontSize: '12px' }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="deferido"
                  stroke="#10b981"
                  name="Deferido"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="indeferido"
                  stroke="#ef4444"
                  name="Indeferido"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribuição de Respostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Demographic Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Análise Demográfica por Gênero
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={demographicData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" style={{ fontSize: '12px' }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="deferido" fill="#10b981" name="Deferido" />
              <Bar dataKey="indeferido" fill="#ef4444" name="Indeferido" />
              <Bar dataKey="naoRespondido" fill="#f59e0b" name="Não Respondido" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Votes Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Feed de Votos Recentes
            <Badge variant="outline" className="ml-auto">
              Últimos 10
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentVotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aguardando votos...
              </p>
            ) : (
              recentVotes.map((vote, index) => (
                <div
                  key={vote.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getResponseIcon(vote.resposta)}
                    <div>
                      <p className="text-sm font-medium">{vote.resposta}</p>
                      <p className="text-xs text-muted-foreground">
                        {vote.genero || 'Não informado'} • {vote.faixa_etaria || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(vote.created_at).toLocaleTimeString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(vote.tempo_gasto / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
