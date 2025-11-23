import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import jsPDF from 'jspdf';

export default function AdminTrainingComparator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const trainingIds = searchParams.get('ids')?.split(',') || [];

  useEffect(() => {
    if (trainingIds.length < 2) {
      toast.error('Selecione pelo menos 2 treinamentos');
      navigate('/admin/trainings');
      return;
    }
    loadComparisonData();
  }, [trainingIds]);

  const loadComparisonData = async () => {
    try {
      // Load trainings info
      const { data: trainingsData, error: trainingsError } = await supabase
        .from('trainings')
        .select('*')
        .in('id', trainingIds);

      if (trainingsError) throw trainingsError;
      setTrainings(trainingsData || []);

      // Load comparison data for each training
      const compData: any = {};

      for (const trainingId of trainingIds) {
        const training = trainingsData?.find(t => t.id === trainingId);
        
        // Get participants count
        const { count: participantsCount } = await supabase
          .from('training_participants')
          .select('*', { count: 'exact', head: true })
          .eq('training_id', trainingId);

        // Get evaluations count
        const { count: evaluationsCount } = await supabase
          .from('avaliacoes')
          .select('*', { count: 'exact', head: true })
          .eq('training_id', trainingId);

        // Get average response time
        const { data: avgTimeData } = await supabase
          .from('avaliacoes')
          .select('tempo_gasto')
          .eq('training_id', trainingId);

        const avgTime = avgTimeData?.length
          ? avgTimeData.reduce((sum, r) => sum + r.tempo_gasto, 0) / avgTimeData.length
          : 0;

        // Get demographic distribution
        const { data: demographicData } = await supabase
          .from('training_participants')
          .select('genero, faixa_etaria, regiao')
          .eq('training_id', trainingId);

        // Get discrepancy rate for photos 1 and 14
        const { data: photo1 } = await supabase
          .from('avaliacoes')
          .select('user_id, resposta')
          .eq('training_id', trainingId)
          .eq('foto_id', 1);

        const { data: photo14 } = await supabase
          .from('avaliacoes')
          .select('user_id, resposta')
          .eq('training_id', trainingId)
          .eq('foto_id', 14);

        const discrepancies = photo1?.filter(p1 => {
          const p14 = photo14?.find(p => p.user_id === p1.user_id);
          return p14 && p1.resposta !== p14.resposta;
        }).length || 0;

        const discrepancyRate = photo1?.length ? (discrepancies / photo1.length) * 100 : 0;

        compData[trainingId] = {
          nome: training?.nome,
          participantsCount: participantsCount || 0,
          evaluationsCount: evaluationsCount || 0,
          avgTime: parseFloat(avgTime.toFixed(2)),
          demographic: demographicData || [],
          discrepancyRate: parseFloat(discrepancyRate.toFixed(2))
        };
      }

      setComparisonData(compData);
    } catch (error) {
      console.error('Error loading comparison data:', error);
      toast.error('Erro ao carregar dados de comparação');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!comparisonData) return;

    const csvData = Object.entries(comparisonData).map(([id, data]: any) => ({
      Treinamento: data.nome,
      Participantes: data.participantsCount,
      Avaliações: data.evaluationsCount,
      'Tempo Médio (s)': data.avgTime,
      'Taxa de Discrepância (%)': data.discrepancyRate
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comparacao_treinamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exportado com sucesso!');
  };

  const exportToPDF = () => {
    if (!comparisonData) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Comparação de Treinamentos', 14, 22);
    doc.setFontSize(11);
    
    let y = 35;
    Object.entries(comparisonData).forEach(([id, data]: any) => {
      doc.text(`${data.nome}:`, 14, y);
      doc.text(`  Participantes: ${data.participantsCount}`, 14, y + 7);
      doc.text(`  Avaliações: ${data.evaluationsCount}`, 14, y + 14);
      doc.text(`  Tempo Médio: ${data.avgTime}s`, 14, y + 21);
      doc.text(`  Taxa de Discrepância: ${data.discrepancyRate}%`, 14, y + 28);
      y += 40;
    });

    doc.save(`comparacao_treinamentos_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando comparação...</p>
        </div>
      </div>
    );
  }

  const chartData = Object.entries(comparisonData || {}).map(([id, data]: any) => ({
    nome: data.nome,
    participantes: data.participantsCount,
    avaliacoes: data.evaluationsCount,
    tempoMedio: data.avgTime,
    discrepancia: data.discrepancyRate
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/trainings')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Comparação de Treinamentos</h1>
            <p className="text-muted-foreground">{trainings.length} treinamentos selecionados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Participantes</CardTitle>
            <CardDescription>Número total de participantes por treinamento</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="participantes" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avaliações Realizadas</CardTitle>
            <CardDescription>Total de avaliações por treinamento</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avaliacoes" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo Médio de Resposta</CardTitle>
            <CardDescription>Tempo médio em segundos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tempoMedio" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de Discrepância (Fotos 1 e 14)</CardTitle>
            <CardDescription>Percentual de inconsistência</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="discrepancia" fill="#ff8042" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo Estatístico</CardTitle>
          <CardDescription>Comparação detalhada dos indicadores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(comparisonData || {}).map(([id, data]: any) => (
              <div key={id} className="border-b pb-4 last:border-0">
                <h3 className="font-bold text-lg mb-2">{data.nome}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Participantes</p>
                    <p className="text-2xl font-bold">{data.participantsCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avaliações</p>
                    <p className="text-2xl font-bold">{data.evaluationsCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tempo Médio</p>
                    <p className="text-2xl font-bold">{data.avgTime}s</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Discrepância</p>
                    <p className="text-2xl font-bold">{data.discrepancyRate}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
