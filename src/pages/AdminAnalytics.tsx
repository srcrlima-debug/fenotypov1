import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Users, 
  Filter,
  Download,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';

interface SessionData {
  id: string;
  nome: string;
  data: string;
}

interface DemographicStats {
  category: string;
  value: string;
  deferido: number;
  indeferido: number;
  naoRespondido: number;
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

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

const AdminAnalytics = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Demographic statistics
  const [generoStats, setGeneroStats] = useState<DemographicStats[]>([]);
  const [racaStats, setRacaStats] = useState<DemographicStats[]>([]);
  const [regiaoStats, setRegiaoStats] = useState<DemographicStats[]>([]);
  const [experienciaStats, setExperienciaStats] = useState<DemographicStats[]>([]);
  
  // Cross analysis
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

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
      fetchDemographicData();
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchDemographicData();
    }
  }, [filterGenero, filterRaca, filterRegiao, filterExperiencia]);

  const fetchSessionData = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, nome, data')
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

    setSession(data);
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

      // Process demographic statistics
      const generoMap = new Map<string, { deferido: number; indeferido: number; naoRespondido: number; total: number }>();
      const racaMap = new Map<string, { deferido: number; indeferido: number; naoRespondido: number; total: number }>();
      const regiaoMap = new Map<string, { deferido: number; indeferido: number; naoRespondido: number; total: number }>();
      const experienciaMap = new Map<string, { deferido: number; indeferido: number; naoRespondido: number; total: number }>();
      
      const crossMap = new Map<string, CrossAnalysis>();

      // Collect unique values for filters
      const generosSet = new Set<string>();
      const racasSet = new Set<string>();
      const regioesSet = new Set<string>();
      const experienciasSet = new Set<string>();

      avaliacoes?.forEach((av: any) => {
        const profile = av.profiles;
        if (!profile) return;

        const genero = profile.genero || 'Não informado';
        const raca = profile.pertencimento_racial || 'Não informado';
        const regiao = profile.regiao || 'Não informado';
        const experiencia = profile.experiencia_bancas || 'Não informado';
        const resposta = av.resposta;

        // Add to filter options
        generosSet.add(genero);
        racasSet.add(raca);
        regioesSet.add(regiao);
        experienciasSet.add(experiencia);

        // Update genero stats
        if (!generoMap.has(genero)) {
          generoMap.set(genero, { deferido: 0, indeferido: 0, naoRespondido: 0, total: 0 });
        }
        const generoData = generoMap.get(genero)!;
        generoData.total++;
        if (resposta === 'DEFERIDO') generoData.deferido++;
        else if (resposta === 'INDEFERIDO') generoData.indeferido++;
        else generoData.naoRespondido++;

        // Update raca stats
        if (!racaMap.has(raca)) {
          racaMap.set(raca, { deferido: 0, indeferido: 0, naoRespondido: 0, total: 0 });
        }
        const racaData = racaMap.get(raca)!;
        racaData.total++;
        if (resposta === 'DEFERIDO') racaData.deferido++;
        else if (resposta === 'INDEFERIDO') racaData.indeferido++;
        else racaData.naoRespondido++;

        // Update regiao stats
        if (!regiaoMap.has(regiao)) {
          regiaoMap.set(regiao, { deferido: 0, indeferido: 0, naoRespondido: 0, total: 0 });
        }
        const regiaoData = regiaoMap.get(regiao)!;
        regiaoData.total++;
        if (resposta === 'DEFERIDO') regiaoData.deferido++;
        else if (resposta === 'INDEFERIDO') regiaoData.indeferido++;
        else regiaoData.naoRespondido++;

        // Update experiencia stats
        if (!experienciaMap.has(experiencia)) {
          experienciaMap.set(experiencia, { deferido: 0, indeferido: 0, naoRespondido: 0, total: 0 });
        }
        const experienciaData = experienciaMap.get(experiencia)!;
        experienciaData.total++;
        if (resposta === 'DEFERIDO') experienciaData.deferido++;
        else if (resposta === 'INDEFERIDO') experienciaData.indeferido++;
        else experienciaData.naoRespondido++;

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

      // Convert maps to arrays with percentages
      const generoArray: DemographicStats[] = Array.from(generoMap.entries()).map(([value, data]) => ({
        category: 'genero',
        value,
        ...data,
        percentDeferido: data.total > 0 ? (data.deferido / data.total) * 100 : 0,
        percentIndeferido: data.total > 0 ? (data.indeferido / data.total) * 100 : 0,
      })).sort((a, b) => b.total - a.total);

      const racaArray: DemographicStats[] = Array.from(racaMap.entries()).map(([value, data]) => ({
        category: 'raca',
        value,
        ...data,
        percentDeferido: data.total > 0 ? (data.deferido / data.total) * 100 : 0,
        percentIndeferido: data.total > 0 ? (data.indeferido / data.total) * 100 : 0,
      })).sort((a, b) => b.total - a.total);

      const regiaoArray: DemographicStats[] = Array.from(regiaoMap.entries()).map(([value, data]) => ({
        category: 'regiao',
        value,
        ...data,
        percentDeferido: data.total > 0 ? (data.deferido / data.total) * 100 : 0,
        percentIndeferido: data.total > 0 ? (data.indeferido / data.total) * 100 : 0,
      })).sort((a, b) => b.total - a.total);

      const experienciaArray: DemographicStats[] = Array.from(experienciaMap.entries()).map(([value, data]) => ({
        category: 'experiencia',
        value,
        ...data,
        percentDeferido: data.total > 0 ? (data.deferido / data.total) * 100 : 0,
        percentIndeferido: data.total > 0 ? (data.indeferido / data.total) * 100 : 0,
      })).sort((a, b) => b.total - a.total);

      const crossArray: CrossAnalysis[] = Array.from(crossMap.values())
        .map(data => ({
          ...data,
          percentDeferido: data.total > 0 ? (data.deferido / data.total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      setGeneroStats(generoArray);
      setRacaStats(racaArray);
      setRegiaoStats(regiaoArray);
      setExperienciaStats(experienciaArray);
      setCrossAnalysis(crossArray);

      // Update filter options
      setAvailableGeneros(Array.from(generosSet).sort());
      setAvailableRacas(Array.from(racasSet).sort());
      setAvailableRegioes(Array.from(regioesSet).sort());
      setAvailableExperiencias(Array.from(experienciasSet).sort());

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

  const handleExportCSV = () => {
    const csvData = crossAnalysis.map(item => ({
      'Identidade de Gênero': item.genero,
      'Pertencimento Racial': item.pertencimentoRacial,
      'Região': item.regiao,
      'Experiência': item.experienciaBancas,
      'Total Avaliações': item.total,
      'Deferido': item.deferido,
      'Indeferido': item.indeferido,
      '% Deferido': item.percentDeferido.toFixed(1),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analise-demografica-${session?.nome || 'sessao'}.csv`;
    link.click();

    toast({
      title: 'Exportação concluída',
      description: 'Dados demográficos exportados com sucesso',
    });
  };

  const clearFilters = () => {
    setFilterGenero('all');
    setFilterRaca('all');
    setFilterRegiao('all');
    setFilterExperiencia('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando análises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/admin/dashboard/${sessionId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Análise Demográfica</h1>
              <p className="text-muted-foreground">{session?.nome}</p>
            </div>
          </div>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Filtre as análises por características demográficas
            </CardDescription>
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
            
            {(filterGenero !== 'all' || filterRaca !== 'all' || filterRegiao !== 'all' || filterExperiencia !== 'all') && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demographic Analysis Tabs */}
        <Tabs defaultValue="genero" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="genero">
              <Users className="w-4 h-4 mr-2" />
              Identidade de Gênero
            </TabsTrigger>
            <TabsTrigger value="raca">
              <BarChart3 className="w-4 h-4 mr-2" />
              Pertencimento Racial
            </TabsTrigger>
            <TabsTrigger value="regiao">
              <TrendingUp className="w-4 h-4 mr-2" />
              Região
            </TabsTrigger>
            <TabsTrigger value="experiencia">
              <PieChartIcon className="w-4 h-4 mr-2" />
              Experiência
            </TabsTrigger>
          </TabsList>

          {/* Gênero Tab */}
          <TabsContent value="genero" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Identidade de Gênero</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={generoStats}
                        dataKey="total"
                        nameKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.value}: ${entry.total}`}
                      >
                        {generoStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Deferimento por Gênero</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={generoStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="value" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="percentDeferido" fill="#10b981" name="% Deferido" />
                      <Bar dataKey="percentIndeferido" fill="#ef4444" name="% Indeferido" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Raça Tab */}
          <TabsContent value="raca" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Pertencimento Racial</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={racaStats}
                        dataKey="total"
                        nameKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.value}: ${entry.total}`}
                      >
                        {racaStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Deferimento por Raça</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={racaStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="value" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="percentDeferido" fill="#10b981" name="% Deferido" />
                      <Bar dataKey="percentIndeferido" fill="#ef4444" name="% Indeferido" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Região Tab */}
          <TabsContent value="regiao" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Região</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={regiaoStats}
                        dataKey="total"
                        nameKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.value}: ${entry.total}`}
                      >
                        {regiaoStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Deferimento por Região</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={regiaoStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="value" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="percentDeferido" fill="#10b981" name="% Deferido" />
                      <Bar dataKey="percentIndeferido" fill="#ef4444" name="% Indeferido" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Experiência Tab */}
          <TabsContent value="experiencia" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Experiência</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={experienciaStats}
                        dataKey="total"
                        nameKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.value}: ${entry.total}`}
                      >
                        {experienciaStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Deferimento por Experiência</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={experienciaStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="value" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="percentDeferido" fill="#10b981" name="% Deferido" />
                      <Bar dataKey="percentIndeferido" fill="#ef4444" name="% Indeferido" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Cross Analysis Table */}
        <Card>
          <CardHeader>
            <CardTitle>Análise Cruzada Detalhada</CardTitle>
            <CardDescription>
              Resultados segmentados por todas as variáveis demográficas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Identidade de Gênero</th>
                    <th className="text-left p-2">Pertencimento Racial</th>
                    <th className="text-left p-2">Região</th>
                    <th className="text-left p-2">Experiência</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">Deferido</th>
                    <th className="text-right p-2">Indeferido</th>
                    <th className="text-right p-2">% Deferido</th>
                  </tr>
                </thead>
                <tbody>
                  {crossAnalysis.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2">{item.genero}</td>
                      <td className="p-2">{item.pertencimentoRacial}</td>
                      <td className="p-2">{item.regiao}</td>
                      <td className="p-2 text-xs">{item.experienciaBancas}</td>
                      <td className="text-right p-2 font-medium">{item.total}</td>
                      <td className="text-right p-2 text-green-600">{item.deferido}</td>
                      <td className="text-right p-2 text-red-600">{item.indeferido}</td>
                      <td className="text-right p-2 font-medium">{item.percentDeferido.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
