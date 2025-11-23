import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

export default function AdminTrainingParticipants() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const [training, setTraining] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [trainingId]);

  const loadData = async () => {
    try {
      const [trainingRes, participantsRes] = await Promise.all([
        supabase.from('trainings').select('*').eq('id', trainingId).single(),
        supabase
          .from('training_participants')
          .select('*')
          .eq('training_id', trainingId)
          .order('created_at', { ascending: false })
      ]);

      if (trainingRes.error) throw trainingRes.error;
      if (participantsRes.error) throw participantsRes.error;

      setTraining(trainingRes.data);
      setParticipants(participantsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvData = participants.map(p => ({
      Email: p.email,
      Gênero: p.genero,
      'Faixa Etária': p.faixa_etaria,
      Estado: p.estado,
      Região: p.regiao,
      'Pertencimento Racial': p.pertencimento_racial || '',
      'Experiência em Bancas': p.experiencia_bancas || '',
      'Data de Cadastro': new Date(p.created_at).toLocaleString('pt-BR')
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `participantes_${training?.nome}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exportado com sucesso!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/trainings')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Participantes - {training?.nome}</h1>
            <p className="text-muted-foreground">
              {new Date(training?.data).toLocaleDateString('pt-BR')} • {participants.length} participantes
            </p>
          </div>
        </div>
        <Button onClick={exportToCSV} disabled={participants.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Participantes</CardTitle>
          <CardDescription>Todos os participantes cadastrados neste treinamento</CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum participante cadastrado ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Gênero</TableHead>
                  <TableHead>Faixa Etária</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Região</TableHead>
                  <TableHead>Raça</TableHead>
                  <TableHead>Experiência</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">{participant.email}</TableCell>
                    <TableCell>{participant.genero}</TableCell>
                    <TableCell>{participant.faixa_etaria}</TableCell>
                    <TableCell><Badge variant="outline">{participant.estado}</Badge></TableCell>
                    <TableCell>{participant.regiao}</TableCell>
                    <TableCell>{participant.pertencimento_racial || '-'}</TableCell>
                    <TableCell className="text-sm">{participant.experiencia_bancas || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(participant.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
