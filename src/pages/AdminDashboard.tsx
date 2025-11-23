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
  CircleCheck, 
  Clock, 
  TrendingUp,
  Filter,
  Image as ImageIcon,
  Award,
  CircleX,
  Timer,
  Target,
  Download,
  FileText,
  TriangleAlert
} from 'lucide-react';
import jsPDF from 'jspdf';
import Papa from 'papaparse';
import { Header } from '@/components/Header';
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
import { ImageZoomDialog, ImageThumbnail } from '@/components/ImageZoomDialog';
import { BiasAlertSystem } from '@/components/BiasAlertSystem';
import { ResponsePatternAnalysis } from '@/components/ResponsePatternAnalysis';
import { BiasIdentification } from '@/components/BiasIdentification';

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

interface ConsensusData {
  fotoId: number;
  consenso: number;
  baixoConsenso: boolean;
  viesPorGenero?: { [key: string]: number };
  viesPorFaixaEtaria?: { [key: string]: number };
  viesPorRegiao?: { [key: string]: number };
}

interface TemporalData {
  sequencia: number;
  tempoMedio: number;
  respostasDeferidas: number;
  respostasIndeferidas: number;
}

interface CrossAnalysisData {
  genero: string;
  faixaEtaria: string;
  regiao: string;
  totalDeferido: number;
  totalIndeferido: number;
  total: number;
  percentDeferido: number;
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
  const [consensusData, setConsensusData] = useState<ConsensusData[]>([]);
  const [temporalData, setTemporalData] = useState<TemporalData[]>([]);
  const [crossAnalysis, setCrossAnalysis] = useState<CrossAnalysisData[]>([]);
  const [rawEvaluations, setRawEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [demographicFilters, setDemographicFilters] = useState({
    genero: 'all',
    raca: 'all',
    regiao: 'all',
    experiencia: 'all',
  });
  const [availableFilters, setAvailableFilters] = useState({
    generos: [] as string[],
    racas: [] as string[],
    regioes: [] as string[],
    experiencias: [] as string[],
  });
  const [zoomImage, setZoomImage] = useState<{ url: string; alt: string } | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchDashboardData();
    }
  }, [sessionId, demographicFilters]);

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

      // Build query with demographic filters - join with profiles
      let query = supabase
        .from('avaliacoes')
        .select(`
          *,
          profiles!inner(
            genero,
            faixa_etaria,
            regiao,
            pertencimento_racial,
            experiencia_bancas
          )
        `)
        .eq('session_id', sessionId);

      // Apply demographic filters
      if (demographicFilters.genero !== 'all') {
        query = query.eq('profiles.genero', demographicFilters.genero);
      }
      if (demographicFilters.raca !== 'all') {
        query = query.eq('profiles.pertencimento_racial', demographicFilters.raca);
      }
      if (demographicFilters.regiao !== 'all') {
        query = query.eq('profiles.regiao', demographicFilters.regiao);
      }
      if (demographicFilters.experiencia !== 'all') {
        query = query.eq('profiles.experiencia_bancas', demographicFilters.experiencia);
      }

      const { data: evaluations, error: evalError } = await query;

      if (evalError) throw evalError;

      // Collect available filter options
      const generosSet = new Set<string>();
      const racasSet = new Set<string>();
      const regioesSet = new Set<string>();
      const experienciasSet = new Set<string>();

      evaluations?.forEach((ev: any) => {
        if (ev.profiles) {
          if (ev.profiles.genero) generosSet.add(ev.profiles.genero);
          if (ev.profiles.pertencimento_racial) racasSet.add(ev.profiles.pertencimento_racial);
          if (ev.profiles.regiao) regioesSet.add(ev.profiles.regiao);
          if (ev.profiles.experiencia_bancas) experienciasSet.add(ev.profiles.experiencia_bancas);
        }
      });

      setAvailableFilters({
        generos: Array.from(generosSet).sort(),
        racas: Array.from(racasSet).sort(),
        regioes: Array.from(regioesSet).sort(),
        experiencias: Array.from(experienciasSet).sort(),
      });

      // Calculate general stats
      const uniqueUsers = new Set(evaluations?.map(e => e.user_id)).size;
      const totalEvals = evaluations?.length || 0;
      const expectedEvals = uniqueUsers * 30; // 30 photos per user
      const completionRate = expectedEvals > 0 ? (totalEvals / expectedEvals) * 100 : 0;
      const avgTime = evaluations?.reduce((sum, e) => sum + (e.tempo_gasto || 0), 0) / totalEvals || 0;

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

        photoStatsMap[fotoId].totalTime += (evaluation.tempo_gasto || 0);
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

      evaluations?.forEach((evaluation: any) => {
        const profile = evaluation.profiles;
        if (!profile) return;

        const { genero, faixa_etaria, regiao, resposta } = { ...evaluation, ...profile };

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

      // Store raw evaluations for export
      setRawEvaluations(evaluations || []);

      // Calculate Consensus Analysis with demographic bias
      const consensusArray: ConsensusData[] = [];
      for (let i = 1; i <= 30; i++) {
        const photoEvals = evaluations?.filter(e => e.foto_id === i) || [];
        const total = photoEvals.length;
        
        if (total === 0) continue;

        const deferidos = photoEvals.filter(e => e.resposta === 'DEFERIDO').length;
        const indeferidos = photoEvals.filter(e => e.resposta === 'INDEFERIDO').length;
        const maxVotes = Math.max(deferidos, indeferidos);
        const consensoPercent = (maxVotes / total) * 100;

        // Calculate bias by demographic
        const viesPorGenero: { [key: string]: number } = {};
        const viesPorFaixaEtaria: { [key: string]: number } = {};
        const viesPorRegiao: { [key: string]: number } = {};

        photoEvals.forEach(e => {
          if (e.genero) {
            if (!viesPorGenero[e.genero]) viesPorGenero[e.genero] = 0;
            if (e.resposta === 'DEFERIDO') viesPorGenero[e.genero]++;
          }
          if (e.faixa_etaria) {
            if (!viesPorFaixaEtaria[e.faixa_etaria]) viesPorFaixaEtaria[e.faixa_etaria] = 0;
            if (e.resposta === 'DEFERIDO') viesPorFaixaEtaria[e.faixa_etaria]++;
          }
          if (e.regiao) {
            if (!viesPorRegiao[e.regiao]) viesPorRegiao[e.regiao] = 0;
            if (e.resposta === 'DEFERIDO') viesPorRegiao[e.regiao]++;
          }
        });

        // Convert to percentages
        Object.keys(viesPorGenero).forEach(key => {
          const totalForGroup = photoEvals.filter(e => e.genero === key).length;
          viesPorGenero[key] = (viesPorGenero[key] / totalForGroup) * 100;
        });

        consensusArray.push({
          fotoId: i,
          consenso: consensoPercent,
          baixoConsenso: consensoPercent < 70,
          viesPorGenero,
          viesPorFaixaEtaria,
          viesPorRegiao,
        });
      }
      setConsensusData(consensusArray);

      // Calculate Temporal Analysis (evaluator fatigue)
      const sortedEvals = [...(evaluations || [])].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const temporalMap: { [key: number]: { tempos: number[]; deferidos: number; indeferidos: number } } = {};
      sortedEvals.forEach((evaluation, index) => {
        const sequencia = Math.floor(index / 100); // Group by 100 evaluations
        if (!temporalMap[sequencia]) {
          temporalMap[sequencia] = { tempos: [], deferidos: 0, indeferidos: 0 };
        }
        temporalMap[sequencia].tempos.push(evaluation.tempo_gasto);
        if (evaluation.resposta === 'DEFERIDO') temporalMap[sequencia].deferidos++;
        else if (evaluation.resposta === 'INDEFERIDO') temporalMap[sequencia].indeferidos++;
      });

      const temporalArray: TemporalData[] = Object.entries(temporalMap).map(([seq, data]) => ({
        sequencia: parseInt(seq),
        tempoMedio: data.tempos.reduce((a, b) => a + b, 0) / data.tempos.length,
        respostasDeferidas: data.deferidos,
        respostasIndeferidas: data.indeferidos,
      }));
      setTemporalData(temporalArray);

      // Calculate Cross Analysis (Gênero x Idade x Região)
      const crossMap: { [key: string]: CrossAnalysisData } = {};
      evaluations?.forEach(evaluation => {
        const key = `${evaluation.genero || 'N/A'}_${evaluation.faixa_etaria || 'N/A'}_${evaluation.regiao || 'N/A'}`;
        if (!crossMap[key]) {
          crossMap[key] = {
            genero: evaluation.genero || 'N/A',
            faixaEtaria: evaluation.faixa_etaria || 'N/A',
            regiao: evaluation.regiao || 'N/A',
            totalDeferido: 0,
            totalIndeferido: 0,
            total: 0,
            percentDeferido: 0,
          };
        }
        crossMap[key].total++;
        if (evaluation.resposta === 'DEFERIDO') crossMap[key].totalDeferido++;
        else if (evaluation.resposta === 'INDEFERIDO') crossMap[key].totalIndeferido++;
      });

      const crossArray = Object.values(crossMap).map(item => ({
        ...item,
        percentDeferido: item.total > 0 ? (item.totalDeferido / item.total) * 100 : 0,
      }));
      setCrossAnalysis(crossArray.sort((a, b) => b.total - a.total));

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

  const exportToCSV = () => {
    const csv = Papa.unparse(rawEvaluations);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `avaliacao_${session?.nome}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({
      title: 'Exportado com sucesso',
      description: 'Dados exportados para CSV',
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(`Relatório: ${session?.nome}`, 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
    
    // Stats
    doc.setFontSize(14);
    doc.text('Estatísticas Gerais', 20, 45);
    doc.setFontSize(10);
    doc.text(`Total de Participantes: ${stats?.totalParticipants}`, 20, 55);
    doc.text(`Avaliações Concluídas: ${stats?.totalEvaluations}`, 20, 62);
    doc.text(`Taxa de Conclusão: ${stats?.completionRate.toFixed(1)}%`, 20, 69);
    doc.text(`Tempo Médio: ${formatTime(stats?.averageTime || 0)}`, 20, 76);
    
    // KPIs
    doc.setFontSize(14);
    doc.text('Principais Indicadores', 20, 91);
    doc.setFontSize(10);
    doc.text(`Foto Mais Deferida: #${kpis?.mostDeferida.fotoId} (${kpis?.mostDeferida.percent.toFixed(1)}%)`, 20, 101);
    doc.text(`Foto Mais Indeferida: #${kpis?.mostIndeferida.fotoId} (${kpis?.mostIndeferida.percent.toFixed(1)}%)`, 20, 108);
    doc.text(`Maior Tempo Médio: #${kpis?.longestTime.fotoId} (${formatTime(kpis?.longestTime.time || 0)})`, 20, 115);
    doc.text(`Consenso Geral: ${kpis?.consenso.toFixed(1)}%`, 20, 122);
    
    // Low consensus photos
    doc.setFontSize(14);
    doc.text('Fotos com Baixo Consenso (<70%)', 20, 137);
    doc.setFontSize(10);
    const lowConsensus = consensusData.filter(c => c.baixoConsenso);
    lowConsensus.slice(0, 10).forEach((item, idx) => {
      doc.text(`Foto #${item.fotoId}: ${item.consenso.toFixed(1)}% de consenso`, 20, 147 + (idx * 7));
    });
    
    doc.save(`relatorio_${session?.nome}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: 'Relatório gerado',
      description: 'PDF baixado com sucesso',
    });
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
    <>
      <Header />
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
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => navigate(`/admin/analytics/${sessionId}`)}
            >
              <Users className="h-4 w-4 mr-2" />
              Análise Demográfica
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/admin/demographic/${sessionId}`)}
              className="group"
            >
              <TrendingUp className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
              Dashboard Interativo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Demográficos
            </CardTitle>
            <CardDescription>Filtre as análises por características demográficas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterGenero">Identidade de Gênero</Label>
                <Select
                  value={demographicFilters.genero}
                  onValueChange={(value) => setDemographicFilters({ ...demographicFilters, genero: value })}
                >
                  <SelectTrigger id="filterGenero">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableFilters.generos.map((genero) => (
                      <SelectItem key={genero} value={genero}>
                        {genero}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterRaca">Pertencimento Racial</Label>
                <Select
                  value={demographicFilters.raca}
                  onValueChange={(value) => setDemographicFilters({ ...demographicFilters, raca: value })}
                >
                  <SelectTrigger id="filterRaca">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableFilters.racas.map((raca) => (
                      <SelectItem key={raca} value={raca}>
                        {raca}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterRegiao">Região</Label>
                <Select
                  value={demographicFilters.regiao}
                  onValueChange={(value) => setDemographicFilters({ ...demographicFilters, regiao: value })}
                >
                  <SelectTrigger id="filterRegiao">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {availableFilters.regioes.map((regiao) => (
                      <SelectItem key={regiao} value={regiao}>
                        {regiao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterExperiencia">Experiência</Label>
                <Select
                  value={demographicFilters.experiencia}
                  onValueChange={(value) => setDemographicFilters({ ...demographicFilters, experiencia: value })}
                >
                  <SelectTrigger id="filterExperiencia">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {availableFilters.experiencias.map((exp) => (
                      <SelectItem key={exp} value={exp}>
                        {exp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => setDemographicFilters({ genero: 'all', raca: 'all', regiao: 'all', experiencia: 'all' })}
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
                <CircleCheck className="h-8 w-8 text-accent" />
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
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Foto Mais Deferida</p>
                  <div className="flex items-center gap-3">
                    {kpis && (
                      <ImageThumbnail 
                        fotoId={kpis.mostDeferida.fotoId}
                        onClick={() => setZoomImage({
                          url: `/images/foto-${kpis.mostDeferida.fotoId}.jpg`,
                          alt: `Foto ${kpis.mostDeferida.fotoId}`
                        })}
                      />
                    )}
                    <div>
                      <p className="text-3xl font-bold text-foreground">#{kpis?.mostDeferida.fotoId}</p>
                      <p className="text-sm text-success">{kpis?.mostDeferida.percent.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
                <Award className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Foto Mais Indeferida</p>
                  <div className="flex items-center gap-3">
                    {kpis && (
                      <ImageThumbnail 
                        fotoId={kpis.mostIndeferida.fotoId}
                        onClick={() => setZoomImage({
                          url: `/images/foto-${kpis.mostIndeferida.fotoId}.jpg`,
                          alt: `Foto ${kpis.mostIndeferida.fotoId}`
                        })}
                      />
                    )}
                    <div>
                      <p className="text-3xl font-bold text-foreground">#{kpis?.mostIndeferida.fotoId}</p>
                      <p className="text-sm text-destructive">{kpis?.mostIndeferida.percent.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
                <CircleX className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Maior Tempo Médio</p>
                  <div className="flex items-center gap-3">
                    {kpis && (
                      <ImageThumbnail 
                        fotoId={kpis.longestTime.fotoId}
                        onClick={() => setZoomImage({
                          url: `/images/foto-${kpis.longestTime.fotoId}.jpg`,
                          alt: `Foto ${kpis.longestTime.fotoId}`
                        })}
                      />
                    )}
                    <div>
                      <p className="text-3xl font-bold text-foreground">#{kpis?.longestTime.fotoId}</p>
                      <p className="text-sm text-primary">{formatTime(kpis?.longestTime.time || 0)}</p>
                    </div>
                  </div>
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

        {/* Bias Alert System */}
        {sessionId && (
          <BiasAlertSystem sessionId={sessionId} threshold={15} />
        )}

        {/* Pattern Analysis and Bias Identification */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sessionId && <ResponsePatternAnalysis sessionId={sessionId} />}
          {sessionId && <BiasIdentification sessionId={sessionId} />}
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
                  deferido: { label: 'Deferido', color: 'hsl(var(--success))' },
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
                  deferido: { label: 'Deferido', color: 'hsl(var(--success))' },
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
                    <Bar dataKey="deferido" fill="hsl(var(--success))" />
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
                  deferido: { label: 'Deferido', color: 'hsl(var(--success))' },
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
                    <Bar dataKey="deferido" fill="hsl(var(--success))" />
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

        {/* Export Buttons */}
        <div className="flex gap-4 justify-end">
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={exportToPDF} variant="default" className="gap-2">
            <FileText className="h-4 w-4" />
            Gerar Relatório PDF
          </Button>
        </div>

        {/* Consensus Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Análise de Consenso
            </CardTitle>
            <CardDescription>
              Fotos com baixo consenso (&lt;70%) e análise de viés demográfico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Foto</TableHead>
                    <TableHead>Consenso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Viés por Gênero</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consensusData
                    .filter(c => c.baixoConsenso)
                    .slice(0, 10)
                    .map((item) => (
                      <TableRow key={item.fotoId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <ImageThumbnail 
                              fotoId={item.fotoId}
                              onClick={() => setZoomImage({
                                url: `/images/foto-${item.fotoId}.jpg`,
                                alt: `Foto ${item.fotoId}`
                              })}
                            />
                            <span>#{item.fotoId}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.consenso.toFixed(1)}%</span>
                            <Progress value={item.consenso} className="w-20" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-destructive">
                            <TriangleAlert className="h-4 w-4" />
                            Baixo Consenso
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            {Object.entries(item.viesPorGenero || {}).map(([genero, percent]) => (
                              <div key={genero}>
                                {genero}: {percent.toFixed(1)}% deferido
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {consensusData.filter(c => c.baixoConsenso).length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Todas as fotos têm consenso satisfatório (&gt;70%)
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Temporal Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Análise Temporal - Fadiga do Avaliador
            </CardTitle>
            <CardDescription>
              Mudança no tempo de resposta ao longo da avaliação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                tempo: { label: 'Tempo Médio (s)', color: 'hsl(var(--primary))' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={temporalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="sequencia" 
                    stroke="hsl(var(--foreground))" 
                    label={{ value: 'Sequência (a cada 100 avaliações)', position: 'insideBottom', offset: -5 }} 
                  />
                  <YAxis stroke="hsl(var(--foreground))" label={{ value: 'Tempo (s)', angle: -90, position: 'insideLeft' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="tempoMedio" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    dot={{ fill: 'hsl(var(--primary))' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {temporalData.length > 1 && temporalData[0].tempoMedio > temporalData[temporalData.length - 1].tempoMedio
                  ? '📉 Observa-se uma tendência de respostas mais rápidas ao longo do tempo, sugerindo possível fadiga ou familiarização com a tarefa.'
                  : '📈 O tempo de resposta se mantém relativamente estável ao longo da avaliação.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cross Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Comparação entre Perfis Demográficos
            </CardTitle>
            <CardDescription>
              Cruzamento: Gênero x Faixa Etária x Região
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gênero</TableHead>
                    <TableHead>Faixa Etária</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead>Total Avaliações</TableHead>
                    <TableHead>Deferidos</TableHead>
                    <TableHead>Indeferidos</TableHead>
                    <TableHead>% Deferido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crossAnalysis.slice(0, 20).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.genero}</TableCell>
                      <TableCell>{item.faixaEtaria}</TableCell>
                      <TableCell>{item.regiao}</TableCell>
                      <TableCell className="font-semibold">{item.total}</TableCell>
                      <TableCell className="text-success">{item.totalDeferido}</TableCell>
                      <TableCell className="text-destructive">{item.totalIndeferido}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.percentDeferido.toFixed(1)}%</span>
                          <Progress value={item.percentDeferido} className="w-16" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {crossAnalysis.length > 20 && (
              <p className="text-sm text-muted-foreground mt-4">
                Mostrando top 20 combinações de {crossAnalysis.length} total
              </p>
            )}
          </CardContent>
        </Card>

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
                        <div className="flex items-center gap-3">
                          <ImageThumbnail 
                            fotoId={photo.fotoId}
                            onClick={() => setZoomImage({
                              url: `/images/foto-${photo.fotoId}.jpg`,
                              alt: `Foto ${photo.fotoId}`
                            })}
                          />
                          <span>#{photo.fotoId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-success font-semibold">{photo.totalDeferido}</span>
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
                              className="h-2 bg-success rounded-l"
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
      
      <ImageZoomDialog
        imageUrl={zoomImage?.url || ''}
        altText={zoomImage?.alt || ''}
        isOpen={!!zoomImage}
        onOpenChange={(open) => !open && setZoomImage(null)}
      />
    </div>
    </>
  );
};

export default AdminDashboard;
