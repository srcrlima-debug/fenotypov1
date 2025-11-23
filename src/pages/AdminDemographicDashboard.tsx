import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Filter, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BiasAlertSystem } from '@/components/BiasAlertSystem';
import { ResponsePatternAnalysis } from '@/components/ResponsePatternAnalysis';
import { BiasIdentification } from '@/components/BiasIdentification';
import { SamePersonDiscrepancy } from '@/components/SamePersonDiscrepancy';

interface DemographicData {
  category: string;
  value: string;
  deferido: number;
  indeferido: number;
  total: number;
  percentDeferido: number;
  percentIndeferido: number;
}

interface CrossAnalysis {
  genero: string;
  pertencimentoRacial: string;
  regiao: string;
  experienciaBancas: string;
  deferido: number;
  indeferido: number;
  total: number;
  percentDeferido: number;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const AdminDemographicDashboard = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sessionName, setSessionName] = useState('');
  
  // All demographic data
  const [generoData, setGeneroData] = useState<DemographicData[]>([]);
  const [racaData, setRacaData] = useState<DemographicData[]>([]);
  const [regiaoData, setRegiaoData] = useState<DemographicData[]>([]);
  const [experienciaData, setExperienciaData] = useState<DemographicData[]>([]);
  const [crossAnalysis, setCrossAnalysis] = useState<CrossAnalysis[]>([]);

  // Filters
  const [filterGenero, setFilterGenero] = useState<string>('all');
  const [filterRaca, setFilterRaca] = useState<string>('all');
  const [filterRegiao, setFilterRegiao] = useState<string>('all');
  const [filterExperiencia, setFilterExperiencia] = useState<string>('all');

  // Available filter options
  const [availableGeneros, setAvailableGeneros] = useState<string[]>([]);
  const [availableRacas, setAvailableRacas] = useState<string[]>([]);
  const [availableRegioes, setAvailableRegioes] = useState<string[]>([]);
  const [availableExperiencias, setAvailableExperiencias] = useState<string[]>([]);

  // Statistics
  const [totalParticipantes, setTotalParticipantes] = useState(0);
  const [totalAvaliacoes, setTotalAvaliacoes] = useState(0);
  const [taxaDeferimento, setTaxaDeferimento] = useState(0);

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchDemographicData();
    }
  }, [sessionId, filterGenero, filterRaca, filterRegiao, filterExperiencia]);

  // Real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel('demographic-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'avaliacoes',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          // Refresh data when new evaluations are added
          fetchDemographicData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchSessionData = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('nome')
      .eq('id', sessionId)
      .single();

    if (error) {
      toast({
        title: 'Erro ao carregar sessão',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setSessionName(data.nome);
  };

  const fetchDemographicData = async () => {
    setLoading(true);

    try {
      // Build query with filters
      let query = supabase
        .from('avaliacoes')
        .select(`
          resposta,
          profiles!inner(
            genero,
            pertencimento_racial,
            regiao,
            experiencia_bancas
          )
        `)
        .eq('session_id', sessionId);

      if (filterGenero !== 'all') {
        query = query.eq('profiles.genero', filterGenero);
      }
      if (filterRaca !== 'all') {
        query = query.eq('profiles.pertencimento_racial', filterRaca);
      }
      if (filterRegiao !== 'all') {
        query = query.eq('profiles.regiao', filterRegiao);
      }
      if (filterExperiencia !== 'all') {
        query = query.eq('profiles.experiencia_bancas', filterExperiencia);
      }

      const { data: avaliacoes, error } = await query;

      if (error) throw error;

      // Process data
      const generoMap = new Map<string, { deferido: number; indeferido: number; total: number }>();
      const racaMap = new Map<string, { deferido: number; indeferido: number; total: number }>();
      const regiaoMap = new Map<string, { deferido: number; indeferido: number; total: number }>();
      const experienciaMap = new Map<string, { deferido: number; indeferido: number; total: number }>();
      const crossMap = new Map<string, CrossAnalysis>();

      const generosSet = new Set<string>();
      const racasSet = new Set<string>();
      const regioesSet = new Set<string>();
      const experienciasSet = new Set<string>();

      let totalDeferido = 0;
      let totalIndeferido = 0;

      avaliacoes?.forEach((av: any) => {
        const profile = av.profiles;
        if (!profile) return;

        const genero = profile.genero || 'Não informado';
        const raca = profile.pertencimento_racial || 'Não informado';
        const regiao = profile.regiao || 'Não informado';
        const experiencia = profile.experiencia_bancas || 'Não informado';
        const resposta = av.resposta;

        generosSet.add(genero);
        racasSet.add(raca);
        regioesSet.add(regiao);
        experienciasSet.add(experiencia);

        // Update maps
        [generoMap, racaMap, regiaoMap, experienciaMap].forEach((map, idx) => {
          const key = [genero, raca, regiao, experiencia][idx];
          if (!map.has(key)) {
            map.set(key, { deferido: 0, indeferido: 0, total: 0 });
          }
          const data = map.get(key)!;
          data.total++;
          if (resposta === 'DEFERIDO') {
            data.deferido++;
            if (idx === 0) totalDeferido++;
          } else if (resposta === 'INDEFERIDO') {
            data.indeferido++;
            if (idx === 0) totalIndeferido++;
          }
        });

        // Cross analysis
        const key = `${genero}|${raca}|${regiao}|${experiencia}`;
        if (!crossMap.has(key)) {
          crossMap.set(key, {
            genero,
            pertencimentoRacial: raca,
            regiao,
            experienciaBancas: experiencia,
            deferido: 0,
            indeferido: 0,
            total: 0,
            percentDeferido: 0,
          });
        }
        const crossData = crossMap.get(key)!;
        crossData.total++;
        if (resposta === 'DEFERIDO') crossData.deferido++;
        else if (resposta === 'INDEFERIDO') crossData.indeferido++;
      });

      // Convert to arrays
      const toArray = (map: Map<string, any>, category: string): DemographicData[] => {
        return Array.from(map.entries()).map(([value, data]) => ({
          category,
          value,
          ...data,
          percentDeferido: data.total > 0 ? (data.deferido / data.total) * 100 : 0,
          percentIndeferido: data.total > 0 ? (data.indeferido / data.total) * 100 : 0,
        })).sort((a, b) => b.total - a.total);
      };

      const generoArray = toArray(generoMap, 'genero');
      const racaArray = toArray(racaMap, 'raca');
      const regiaoArray = toArray(regiaoMap, 'regiao');
      const experienciaArray = toArray(experienciaMap, 'experiencia');

      setGeneroData(generoArray);
      setRacaData(racaArray);
      setRegiaoData(regiaoArray);
      setExperienciaData(experienciaArray);

      const crossArray: CrossAnalysis[] = Array.from(crossMap.values())
        .map(data => ({
          ...data,
          percentDeferido: data.total > 0 ? (data.deferido / data.total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      setCrossAnalysis(crossArray);

      // Update filter options
      setAvailableGeneros(Array.from(generosSet).sort());
      setAvailableRacas(Array.from(racasSet).sort());
      setAvailableRegioes(Array.from(regioesSet).sort());
      setAvailableExperiencias(Array.from(experienciasSet).sort());

      // Statistics
      const participants = new Set();
      avaliacoes?.forEach((av: any) => {
        if (av.profiles) {
          participants.add(av.profiles.genero + av.profiles.pertencimento_racial);
        }
      });
      
      setTotalParticipantes(participants.size);
      const totalEval = totalDeferido + totalIndeferido;
      setTotalAvaliacoes(totalEval);
      setTaxaDeferimento(totalEval > 0 ? (totalDeferido / totalEval) * 100 : 0);

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

  const clearFilters = () => {
    setFilterGenero('all');
    setFilterRaca('all');
    setFilterRegiao('all');
    setFilterExperiencia('all');
  };

  const hasActiveFilters = filterGenero !== 'all' || filterRaca !== 'all' || filterRegiao !== 'all' || filterExperiencia !== 'all';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground animate-pulse">Carregando dashboard interativo...</p>
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
          <div className="flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/admin/dashboard/${sessionId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Dashboard Demográfico Interativo</h1>
                <p className="text-muted-foreground">{sessionName}</p>
              </div>
            </div>
          </div>

          {/* Real-time indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Atualizando em tempo real
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-scale-in">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Total de Participantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalParticipantes}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  Total de Avaliações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalAvaliacoes}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  Taxa de Deferimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{taxaDeferimento.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Bias Alert System */}
          <BiasAlertSystem sessionId={sessionId!} threshold={15} />

          {/* Same Person Discrepancy Analysis */}
          <SamePersonDiscrepancy sessionId={sessionId!} />

          {/* Pattern Analysis and Bias Identification */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <ResponsePatternAnalysis sessionId={sessionId!} />
            <BiasIdentification sessionId={sessionId!} />
          </div>

          {/* Filters */}
          <Card className="animate-slide-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filtros Demográficos
                  </CardTitle>
                  <CardDescription>
                    Aplique filtros para análise cruzada em tempo real
                  </CardDescription>
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Identidade de Gênero</label>
                  <Select value={filterGenero} onValueChange={setFilterGenero}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableGeneros.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Pertencimento Racial</label>
                  <Select value={filterRaca} onValueChange={setFilterRaca}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableRacas.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Região</label>
                  <Select value={filterRegiao} onValueChange={setFilterRegiao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableRegioes.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Experiência</label>
                  <Select value={filterExperiencia} onValueChange={setFilterExperiencia}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableExperiencias.map(e => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {filterGenero !== 'all' && (
                    <Badge variant="secondary">Gênero: {filterGenero}</Badge>
                  )}
                  {filterRaca !== 'all' && (
                    <Badge variant="secondary">Raça: {filterRaca}</Badge>
                  )}
                  {filterRegiao !== 'all' && (
                    <Badge variant="secondary">Região: {filterRegiao}</Badge>
                  )}
                  {filterExperiencia !== 'all' && (
                    <Badge variant="secondary">Experiência: {filterExperiencia}</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts */}
          <Tabs defaultValue="genero" className="animate-fade-in">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="genero">Gênero</TabsTrigger>
              <TabsTrigger value="raca">Raça</TabsTrigger>
              <TabsTrigger value="regiao">Região</TabsTrigger>
              <TabsTrigger value="experiencia">Experiência</TabsTrigger>
            </TabsList>

            {/* Gênero Tab */}
            <TabsContent value="genero" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle>Distribuição por Gênero</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={generoData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="value" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="deferido" fill="#10b981" name="Deferido" animationDuration={1000} />
                        <Bar dataKey="indeferido" fill="#ef4444" name="Indeferido" animationDuration={1000} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle>Proporção de Deferimento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={generoData}
                          dataKey="total"
                          nameKey="value"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                          animationDuration={1000}
                        >
                          {generoData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Data Table */}
              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <CardTitle>Detalhamento por Gênero</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Categoria</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">Deferido</th>
                          <th className="text-right p-2">Indeferido</th>
                          <th className="text-right p-2">% Deferido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generoData.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50 transition-colors animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                            <td className="p-2">{item.value}</td>
                            <td className="text-right p-2">{item.total}</td>
                            <td className="text-right p-2 text-success font-semibold">{item.deferido}</td>
                            <td className="text-right p-2 text-destructive font-semibold">{item.indeferido}</td>
                            <td className="text-right p-2">
                              <Badge variant={item.percentDeferido > 50 ? "default" : "secondary"}>
                                {item.percentDeferido.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Raça Tab */}
            <TabsContent value="raca" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle>Distribuição por Raça</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={racaData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="value" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="deferido" fill="#10b981" name="Deferido" animationDuration={1000} />
                        <Bar dataKey="indeferido" fill="#ef4444" name="Indeferido" animationDuration={1000} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle>Taxa de Deferimento por Raça</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={racaData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="value" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="percentDeferido" stroke="#10b981" strokeWidth={2} name="% Deferido" animationDuration={1000} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <CardTitle>Detalhamento por Raça</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Categoria</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">Deferido</th>
                          <th className="text-right p-2">Indeferido</th>
                          <th className="text-right p-2">% Deferido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {racaData.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50 transition-colors animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                            <td className="p-2">{item.value}</td>
                            <td className="text-right p-2">{item.total}</td>
                            <td className="text-right p-2 text-success font-semibold">{item.deferido}</td>
                            <td className="text-right p-2 text-destructive font-semibold">{item.indeferido}</td>
                            <td className="text-right p-2">
                              <Badge variant={item.percentDeferido > 50 ? "default" : "secondary"}>
                                {item.percentDeferido.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Região Tab */}
            <TabsContent value="regiao" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle>Distribuição por Região</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={regiaoData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="value" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="deferido" fill="#10b981" name="Deferido" animationDuration={1000} />
                        <Bar dataKey="indeferido" fill="#ef4444" name="Indeferido" animationDuration={1000} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle>Proporção por Região</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={regiaoData}
                          dataKey="total"
                          nameKey="value"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                          animationDuration={1000}
                        >
                          {regiaoData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <CardTitle>Detalhamento por Região</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Categoria</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">Deferido</th>
                          <th className="text-right p-2">Indeferido</th>
                          <th className="text-right p-2">% Deferido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regiaoData.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50 transition-colors animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                            <td className="p-2">{item.value}</td>
                            <td className="text-right p-2">{item.total}</td>
                            <td className="text-right p-2 text-success font-semibold">{item.deferido}</td>
                            <td className="text-right p-2 text-destructive font-semibold">{item.indeferido}</td>
                            <td className="text-right p-2">
                              <Badge variant={item.percentDeferido > 50 ? "default" : "secondary"}>
                                {item.percentDeferido.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Experiência Tab */}
            <TabsContent value="experiencia" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle>Distribuição por Experiência</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={experienciaData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="value" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="deferido" fill="#10b981" name="Deferido" animationDuration={1000} />
                        <Bar dataKey="indeferido" fill="#ef4444" name="Indeferido" animationDuration={1000} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle>Comparação de Taxas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={experienciaData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="value" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="percentDeferido" stroke="#10b981" strokeWidth={2} name="% Deferido" animationDuration={1000} />
                        <Line type="monotone" dataKey="percentIndeferido" stroke="#ef4444" strokeWidth={2} name="% Indeferido" animationDuration={1000} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <CardTitle>Detalhamento por Experiência</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Categoria</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">Deferido</th>
                          <th className="text-right p-2">Indeferido</th>
                          <th className="text-right p-2">% Deferido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {experienciaData.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50 transition-colors animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                            <td className="p-2">{item.value}</td>
                            <td className="text-right p-2">{item.total}</td>
                            <td className="text-right p-2 text-success font-semibold">{item.deferido}</td>
                            <td className="text-right p-2 text-destructive font-semibold">{item.indeferido}</td>
                            <td className="text-right p-2">
                              <Badge variant={item.percentDeferido > 50 ? "default" : "secondary"}>
                                {item.percentDeferido.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AdminDemographicDashboard;
