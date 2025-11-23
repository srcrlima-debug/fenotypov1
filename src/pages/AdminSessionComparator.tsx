import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, X, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Badge } from '@/components/ui/badge';

interface Session {
  id: string;
  nome: string;
  data: string;
}

interface SessionStats {
  sessionId: string;
  sessionName: string;
  totalParticipantes: number;
  totalAvaliacoes: number;
  totalDeferido: number;
  totalIndeferido: number;
  taxaDeferimento: number;
  tempoMedio: number;
  consensoMedio: number;
  generoData: { categoria: string; deferido: number; indeferido: number; total: number }[];
  racaData: { categoria: string; deferido: number; indeferido: number; total: number }[];
  regiaoData: { categoria: string; deferido: number; indeferido: number; total: number }[];
}

const AdminSessionComparator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [sessionsStats, setSessionsStats] = useState<SessionStats[]>([]);

  useEffect(() => {
    fetchAvailableSessions();
  }, []);

  useEffect(() => {
    if (selectedSessions.length > 0) {
      fetchSessionsStats();
    }
  }, [selectedSessions]);

  const fetchAvailableSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, nome, data')
      .eq('session_status', 'showing_results')
      .order('data', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar sessões',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setAvailableSessions(data || []);
  };

  const fetchSessionsStats = async () => {
    setLoading(true);

    try {
      const statsPromises = selectedSessions.map(async (sessionId) => {
        const session = availableSessions.find(s => s.id === sessionId);
        if (!session) return null;

        // Fetch evaluations with profiles
        const { data: avaliacoes, error } = await supabase
          .from('avaliacoes')
          .select(`
            resposta,
            tempo_gasto,
            profiles!inner(
              genero,
              pertencimento_racial,
              regiao
            )
          `)
          .eq('session_id', sessionId);

        if (error) throw error;

        // Process data
        let totalDeferido = 0;
        let totalIndeferido = 0;
        let totalTempo = 0;
        const generoMap = new Map<string, { deferido: number; indeferido: number; total: number }>();
        const racaMap = new Map<string, { deferido: number; indeferido: number; total: number }>();
        const regiaoMap = new Map<string, { deferido: number; indeferido: number; total: number }>();

        avaliacoes?.forEach((av: any) => {
          const profile = av.profiles;
          if (!profile) return;

          totalTempo += av.tempo_gasto || 0;

          if (av.resposta === 'DEFERIDO') totalDeferido++;
          else if (av.resposta === 'INDEFERIDO') totalIndeferido++;

          // Update maps
          const genero = profile.genero || 'Não informado';
          const raca = profile.pertencimento_racial || 'Não informado';
          const regiao = profile.regiao || 'Não informado';

          [generoMap, racaMap, regiaoMap].forEach((map, idx) => {
            const key = [genero, raca, regiao][idx];
            if (!map.has(key)) {
              map.set(key, { deferido: 0, indeferido: 0, total: 0 });
            }
            const data = map.get(key)!;
            data.total++;
            if (av.resposta === 'DEFERIDO') data.deferido++;
            else if (av.resposta === 'INDEFERIDO') data.indeferido++;
          });
        });

        const totalAvaliacoes = totalDeferido + totalIndeferido;

        // Count unique participants
        const uniqueParticipants = new Set();
        avaliacoes?.forEach((av: any) => {
          if (av.profiles) {
            uniqueParticipants.add(av.profiles.genero + av.profiles.pertencimento_racial);
          }
        });

        return {
          sessionId,
          sessionName: session.nome,
          totalParticipantes: uniqueParticipants.size,
          totalAvaliacoes,
          totalDeferido,
          totalIndeferido,
          taxaDeferimento: totalAvaliacoes > 0 ? (totalDeferido / totalAvaliacoes) * 100 : 0,
          tempoMedio: totalAvaliacoes > 0 ? totalTempo / totalAvaliacoes / 1000 : 0,
          consensoMedio: 0, // Simplificado
          generoData: Array.from(generoMap.entries()).map(([categoria, data]) => ({ categoria, ...data })),
          racaData: Array.from(racaMap.entries()).map(([categoria, data]) => ({ categoria, ...data })),
          regiaoData: Array.from(regiaoMap.entries()).map(([categoria, data]) => ({ categoria, ...data })),
        };
      });

      const stats = (await Promise.all(statsPromises)).filter(s => s !== null) as SessionStats[];
      setSessionsStats(stats);

    } catch (error: any) {
      toast({
        title: 'Erro ao carregar estatísticas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addSession = (sessionId: string) => {
    if (selectedSessions.length >= 4) {
      toast({
        title: 'Limite atingido',
        description: 'Você pode comparar no máximo 4 sessões',
        variant: 'destructive',
      });
      return;
    }
    if (!selectedSessions.includes(sessionId)) {
      setSelectedSessions([...selectedSessions, sessionId]);
    }
  };

  const removeSession = (sessionId: string) => {
    setSelectedSessions(selectedSessions.filter(id => id !== sessionId));
  };

  // Prepare comparison data
  const comparisonData = sessionsStats.map(s => ({
    nome: s.sessionName.substring(0, 15),
    'Taxa de Deferimento (%)': s.taxaDeferimento,
    'Participantes': s.totalParticipantes,
    'Tempo Médio (s)': s.tempoMedio,
  }));

  const radarData = selectedSessions.length > 0 ? [
    {
      metric: 'Taxa Defer.',
      ...Object.fromEntries(sessionsStats.map(s => [s.sessionName, s.taxaDeferimento]))
    },
    {
      metric: 'Participantes',
      ...Object.fromEntries(sessionsStats.map(s => [s.sessionName, s.totalParticipantes * 3.33])) // Normalizar
    },
    {
      metric: 'Total Aval.',
      ...Object.fromEntries(sessionsStats.map(s => [s.sessionName, (s.totalAvaliacoes / 30) * 100])) // Normalizar
    },
  ] : [];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Comparador de Sessões</h1>
                <p className="text-muted-foreground">Compare até 4 sessões lado a lado</p>
              </div>
            </div>
          </div>

          {/* Session Selector */}
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Selecionar Sessões
              </CardTitle>
              <CardDescription>
                Escolha as sessões que deseja comparar (máximo 4)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {selectedSessions.map((sessionId) => {
                  const session = availableSessions.find(s => s.id === sessionId);
                  return (
                    <Badge key={sessionId} variant="secondary" className="text-sm px-3 py-2">
                      {session?.nome}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-4 w-4 p-0"
                        onClick={() => removeSession(sessionId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>

              <div className="mt-4 max-w-md">
                <Select onValueChange={addSession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar sessão para comparar" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSessions
                      .filter(s => !selectedSessions.includes(s.id))
                      .map(session => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.nome} - {new Date(session.data).toLocaleDateString('pt-BR')}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando comparação...</p>
            </div>
          )}

          {/* Results */}
          {!loading && sessionsStats.length > 0 && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                {sessionsStats.map((stats, idx) => (
                  <Card key={stats.sessionId} className="hover:shadow-lg transition-all" style={{ animationDelay: `${idx * 100}ms` }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium truncate">{stats.sessionName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Participantes:</span>
                        <span className="font-semibold">{stats.totalParticipantes}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avaliações:</span>
                        <span className="font-semibold">{stats.totalAvaliacoes}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxa Defer.:</span>
                        <span className="font-semibold text-success">{stats.taxaDeferimento.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tempo Médio:</span>
                        <span className="font-semibold">{stats.tempoMedio.toFixed(1)}s</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Comparison Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Bar Chart Comparison */}
                <Card className="hover:shadow-lg transition-all animate-slide-in">
                  <CardHeader>
                    <CardTitle>Comparação Geral</CardTitle>
                    <CardDescription>Principais métricas lado a lado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nome" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Taxa de Deferimento (%)" fill="#10b981" animationDuration={1000} />
                        <Bar dataKey="Participantes" fill="#3b82f6" animationDuration={1000} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Radar Chart */}
                <Card className="hover:shadow-lg transition-all animate-slide-in">
                  <CardHeader>
                    <CardTitle>Análise Multidimensional</CardTitle>
                    <CardDescription>Comparação em múltiplos aspectos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        {sessionsStats.map((stats, idx) => (
                          <Radar
                            key={stats.sessionId}
                            name={stats.sessionName}
                            dataKey={stats.sessionName}
                            stroke={COLORS[idx]}
                            fill={COLORS[idx]}
                            fillOpacity={0.3}
                            animationDuration={1000}
                          />
                        ))}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Deferimento Line Chart */}
                <Card className="hover:shadow-lg transition-all animate-fade-in lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Comparação de Taxa de Deferimento</CardTitle>
                    <CardDescription>Evolução comparativa entre sessões</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nome" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="Taxa de Deferimento (%)" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          animationDuration={1500}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Comparison Table */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Comparação Detalhada</CardTitle>
                  <CardDescription>Análise completa lado a lado</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Métrica</th>
                          {sessionsStats.map(stats => (
                            <th key={stats.sessionId} className="text-center p-2">{stats.sessionName}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2 font-medium">Total de Participantes</td>
                          {sessionsStats.map(stats => (
                            <td key={stats.sessionId} className="text-center p-2">{stats.totalParticipantes}</td>
                          ))}
                        </tr>
                        <tr className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2 font-medium">Total de Avaliações</td>
                          {sessionsStats.map(stats => (
                            <td key={stats.sessionId} className="text-center p-2">{stats.totalAvaliacoes}</td>
                          ))}
                        </tr>
                        <tr className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2 font-medium">Deferido</td>
                          {sessionsStats.map(stats => (
                            <td key={stats.sessionId} className="text-center p-2 text-success font-semibold">{stats.totalDeferido}</td>
                          ))}
                        </tr>
                        <tr className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2 font-medium">Indeferido</td>
                          {sessionsStats.map(stats => (
                            <td key={stats.sessionId} className="text-center p-2 text-destructive font-semibold">{stats.totalIndeferido}</td>
                          ))}
                        </tr>
                        <tr className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2 font-medium">Taxa de Deferimento</td>
                          {sessionsStats.map(stats => (
                            <td key={stats.sessionId} className="text-center p-2">
                              <Badge variant={stats.taxaDeferimento > 50 ? "default" : "secondary"}>
                                {stats.taxaDeferimento.toFixed(1)}%
                              </Badge>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2 font-medium">Tempo Médio por Foto</td>
                          {sessionsStats.map(stats => (
                            <td key={stats.sessionId} className="text-center p-2">{stats.tempoMedio.toFixed(1)}s</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty State */}
          {!loading && sessionsStats.length === 0 && (
            <Card className="animate-fade-in">
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma sessão selecionada</h3>
                <p className="text-muted-foreground">
                  Selecione pelo menos uma sessão para começar a comparação
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminSessionComparator;
